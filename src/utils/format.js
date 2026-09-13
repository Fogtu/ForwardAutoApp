export function formatMoney(value) {
  return `$${new Intl.NumberFormat('ru-RU').format(value)}`
}

export function seatsLabel(seats) {
  if (seats === 2) return '2 места'
  if (seats <= 4) return `${seats} места`
  return `${seats} мест`
}
