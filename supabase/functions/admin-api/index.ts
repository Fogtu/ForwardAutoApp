// supabase/functions/admin-api/index.ts
// Единая точка входа для всех операций админки (машины, категории,
// стейджи, тарифы по датам, аренды). Требует валидный токен сессии в
// заголовке x-admin-token (выдаётся admin-login). Все запросы к базе
// идут сервисным ключом — RLS для anon тут не участвует.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
}

const EXTRA_CATEGORIES = ["Баланс", "Скорость", "Управление"]

async function isValidToken(token: string | null) {
  if (!token) return false
  const { data } = await supabase
    .from("admin_sessions")
    .select("expires_at")
    .eq("token", token)
    .maybeSingle()
  if (!data) return false
  return new Date(data.expires_at).getTime() > Date.now()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const token = req.headers.get("x-admin-token")
  if (!(await isValidToken(token))) {
    return json({ error: "Не авторизовано" }, 401)
  }

  try {
    const { resource, action, payload } = await req.json()

    switch (resource) {
      case "vehicles":
        return json(await handleVehicles(action, payload))
      case "categories":
        return json(await handleCategories(action, payload))
      case "stages":
        return json(await handleStages(action, payload))
      case "priceTiers":
        return json(await handlePriceTiers(action, payload))
      case "rentals":
        return json(await handleRentals(action, payload))
      default:
        return json({ error: "Неизвестный ресурс" }, 400)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
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
// Правило: у машины 0 стейджей (стоковая) либо непрерывно 2–4, начиная
// с позиции 1. Позиция 1 — всегда "База". Позиции 2+ — любая из
// Баланс/Скорость/Управление, повторы разрешены.
function validateStages(stages: any[]) {
  if (!Array.isArray(stages)) throw new Error("stages должен быть массивом")
  if (stages.length === 0) return

  if (stages.length < 2 || stages.length > 4) {
    throw new Error("У машины должно быть 0 стейджей (стоковая) либо от 2 до 4 подряд")
  }

  const sorted = [...stages].sort((a, b) => a.position - b.position)
  for (let i = 0; i < sorted.length; i++) {
    const expectedPosition = i + 1
    if (sorted[i].position !== expectedPosition) {
      throw new Error("Стейджи должны идти подряд без пропусков, начиная с 1 (Базы)")
    }
    if (expectedPosition === 1) {
      if (sorted[i].category !== "База") {
        throw new Error("Первый стейдж должен быть категории «База»")
      }
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

    const rows = stages.map((s: any) => ({
      vehicle_id: vehicleId,
      position: s.position,
      category: s.category,
    }))
    const { data, error } = await supabase.from("vehicle_stages").insert(rows).select()
    if (error) throw error
    return data
  }
  throw new Error("Неизвестное действие для stages")
}

// ---------- Тарифы по датам ----------
// Каждый тариф — диапазон суток аренды [min_days; max_days] и цена за
// сутки в этом диапазоне. max_days = null значит "и больше". Тарифов
// может быть 0 (тогда всегда действует price_day машины) или сколько
// угодно — их порядок и непересечение не проверяются жёстко, это на
// совести того, кто редактирует (админ видит их отсортированными по
// min_days и может скорректировать).
async function handlePriceTiers(action: string, payload: any) {
  if (action === "listForVehicle") {
    const { data, error } = await supabase
      .from("vehicle_price_tiers")
      .select("*")
      .eq("vehicle_id", payload.vehicleId)
      .order("min_days")
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
      vehicle_id: vehicleId,
      min_days: t.min_days,
      max_days: t.max_days ?? null,
      price_per_day: t.price_per_day,
    }))
    const { data, error } = await supabase.from("vehicle_price_tiers").insert(rows).select()
    if (error) throw error
    return data
  }
  throw new Error("Неизвестное действие для priceTiers")
}

// ---------- Аренды ----------
// После любого изменения статуса или удаления заявки пересчитываем
// vehicles.is_rented машины: занята, если у неё осталась хоть одна
// активная (status = 'active') заявка, иначе свободна. Так занятость
// на публичных страницах всегда в синхроне с админкой, без ручного
// переключателя, который было бы легко забыть выключить.
async function recomputeVehicleAvailability(vehicleId: string | null) {
  if (!vehicleId) return
  const { data, error } = await supabase
    .from("rentals")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .limit(1)
  if (error) throw error
  const isRented = !!(data && data.length > 0)
  const { error: updError } = await supabase.from("vehicles").update({ is_rented: isRented }).eq("id", vehicleId)
  if (updError) throw updError
}

async function handleRentals(action: string, payload: any) {
  if (action === "list") {
    const { data, error } = await supabase
      .from("rentals")
      .select("*, vehicles(brand, model)")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  }
  if (action === "updateStatus") {
    const { id, status } = payload
    const { data, error } = await supabase.from("rentals").update({ status }).eq("id", id).select().single()
    if (error) throw error
    await recomputeVehicleAvailability(data.vehicle_id)   // ← вот тут
    return data
  }
  if (action === "delete") {
    const { data: existing } = await supabase.from("rentals").select("vehicle_id").eq("id", payload.id).maybeSingle()
    const { error } = await supabase.from("rentals").delete().eq("id", payload.id)
    if (error) throw error
    if (existing) await recomputeVehicleAvailability(existing.vehicle_id)   // ← и тут
    return { ok: true }
  }
  throw new Error("Неизвестное действие для rentals")
}
