export function formatMoney(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

export function seatsLabel(seats) {
  if (seats === 2) return '2 места'
  if (seats <= 4) return `${seats} места`
  return `${seats} мест`
}

export function slotsLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} слот`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} слота`
  return `${n} слотов`
}