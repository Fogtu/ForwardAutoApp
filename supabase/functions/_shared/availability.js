// Даты 'YYYY-MM-DD' и занятость машины. Общий модуль для сайта и Edge Functions.

const pad = (n) => String(n).padStart(2, '0')

// Сегодня в локальном часовом поясе (на сервере — UTC).
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(str, n) {
  const d = new Date(`${str}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Диапазоны включительные; строки YYYY-MM-DD корректно сравниваются как текст.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

// ranges — [{ start, end }]
export function isRangeFree(ranges, start, end) {
  return !(ranges || []).some((r) => rangesOverlap(r.start, r.end, start, end))
}

export function expandRange(start, end) {
  const out = []
  let d = start
  let guard = 0
  while (d <= end && guard++ < 400) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

// До какой даты машина занята прямо сейчас (или null, если свободна).
export function currentBusyUntil(ranges, today = todayStr()) {
  const ends = (ranges || []).filter((r) => r.start <= today && r.end >= today).map((r) => r.end).sort()
  return ends.length ? ends[ends.length - 1] : null
}

export function isBusyNow(ranges, today = todayStr()) {
  return currentBusyUntil(ranges, today) !== null
}
