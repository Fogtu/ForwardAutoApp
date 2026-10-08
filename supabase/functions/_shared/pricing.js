// Единый источник логики суток и тарифов. Его импортируют и сайт (Vite),
// и Edge Functions (Deno) — расчёт цены больше не дублируется.
// Чистый JS без зависимостей: работает везде и тестируется через node --test.

export const MS_IN_DAY = 24 * 60 * 60 * 1000

// Сутки включительно: с 10 по 10 — 1 сутки, с 10 по 12 — 3.
// Возвращает 0 при некорректных датах или если «по» раньше «с».
export function daysBetween(fromStr, toStr) {
  if (!fromStr || !toStr) return 0
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return 0
  return Math.round((to.getTime() - from.getTime()) / MS_IN_DAY) + 1
}

// Строки БД (min_days...) → { minDays, maxDays, pricePerDay }
export function normalizeTiers(rows = []) {
  return rows.map((t) => ({ minDays: t.min_days, maxDays: t.max_days, pricePerDay: t.price_per_day }))
}

// Подходящий тариф. Если подошло несколько — самый специфичный (наибольший minDays).
export function matchTier(days, priceTiers = []) {
  const matched = priceTiers.filter((t) => days >= t.minDays && (t.maxDays == null || days <= t.maxDays))
  if (matched.length === 0) return null
  return matched.reduce((best, t) => (t.minDays > best.minDays ? t : best))
}

export function pricePerDayFor(days, priceTiers = [], priceDay) {
  const tier = matchTier(days, priceTiers)
  return tier ? tier.pricePerDay : priceDay
}

export function totalPriceFor(days, priceTiers, priceDay) {
  if (days <= 0) return 0
  return pricePerDayFor(days, priceTiers, priceDay) * days
}

// Полный расчёт для заявки — тот же вызывает сервер при создании.
export function quoteRental({ startDate, endDate, tiers = [], priceDay }) {
  const days = daysBetween(startDate, endDate)
  const pricePerDay = pricePerDayFor(days, tiers, priceDay)
  return {
    days,
    pricePerDay,
    total: days > 0 ? pricePerDay * days : 0,
    usedTier: matchTier(days, tiers) !== null,
  }
}
