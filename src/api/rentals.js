import { supabase } from '../lib/supabaseClient.js'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL

// Заявка идёт через Edge Function create-rental: там антиспам по IP, проверка
// свободных дат и расчёт цены. Заявка создаётся со статусом «на рассмотрении».
// Возвращает { ok, code } — номер заявки, по нему можно узнать статус.
export async function submitRentalRequest({ vehicleId, vkLink, gameNickname, contactName, startDate, endDate }) {
  const res = await fetch(`${FUNCTIONS_URL}/create-rental`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId, vkLink, gameNickname, contactName, startDate, endDate }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Не удалось отправить заявку')
  return json
}

// Статус по номеру заявки (без персональных данных). null — номер не найден.
export async function fetchRentalStatus(code) {
  const { data, error } = await supabase.rpc('get_rental_status', { p_code: code })
  if (error) throw error
  return data && data.length > 0 ? data[0] : null
}

export async function submitReview({ code, rating, comment }) {
  const { error } = await supabase.rpc('submit_review', {
    p_code: code,
    p_rating: rating,
    p_comment: comment || null,
  })
  if (error) throw new Error(error.message)
}
