import { supabase } from '../lib/supabaseClient.js'
import { isBusyNow } from '../utils/availability.js'

// snake_case из Supabase → camelCase для компонентов.
function mapVehicle(row, busyMap = {}) {
  const stages = (row.vehicle_stages || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.category)

  const priceTiers = (row.vehicle_price_tiers || [])
    .slice()
    .sort((a, b) => a.min_days - b.min_days)
    .map((t) => ({ minDays: t.min_days, maxDays: t.max_days, pricePerDay: t.price_per_day }))

  const busy = busyMap[row.id] || []

  return {
    id: row.id,
    category: row.category_id,
    brand: row.brand,
    model: row.model,
    class: row.class,
    priceDay: row.price_day,
    priceWeek: row.price_week,
    deposit: row.deposit ?? 0,
    priceTiers,
    busy,                       // [{ start, end }] — одобренные аренды
    busyNow: isBusyNow(busy),   // занята сегодня
    seats: row.seats,
    topSpeed: row.top_speed,
    trunkCapacity: row.trunk_capacity,
    rating: row.rating,
    reviewsCount: row.reviews_count ?? 0,
    rents: row.rents,
    location: row.location,
    badge: row.badge,
    features: row.features || [],
    images: row.images || [],
    stages,
  }
}

const VEHICLE_SELECT = '*, vehicle_stages(position, category), vehicle_price_tiers(min_days, max_days, price_per_day)'

// Занятые даты по машинам: { [vehicleId]: [{ start, end }] }.
// Ошибка календаря не должна ломать каталог — тогда считаем, что всё свободно.
export async function fetchBusyRanges(vehicleId = null) {
  try {
    const { data, error } = await supabase.rpc('get_busy_ranges', { p_vehicle_id: vehicleId })
    if (error) throw error
    const map = {}
    for (const r of data || []) {
      if (!map[r.vehicle_id]) map[r.vehicle_id] = []
      map[r.vehicle_id].push({ start: r.start_date, end: r.end_date })
    }
    return map
  } catch {
    return {}
  }
}

export async function fetchVehiclesByCategory(categoryId) {
  const [{ data, error }, busyMap] = await Promise.all([
    supabase.from('vehicles').select(VEHICLE_SELECT).eq('category_id', categoryId),
    fetchBusyRanges(),
  ])
  if (error) throw error
  return (data || []).map((row) => mapVehicle(row, busyMap))
}

export async function fetchVehiclesByIds(ids) {
  if (!ids || ids.length === 0) return []
  const [{ data, error }, busyMap] = await Promise.all([
    supabase.from('vehicles').select(VEHICLE_SELECT).in('id', ids),
    fetchBusyRanges(),
  ])
  if (error) throw error
  const byId = new Map((data || []).map((row) => [row.id, mapVehicle(row, busyMap)]))
  return ids.map((id) => byId.get(id)).filter(Boolean) // в порядке добавления
}

export async function fetchVehicle(id) {
  const [{ data, error }, busyMap] = await Promise.all([
    supabase.from('vehicles').select(VEHICLE_SELECT).eq('id', id).maybeSingle(),
    fetchBusyRanges(id),
  ])
  if (error) throw error
  return data ? mapVehicle(data, busyMap) : null
}

export async function fetchVehicleCountsByCategory() {
  const { data, error } = await supabase.from('vehicles').select('category_id')
  if (error) throw error
  const counts = {}
  for (const row of data || []) {
    counts[row.category_id] = (counts[row.category_id] || 0) + 1
  }
  return counts
}
