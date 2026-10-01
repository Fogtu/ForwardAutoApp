import { supabase } from '../lib/supabaseClient.js'

// Переводим строку из Supabase (snake_case) в форму, которую ждут компоненты
// (camelCase, как раньше было в src/data/vehicles.js).
function mapVehicle(row) {
  const stages = (row.vehicle_stages || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.category)

  const priceTiers = (row.vehicle_price_tiers || [])
    .slice()
    .sort((a, b) => a.min_days - b.min_days)
    .map((t) => ({ minDays: t.min_days, maxDays: t.max_days, pricePerDay: t.price_per_day }))

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
    isRented: !!row.is_rented,
    seats: row.seats,
    topSpeed: row.top_speed,
    trunkCapacity: row.trunk_capacity,
    rating: row.rating,
    rents: row.rents,
    location: row.location,
    badge: row.badge,
    features: row.features || [],
    images: row.images || [],
    stages,
  }
}

const VEHICLE_SELECT = '*, vehicle_stages(position, category), vehicle_price_tiers(min_days, max_days, price_per_day)'

export async function fetchVehiclesByCategory(categoryId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .eq('category_id', categoryId)
  if (error) throw error
  return (data || []).map(mapVehicle)
}

export async function fetchVehicle(id) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapVehicle(data) : null
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
