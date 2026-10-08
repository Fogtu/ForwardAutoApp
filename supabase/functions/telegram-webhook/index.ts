// supabase/functions/telegram-webhook/index.ts
// Принимает нажатия кнопок «Одобрить / Отклонить» из уведомления о заявке.
// Защита: секретный заголовок Telegram + проверка, что кнопку нажали в нужном чате.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { setRentalStatus, errMsg } from "../_shared/rentals.ts"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!
const TG_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")

async function tg(method: string, body: unknown) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) console.error(method, res.status, await res.text())
  } catch (e) {
    console.error(method, "failed", e)
  }
}

const ok = () => new Response("ok")

serve(async (req) => {
  if (!WEBHOOK_SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 })
  }

  try {
    const update = await req.json()
    const cb = update.callback_query
    if (!cb) return ok()

    const answer = (text: string, alert = false) =>
      tg("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: alert })

    if (String(cb.message?.chat?.id ?? "") !== String(TG_CHAT_ID)) {
      await answer("Нет доступа", true)
      return ok()
    }

    const [kind, id] = String(cb.data ?? "").split(":")
    if ((kind !== "a" && kind !== "r") || !id) {
      await answer("Неизвестная команда")
      return ok()
    }

    const { data: rental } = await supabase.from("rentals").select("status, public_code").eq("id", id).maybeSingle()
    if (!rental) {
      await answer("Заявка не найдена (возможно, удалена)", true)
      return ok()
    }
    if (rental.status !== "pending") {
      await answer(`Заявка уже обработана (статус: ${rental.status})`, true)
      return ok()
    }

    const newStatus = kind === "a" ? "active" : "rejected"
    try {
      await setRentalStatus(supabase, id, newStatus)
    } catch (e) {
      await answer(errMsg(e), true)
      return ok()
    }

    const who = cb.from?.username ? `@${cb.from.username}` : String(cb.from?.id ?? "?")
    await supabase.from("admin_audit_log").insert({
      username: `telegram:${who}`,
      action: "rentals.updateStatus",
      target: id,
      details: { status: newStatus, via: "telegram" },
    })

    await tg("editMessageReplyMarkup", {
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: kind === "a" ? `✅ Одобрено (${who})` : `❌ Отклонено (${who})`, callback_data: "noop" }]],
      },
    })
    await answer(kind === "a" ? "Заявка одобрена" : "Заявка отклонена")
    return ok()
  } catch (e) {
    console.error("telegram-webhook failed:", e)
    return ok() // всегда 200, чтобы Telegram не повторял запрос
  }
})
