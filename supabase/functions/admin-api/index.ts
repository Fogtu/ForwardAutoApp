// supabase/functions/admin-api/index.ts
// Единая точка входа админки. Требует токен сессии (x-admin-token, выдаёт admin-login).
// Все изменения пишутся в журнал admin_audit_log. Ресурсы users и audit — только для owner.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { setRentalStatus, errMsg } from "../_shared/rentals.ts"
import { daysBetween } from "../_shared/pricing.js"
import { addDays, rangesOverlap } from "../_shared/availability.js"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
}

const EXTRA_CATEGORIES = ["Баланс", "Скорость", "Управление"]
const READ_ACTIONS = new Set(["list", "get", "listForVehicle"])

type Session = { userId: string; username: string; role: string }

async function getSession(token: string | null): Promise<Session | null> {
  if (!token) return null
  const { data } = await supabase
    .from("admin_sessions")
    .select("expires_at, admin_user_id, username, role")
    .eq("token", token)
    .maybeSingle()
  if (!data || !data.admin_user_id) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null
  return { userId: data.admin_user_id, username: data.username, role: data.role }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Пишем в журнал только безопасные данные: без паролей и без длинных массивов.
async function logAction(session: Session, resource: string, action: string, payload: any) {
  try {
    const { password: _p, ...safe } = payload ?? {}
    if (safe.changes) {
      const { images: _i, ...rest } = safe.changes
      safe.changes = rest
    }
    if (safe.images) delete safe.images
    let details: any = safe
    if (JSON.stringify(details).length > 2000) details = { truncated: true }
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session.userId,
      username: session.username,
      action: `${resource}.${action}`,
      target: String(payload?.id ?? payload?.vehicleId ?? "") || null,
      details,
    })
  } catch (e) {
    console.error("audit log failed:", e)
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const session = await getSession(req.headers.get("x-admin-token"))
  if (!session) return json({ error: "Не авторизовано" }, 401)

  try {
    const { resource, action, payload } = await req.json()

    if ((resource === "users" || resource === "audit") && session.role !== "owner") {
      return json({ error: "Недостаточно прав" }, 403)
    }

    let result: unknown
    switch (resource) {
      case "vehicles": result = await handleVehicles(action, payload); break
      case "categories": result = await handleCategories(action, payload); break
      case "stages": result = await handleStages(action, payload); break
      case "priceTiers": result = await handlePriceTiers(action, payload); break
      case "rentals": result = await handleRentals(action, payload); break
      case "reviews": result = await handleReviews(action, payload); break
      case "stats": result = await handleStats(payload); break
      case "users": result = await handleUsers(action, payload, session); break
      case "audit": result = await handleAudit(); break
      default: return json({ error: "Неизвестный ресурс" }, 400)
    }

    if (!READ_ACTIONS.has(action) && resource !== "stats" && resource !== "audit") {
      await logAction(session, resource, action, payload)
    }
    return json(result)
  } catch (e) {
    return json({ error: errMsg(e) }, 500)
  }
})

// ---------- Машины ----------
async function handleVehicles(action: string, payload: any) {
  if (action === "list") {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_stages(position, category), vehicle_price_tiers(id, min_days, max_days, price_per_day)")
      .order("brand")
    if (error) throw error
    return data
  }
  if (action === "create") {
    const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
    if (error) throw error
    return data
  }
  if (action === "update") {
    const { id, changes } = payload
    const { data, error } = await supabase.from("vehicles").update(changes).eq("id", id).select().single()
    if (error) throw error
    return data
  }
  if (action === "delete") {
    const { error } = await supabase.from("vehicles").delete().eq("id", payload.id)
    if (error) throw error
    return { ok: true }
  }
  throw new Error("Неизвестное действие для vehicles")
}

// ---------- Категории ----------
async function handleCategories(action: string, payload: any) {
  if (action === "list") {
    const { data, error } = await supabase.from("categories").select("*").order("label")
    if (error) throw error
    return data
  }
  if (action === "create") {
    const { data, error } = await supabase.from("categories").insert(payload).select().single()
    if (error) throw error
    return data
  }
  if (action === "update") {
    const { id, changes } = payload
    const { data, error } = await supabase.from("categories").update(changes).eq("id", id).select().single()
    if (error) throw error
    return data
  }
  if (action === "delete") {
    const { error } = await supabase.from("categories").delete().eq("id", payload.id)
    if (error) throw error
    return { ok: true }
  }
  throw new Error("Неизвестное действие для categories")
}

