// supabase/functions/create-rental/index.ts
// Публичная точка приёма заявок на аренду (без токена — доступна всем
// посетителям сайта). Проверяет антиспам по IP, проверяет что машина
// не занята другой активной арендой, и сама считает итоговую цену по
// датам и тарифам машины (vehicle_price_tiers) — цене из браузера не
// доверяет.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Минимальный промежуток между заявками с одного IP.
const RATE_LIMIT_MINUTES = 10
const MS_IN_DAY = 24 * 60 * 60 * 1000

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const TG_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")

// Данные приходят от посетителей сайта, поэтому экранируем HTML,
// иначе в сообщении можно подсунуть чужую разметку.
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function fmtDate(d: Date) {
  const [y, m, day] = d.toISOString().slice(0, 10).split("-")
  return `${day}.${m}.${y}`
}

// Ошибка Telegram не должна ломать бронь: заявка уже сохранена.
async function notifyTelegram(text: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) return
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) console.error("Telegram error:", res.status, await res.text())
  } catch (e) {
    console.error("Telegram fetch failed:", e)
  }
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Подбирает цену за сутки по количеству суток аренды среди тарифов
// машины. Если тарифов нет, или ни один диапазон не подошёл — берём
// обычную price_day. Если подошло несколько (диапазоны в базе не
// обязаны быть непересекающимися) — берём тариф с наибольшим min_days,
// как более специфичный.
function resolvePricePerDay(days: number, tiers: any[], fallbackPriceDay: number) {
  const matched = tiers
    .filter((t) => days >= t.min_days && (t.max_days == null || days <= t.max_days))
    .sort((a, b) => a.min_days - b.min_days)
  if (matched.length > 0) return matched[matched.length - 1].price_per_day
  return fallbackPriceDay
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { vehicleId, vkLink, gameNickname, contactName, startDate, endDate } = await req.json()

    if (!vehicleId || !vkLink?.trim() || !gameNickname?.trim() || !contactName?.trim()) {
      return json({ error: "Заполните все поля формы" }, 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return json({ error: "Некорректный период аренды" }, 400)
    }
    // Считаем сутки включительно: с 10 по 10 число — это 1 сутки, с 10 по 12 — 3.
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_IN_DAY) + 1)

    const clientIp = getClientIp(req)

    // --- Антиспам: не больше одной заявки с одного IP за N минут ---
    const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from("rentals")
      .select("id")
      .eq("client_ip", clientIp)
      .gte("created_at", since)
      .limit(1)

    if (recentError) throw recentError
    if (recent && recent.length > 0) {
      return json(
        { error: "Вы уже отправляли заявку недавно. Попробуйте ещё раз через несколько минут." },
        429
      )
    }

    // --- Машина не должна быть уже занята активной арендой ---
    const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("brand, model, class, location, deposit, price_day, is_rented, categories(label)")
    .eq("id", vehicleId)
    .maybeSingle()

    if (vehicleError) throw vehicleError
    if (!vehicle) return json({ error: "Машина не найдена" }, 404)
    if (vehicle.is_rented) {
      return json({ error: "Эта машина сейчас в аренде и временно недоступна для брони" }, 409)
    }

    // --- Тарифы машины ---
    const { data: tiers, error: tiersError } = await supabase
      .from("vehicle_price_tiers")
      .select("min_days, max_days, price_per_day")
      .eq("vehicle_id", vehicleId)

    if (tiersError) throw tiersError

    const pricePerDay = resolvePricePerDay(days, tiers || [], vehicle.price_day)
    const price = pricePerDay * days

    const { data, error } = await supabase
      .from("rentals")
      .insert({
        vehicle_id: vehicleId,
        vk_link: vkLink.trim(),
        game_nickname: gameNickname.trim(),
        contact_name: contactName.trim(),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        price,
        client_ip: clientIp,
        status: "active",
      })
      .select()
      .single()

    if (error) throw error

    // Помечаем машину занятой сразу после успешной заявки — до тех
    // пор, пока админ не переведёт статус в completed/cancelled.
    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ is_rented: true })
      .eq("id", vehicleId)
    if (updateError) throw updateError
    const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`
    const deposit = Number(vehicle.deposit ?? 0)
    const safeVk = /^https?:\/\//i.test(vkLink.trim()) ? vkLink.trim() : ""
    const usedTier = (tiers || []).some(
      (t: any) => days >= t.min_days && (t.max_days == null || days <= t.max_days)
    )
    const siteUrl = Deno.env.get("SITE_URL") // необязательно, напр. https://your-site.ru

    await notifyTelegram(
      [
        "🚗 <b>Новая заявка на аренду</b>",
        `<i>№ ${esc(String(data.id).slice(0, 8))}</i>`,
        "",
        "<b>🚘 Машина</b>",
        `${esc(`${vehicle.brand} ${vehicle.model}`)}${vehicle.class ? ` · ${esc(vehicle.class)}` : ""}`,
        `Категория: ${esc(vehicle.categories?.label ?? "—")}`,
        `Точка выдачи: ${esc(vehicle.location ?? "—")}`,
        "",
        "<b>📅 Аренда</b>",
        `${fmtDate(start)} – ${fmtDate(end)} (${days} сут.)`,
        `Тариф: ${rub(pricePerDay)} / сутки${usedTier ? " (по сроку аренды)" : " (базовый)"}`,
        `Итого: <b>${rub(price)}</b>`,
        deposit > 0 ? `Залог: ${rub(deposit)} (вместе: ${rub(price + deposit)})` : "Залог: нет",
        "",
        "<b>👤 Клиент</b>",
        `Ник: ${esc(gameNickname.trim())}`,
        `Обращение: ${esc(contactName.trim())}`,
        safeVk ? `ВК: <a href="${esc(safeVk)}">${esc(safeVk)}</a>` : `ВК: ${esc(vkLink.trim())}`,
        "",
        `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
        siteUrl ? `⚙️ <a href="${esc(siteUrl)}/admin">Открыть админку</a>` : "",
      ].filter((l) => l !== "").join("\n")
    )
    return json({ ok: true, rental: data })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
