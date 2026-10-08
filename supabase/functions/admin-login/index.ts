// supabase/functions/admin-login/index.ts
// Вход по логину и паролю. Пароль проверяется внутри БД (bcrypt, admin_verify_login).
// Защита от перебора: лимит неудачных попыток по IP и по логину за 15 минут.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS_PER_IP = 8
const MAX_FAILS_PER_USER = 10

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!username || !password || username.length > 64 || password.length > 200) {
      return json({ error: "Введите логин и пароль" }, 400)
    }

    const ip = getClientIp(req)
    const since = new Date(Date.now() - WINDOW_MS).toISOString()

    let ipFails = 0
    if (ip !== "unknown") {
      const { count } = await supabase
        .from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since)
      ipFails = count ?? 0
    }
    const { count: userCount } = await supabase
      .from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("username", username).gte("created_at", since)

    if (ipFails >= MAX_FAILS_PER_IP || (userCount ?? 0) >= MAX_FAILS_PER_USER) {
      return json({ error: "Слишком много неудачных попыток. Подождите 15 минут." }, 429)
    }

    const { data: users, error: verifyError } = await supabase.rpc("admin_verify_login", {
      p_username: username,
      p_password: password,
    })
    if (verifyError) throw verifyError

    if (!users || users.length === 0) {
      await supabase.from("admin_login_attempts").insert({ ip, username })
      return json({ error: "Неверный логин или пароль" }, 401)
    }

    const user = users[0]
    await supabase.from("admin_login_attempts").delete().eq("username", username)

    // Заодно чистим мусор.
    await supabase.from("admin_sessions").delete().lt("expires_at", new Date().toISOString())
    await supabase.from("admin_login_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({ expires_at: expiresAt, admin_user_id: user.id, username: user.username, role: user.role })
      .select("token, expires_at")
      .single()
    if (sessionError || !session) throw sessionError ?? new Error("Не удалось создать сессию")

    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id, username: user.username, action: "login", details: { ip },
    })

    return json({ token: session.token, expiresAt: session.expires_at, username: user.username, role: user.role })
  } catch (e) {
    console.error("admin-login failed:", e)
    return json({ error: "Ошибка входа. Попробуйте позже." }, 500)
  }
})