// ---------- Стейджи ----------
function validateStages(stages: any[]) {
  if (!Array.isArray(stages)) throw new Error("stages должен быть массивом")
  if (stages.length === 0) return
  if (stages.length > 4) throw new Error("У машины может быть не больше 4 стейджей")

  const sorted = [...stages].sort((a, b) => a.position - b.position)
  for (let i = 0; i < sorted.length; i++) {
    const expectedPosition = i + 1
    if (sorted[i].position !== expectedPosition) {
      throw new Error("Стейджи должны идти подряд без пропусков, начиная с 1 (Базы)")
    }
    if (expectedPosition === 1) {
      if (sorted[i].category !== "База") throw new Error("Первый стейдж должен быть категории «База»")
    } else if (!EXTRA_CATEGORIES.includes(sorted[i].category)) {
      throw new Error(`Стейдж №${expectedPosition} должен быть одной из категорий: ${EXTRA_CATEGORIES.join(", ")}`)
    }
  }
}

async function handleStages(action: string, payload: any) {
  if (action === "replaceForVehicle") {
    const { vehicleId, stages } = payload
    validateStages(stages)
    const { error: delError } = await supabase.from("vehicle_stages").delete().eq("vehicle_id", vehicleId)
    if (delError) throw delError
    if (!stages || stages.length === 0) return []
    const rows = stages.map((s: any) => ({ vehicle_id: vehicleId, position: s.position, category: s.category }))
    const { data, error } = await supabase.from("vehicle_stages").insert(rows).select()
    if (error) throw error
    return data
  }
  throw new Error("Неизвестное действие для stages")
}

// ---------- Тарифы ----------
async function handlePriceTiers(action: string, payload: any) {
  if (action === "listForVehicle") {
    const { data, error } = await supabase
      .from("vehicle_price_tiers").select("*").eq("vehicle_id", payload.vehicleId).order("min_days")
    if (error) throw error
    return data
  }
  if (action === "replaceForVehicle") {
    const { vehicleId, tiers } = payload
    if (!Array.isArray(tiers)) throw new Error("tiers должен быть массивом")
    for (const t of tiers) {
      if (!t.min_days || t.min_days < 1) throw new Error("Каждый тариф должен иметь «от, дней» >= 1")
      if (t.max_days != null && t.max_days < t.min_days) throw new Error("«до, дней» не может быть меньше «от, дней»")
      if (t.price_per_day == null || t.price_per_day < 0) throw new Error("Укажите цену за сутки для каждого тарифа")
    }
    const { error: delError } = await supabase.from("vehicle_price_tiers").delete().eq("vehicle_id", vehicleId)
    if (delError) throw delError
    if (tiers.length === 0) return []
    const rows = tiers.map((t: any) => ({
      vehicle_id: vehicleId, min_days: t.min_days, max_days: t.max_days ?? null, price_per_day: t.price_per_day,
    }))
    const { data, error } = await supabase.from("vehicle_price_tiers").insert(rows).select()
    if (error) throw error
    return data
  }
  throw new Error("Неизвестное действие для priceTiers")
}

// ---------- Аренды ----------
async function handleRentals(action: string, payload: any) {
  if (action === "list") {
    const { data, error } = await supabase
      .from("rentals").select("*, vehicles(brand, model)").order("created_at", { ascending: false })
    if (error) throw error
    return data
  }
  if (action === "updateStatus") {
    return await setRentalStatus(supabase, payload.id, payload.status)
  }
  if (action === "delete") {
    const { error } = await supabase.from("rentals").delete().eq("id", payload.id)
    if (error) throw error
    return { ok: true }
  }
  throw new Error("Неизвестное действие для rentals")
}

// ---------- Отзывы ----------
async function handleReviews(action: string, payload: any) {
  if (action === "list") {
    const { data, error } = await supabase
      .from("reviews").select("*, vehicles(brand, model)").order("created_at", { ascending: false }).limit(300)
    if (error) throw error
    return data
  }
  if (action === "delete") {
    const { error } = await supabase.from("reviews").delete().eq("id", payload.id)
    if (error) throw error
    return { ok: true }
  }
  throw new Error("Неизвестное действие для reviews")
}

