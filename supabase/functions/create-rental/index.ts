// supabase/functions/create-rental/index.ts
// Публичный приём заявок. Заявка создаётся со статусом pending и машину НЕ блокирует —
// машина занимается, когда админ одобрит заявку (в админке или кнопкой в Telegram).
// Цену считает общий модуль _shared/pricing.js (тот же, что и на сайте).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { normalizeTiers, quoteRental } from "../_shared/pricing.js"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const RATE_LIMIT_MINUTES = 10
const MS_IN_DAY = 24 * 60 * 60 * 1000
const MAX_DAYS = 60
const MAX_VK_LEN = 200
const MAX_NAME_LEN = 64
const VK_RE = /^https?:\/\/(m\.)?vk\.(com|ru)\//i

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const TG_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmtDate(d: Date) {
  const [y, m, day] = d.toISOString().slice(0, 10).split("-")
  return `${day}.${m}.${y}`
}

// Ошибка Telegram не должна ломать заявку: она уже сохранена.
async function notifyTelegram(text: string, rentalId: string) {
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
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Одобрить", callback_data: `a:${rentalId}` },
            { text: "❌ Отклонить", callback_data: `r:${rentalId}` },
          ]],
        },
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

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

    const todayUtc = new Date(new Date().toISOString().slice(0, 10)).getTime()
    if (start.getTime() < todayUtc - MS_IN_DAY) {
      return json({ error: "Дата начала не может быть в прошлом" }, 400)
    }

    const startStr = start.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)

    const clientIp = getClientIp(req)

    if (clientIp !== "unknown") {
      const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString()
      const { data: recent, error: recentError } = await supabase
        .from("rentals").select("id").eq("client_ip", clientIp).gte("created_at", since).limit(1)
      if (recentError) throw recentError
      if (recent && recent.length > 0) {
        return json({ error: "Вы уже отправляли заявку недавно. Попробуйте ещё раз через несколько минут." }, 429)
      }
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("brand, model, class, location, deposit, price_day, categories(label)")
      .eq("id", vehicleId)
      .maybeSingle()
    if (vehicleError) throw vehicleError
    if (!vehicle) return json({ error: "Машина не найдена" }, 404)

    const { data: tierRows, error: tiersError } = await supabase
      .from("vehicle_price_tiers").select("min_days, max_days, price_per_day").eq("vehicle_id", vehicleId)
    if (tiersError) throw tiersError

    const quote = quoteRental({
      startDate: startStr, endDate: endStr, tiers: normalizeTiers(tierRows || []), priceDay: vehicle.price_day,
    })
    if (quote.days < 1) return json({ error: "Некорректный период аренды" }, 400)
    if (quote.days > MAX_DAYS) return json({ error: `Максимальный срок аренды — ${MAX_DAYS} суток` }, 400)

    // Даты не должны пересекаться с уже одобренными заявками.
    // (Окончательная проверка повторяется при одобрении.)
    const { data: clash, error: clashError } = await supabase
      .from("rentals").select("id").eq("vehicle_id", vehicleId).eq("status", "active")
      .lte("start_date", end.toISOString()).gte("end_date", start.toISOString()).limit(1)
    if (clashError) throw clashError
    if (clash && clash.length > 0) {
      return json({ error: "На эти даты машина уже занята. Выберите свободные даты в календаре." }, 409)
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
        price: quote.total,
        client_ip: clientIp,
        status: "pending",
      })
      .select("id, public_code")
      .single()
    if (error) throw error

    const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`
    const deposit = Number(vehicle.deposit ?? 0)
    const siteUrl = Deno.env.get("SITE_URL")

    await notifyTelegram(
      [
        "🚗 <b>Новая заявка на аренду</b>",
        `<i>№ ${esc(data.public_code)}</i>`,
        "",
        "<b>🚘 Машина</b>",
        `${esc(`${vehicle.brand} ${vehicle.model}`)}${vehicle.class ? ` · ${esc(vehicle.class)}` : ""}`,
        `Категория: ${esc(vehicle.categories?.label ?? "—")}`,
        `Точка выдачи: ${esc(vehicle.location ?? "—")}`,
        "",
        "<b>📅 Аренда</b>",
        `${fmtDate(start)} – ${fmtDate(end)} (${quote.days} сут.)`,
        `Тариф: ${rub(quote.pricePerDay)} / сутки${quote.usedTier ? " (по сроку аренды)" : " (базовый)"}`,
        `Итого: <b>${rub(quote.total)}</b>`,
        deposit > 0 ? `Залог: ${rub(deposit)} (вместе: ${rub(quote.total + deposit)})` : "Залог: нет",
        "",
        "<b>👤 Клиент</b>",
        `Ник: ${esc(gameNickname)}`,
        `Обращение: ${esc(contactName)}`,
        `ВК: <a href="${esc(vkLink)}">${esc(vkLink)}</a>`,
        "",
        `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
        siteUrl ? `⚙️ <a href="${esc(siteUrl)}/admin">Открыть админку</a>` : "",
      ].filter((l) => l !== "").join("\n"),
      data.id,
    )

    return json({ ok: true, code: data.public_code })
  } catch (e) {
    console.error("create-rental failed:", e)
    return json({ error: "Не удалось отправить заявку. Попробуйте позже." }, 500)
  }
})
