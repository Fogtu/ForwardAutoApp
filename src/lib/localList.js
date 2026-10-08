// Мини-хранилище списков в localStorage (избранное, сравнение) с подпиской для React.
const listeners = new Set()
const snapshots = {}

export function getSnapshot(key) {
  let raw = ''
  try {
    raw = localStorage.getItem(key) || ''
  } catch {
    // localStorage недоступен (приватный режим) — список просто пустой
  }
  const cached = snapshots[key]
  if (cached && cached.raw === raw) return cached.value
  let value = []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) value = parsed
  } catch {
    // пустая или битая запись
  }
  snapshots[key] = { raw, value }
  return value
}

export function setList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // не сохранилось — не страшно
  }
  listeners.forEach((l) => l())
}

export function subscribe(cb) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}
