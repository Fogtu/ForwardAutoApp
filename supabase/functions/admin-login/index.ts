// supabase/functions/admin-login/index.ts
// Проверяет SHA-256 хэш пароля (его считает браузер) против хэша в admin_config
// и выдаёт временный токен сессии (сохраняется в admin_sessions).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 часов

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { passwordHash } = await req.json()

    if (!passwordHash || typeof passwordHash !== "string") {
      return new Response(JSON.stringify({ error: "Пароль обязателен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: config, error: configError } = await supabase
      .from("admin_config")
      .select("password_hash")
      .eq("id", true)
      .single()

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Админ-пароль не настроен на сервере" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (passwordHash !== config.password_hash) {
      return new Response(JSON.stringify({ error: "Неверный пароль" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({ expires_at: expiresAt })
      .select("token, expires_at")
      .single()

    if (sessionError || !session) {
      throw sessionError ?? new Error("Не удалось создать сессию")
    }

    return new Response(JSON.stringify({ token: session.token, expiresAt: session.expires_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
