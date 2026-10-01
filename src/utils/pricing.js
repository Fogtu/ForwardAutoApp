export const MS_IN_DAY = 24 * 60 * 60 * 1000

// Количество суток аренды включительно: с 10 по 10 число — 1 сутки,
// с 10 по 12 — 3. Возвращает 0, если даты некорректны или "по" раньше "с".
export function daysBetween(fromStr, toStr) {
  if (!fromStr || !toStr) return 0
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return 0
  return Math.round((to.getTime() - from.getTime()) / MS_IN_DAY) + 1
}

// Подбирает цену за сутки по количеству дней аренды среди тарифов
// машины (priceTiers — { minDays, maxDays, pricePerDay }[]). Если
// тарифов нет или ни один не подошёл — используется обычная price_day.
export function pricePerDayFor(days, priceTiers = [], priceDay) {
  const matched = priceTiers.filter(
    (t) => days >= t.minDays && (t.maxDays == null || days <= t.maxDays)
  )
  if (matched.length === 0) return priceDay
  // Если подошло несколько диапазонов — берём самый специфичный (с
  // наибольшим minDays), как более точное совпадение.
  return matched.reduce((best, t) => (t.minDays > best.minDays ? t : best)).pricePerDay
}

export function totalPriceFor(days, priceTiers, priceDay) {
  if (days <= 0) return 0
  return pricePerDayFor(days, priceTiers, priceDay) * days
}