// ---------- Дашборд ----------
// Выручка и число аренд — по дате начала аренды, среди одобренных и завершённых
// заявок, начавшихся к сегодняшнему дню. Загрузка — доля «машино-суток» в аренде.
async function handleStats(payload: any) {
  const days = Math.max(0, Number(payload?.days) || 0)
  const today = new Date().toISOString().slice(0, 10)
  const day = (v: string) => String(v).slice(0, 10)

  const { data: rows, error } = await supabase
    .from("rentals").select("vehicle_id, status, price, start_date, end_date, vehicles(brand, model)")
  if (error) throw error
  const { count: vehiclesCount } = await supabase.from("vehicles").select("id", { count: "exact", head: true })

  const all = rows || []
  const approved = all.filter((r: any) => r.status === "active" || r.status === "completed")
  const from = days > 0 ? addDays(today, -(days - 1)) : null

  const started = approved.filter((r: any) => {
    const s = day(r.start_date)
    return s <= today && (from === null || s >= from)
  })

  const revenue = started.reduce((sum: number, r: any) => sum + (r.price || 0), 0)
  const windowFrom = from ?? (started.length ? started.map((r: any) => day(r.start_date)).sort()[0] : today)
  const windowDays = daysBetween(windowFrom, today) || 1

  let busyDays = 0
  for (const r of approved) {
    const s = day(r.start_date), e = day(r.end_date)
    if (!rangesOverlap(s, e, windowFrom, today)) continue
    busyDays += daysBetween(s > windowFrom ? s : windowFrom, e < today ? e : today)
  }
  const utilization = vehiclesCount
    ? Math.min(100, Math.round((busyDays / (vehiclesCount * windowDays)) * 100))
    : 0

  const perVehicle = new Map<string, any>()
  for (const r of started) {
    if (!r.vehicle_id) continue
    const cur = perVehicle.get(r.vehicle_id) ?? {
      vehicleId: r.vehicle_id,
      name: r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : r.vehicle_id,
      rentals: 0, revenue: 0, days: 0,
    }
    cur.rentals += 1
    cur.revenue += r.price || 0
    cur.days += daysBetween(day(r.start_date), day(r.end_date))
    perVehicle.set(r.vehicle_id, cur)
  }
  const top = [...perVehicle.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return {
    windowDays,
    revenue,
    rentalsCount: started.length,
    avgCheck: started.length ? Math.round(revenue / started.length) : 0,
    completedCount: started.filter((r: any) => r.status === "completed").length,
    pendingNow: all.filter((r: any) => r.status === "pending").length,
    utilization,
    top,
  }
}

// ---------- Пользователи админки (только owner) ----------
async function handleUsers(action: string, payload: any, session: Session) {
  if (action === "list") {
    const { data, error } = await supabase
      .from("admin_users").select("id, username, role, created_at").order("created_at")
    if (error) throw error
    return data
  }
  if (action === "create") {
    const role = payload.role === "owner" ? "owner" : "manager"
    const username = String(payload.username ?? "").trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      throw new Error("Логин: 3–32 символа, латиница, цифры, _ . -")
    }
    const { data, error } = await supabase.rpc("admin_create_user", {
      p_username: username, p_password: String(payload.password ?? ""), p_role: role,
    })
    if (error) throw error
    return { id: data }
  }
  if (action === "setPassword") {
    const { error } = await supabase.rpc("admin_set_password", {
      p_id: payload.id, p_password: String(payload.password ?? ""),
    })
    if (error) throw error
    return { ok: true }
  }
  if (action === "delete") {
    if (payload.id === session.userId) throw new Error("Нельзя удалить самого себя")
    const { data: target } = await supabase.from("admin_users").select("role").eq("id", payload.id).maybeSingle()
    if (target?.role === "owner") {
      const { count } = await supabase
        .from("admin_users").select("id", { count: "exact", head: true }).eq("role", "owner")
      if ((count ?? 0) <= 1) throw new Error("Нельзя удалить последнего владельца")
    }
    const { error } = await supabase.from("admin_users").delete().eq("id", payload.id)
    if (error) throw error
    return { ok: true }
  }
  throw new Error("Неизвестное действие для users")
}

// ---------- Журнал (только owner) ----------
async function handleAudit() {
  const { data, error } = await supabase
    .from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200)
  if (error) throw error
  return data
}
