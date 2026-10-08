import { supabase } from '../lib/supabaseClient.js'

export async function fetchReviews(vehicleId, limit = 20) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, author_name, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
