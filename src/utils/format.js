export function formatMoney(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

export function seatsLabel(seats) {
  if (seats === 2) return '2 места'
  if (seats <= 4) return `${seats} места`
  return `${seats} мест`
}

function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function slotsLabel(n) {
  return `${n} ${plural(n, 'слот', 'слота', 'слотов')}`
}

export function reviewsLabel(n) {
  return `${n} ${plural(n, 'отзыв', 'отзыва', 'отзывов')}`
}

// '2026-10-10' → '10.10.2026'
export function formatDate(str) {
  if (!str) return '—'
  return String(str).slice(0, 10).split('-').reverse().join('.')
}
