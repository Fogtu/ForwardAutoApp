// supabase/functions/create-rental/index.ts
// Публичная точка приёма заявок на аренду (без токена — доступна всем
// посетителям сайта). Проверяет входные данные, антиспам по IP, атомарно
// занимает машину и сама считает итоговую цену по датам и тарифам машины
// (vehicle_price_tiers) — цене из браузера не доверяет.

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

// Ограничения входных данных.
const MAX_DAYS = 60
const MAX_VK_LEN = 200
const MAX_NAME_LEN = 64
const VK_RE = /^https?:\/\/(m\.)?vk\.(com|ru)\//i

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
        text: text.slice(0, 4000),
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
// обычную price_day. Если подошло несколько — берём тариф с наибольшим
// min_days, как более специфичный.
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
    const body = await req.json()
    const { vehicleId, startDate, endDate } = body
    const vkLink = typeof body.vkLink === "string" ? body.vkLink.trim() : ""
    const gameNickname = typeof body.gameNickname === "string" ? body.gameNickname.trim() : ""
    const contactName = typeof body.contactName === "string" ? body.contactName.trim() : ""

    if (!vehicleId || !vkLink || !gameNickname || !contactName) {
      return json({ error: "Заполните все поля формы" }, 400)
    }
    if (vkLink.length > MAX_VK_LEN || gameNickname.length > MAX_NAME_LEN || contactName.length > MAX_NAME_LEN) {
      return json({ error: "Слишком длинное значение в одном из полей" }, 400)
    }
    if (!VK_RE.test(vkLink)) {
      return json({ error: "Укажите ссылку на профиль ВКонтакте (vk.com/...)" }, 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return json({ error: "Некорректный период аренды" }, 400)
    }

    // Запас в сутки на часовые пояса: клиент и сервер живут в разных.
    const todayUtc = new Date(new Date().toISOString().slice(0, 10)).getTime()
    if (start.getTime() < todayUtc - MS_IN_DAY) {
      return json({ error: "Дата начала не может быть в прошлом" }, 400)
    }

    // Считаем сутки включительно: с 10 по 10 число — это 1 сутки, с 10 по 12 — 3.
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_IN_DAY) + 1)
    if (days > MAX_DAYS) {
      return json({ error: `Максимальный срок аренды — ${MAX_DAYS} суток` }, 400)
    }

    const clientIp = getClientIp(req)

    // --- Антиспам: не больше одной заявки с одного IP за N минут ---
    // Если IP определить не удалось, лимит не применяем: иначе все
    // такие посетители делили бы один общий лимит "unknown".
    if (clientIp !== "unknown") {
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
    }

    // --- Машина ---
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

    // --- Тарифы и цена (считаем ДО того, как занимать машину) ---
    const { data: tiers, error: tiersError } = await supabase
      .from("vehicle_price_tiers")
      .select("min_days, max_days, price_per_day")
      .eq("vehicle_id", vehicleId)

    if (tiersError) throw tiersError

    const pricePerDay = resolvePricePerDay(days, tiers || [], vehicle.price_day)
    const price = pricePerDay * days

    // --- Атомарно занимаем машину ---
    // update ... where is_rented = false выполнится только для одного из
    // одновременных запросов, второй получит пустой результат и 409.
    const { data: claimed, error: claimError } = await supabase
      .from("vehicles")
      .update({ is_rented: true })
      .eq("id", vehicleId)
      .eq("is_rented", false)
      .select("id")

    if (claimError) throw claimError
    if (!claimed || claimed.length === 0) {
      return json({ error: "Эта машина сейчас в аренде и временно недоступна для брони" }, 409)
    }

    const { data, error } = await supabase
      .from("rentals")
      .insert({
        vehicle_id: vehicleId,
        vk_link: vkLink,
        game_nickname: gameNickname,
        contact_name: contactName,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        price,
        client_ip: clientIp,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      // Заявка не создалась — освобождаем машину обратно.
      await supabase.from("vehicles").update({ is_rented: false }).eq("id", vehicleId)
      throw error
    }

    const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`
    const deposit = Number(vehicle.deposit ?? 0)
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
        `Ник: ${esc(gameNickname)}`,
        `Обращение: ${esc(contactName)}`,
        `ВК: <a href="${esc(vkLink)}">${esc(vkLink)}</a>`,
        "",
        `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
        siteUrl ? `⚙️ <a href="${esc(siteUrl)}/admin">Открыть админку</a>` : "",
      ].filter((l) => l !== "").join("\n")
    )

    return json({ ok: true, rental: data })
  } catch (e) {
    console.error("create-rental failed:", e)
    return json({ error: "Не удалось отправить заявку. Попробуйте позже." }, 500)
  }
})
