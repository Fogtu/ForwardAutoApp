const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL

// Заявка идёт не напрямую в Supabase (у anon-ключа нет прав на insert
// в rentals), а через Edge Function create-rental — там же сервер
// проверяет антиспам по IP, проверяет что машина свободна и сам
// считает цену по датам и тарифам машины.
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
