const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
const SESSION_KEY = 'far_admin_session'

// session = { token, username, role: 'owner' | 'manager' }
export function getStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function getStoredToken() {
  return getStoredSession()?.token || null
}

export function clearStoredToken() {
  sessionStorage.removeItem(SESSION_KEY)
}

// Пароль уходит по HTTPS, проверяется на сервере (bcrypt в БД) — не хэш из браузера.
export async function login(username, password) {
  const res = await fetch(`${FUNCTIONS_URL}/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Ошибка входа')

  const session = { token: json.token, username: json.username, role: json.role }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function callAdminApi(resource, action, payload) {
  const token = getStoredToken()
  if (!token) {
    window.dispatchEvent(new Event('far-admin-unauthorized'))
    throw new Error('Не авторизовано, войдите заново')
  }

  const res = await fetch(`${FUNCTIONS_URL}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ resource, action, payload }),
  })

  const json = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event('far-admin-unauthorized'))
    }
    throw new Error(json.error || 'Ошибка запроса к админ-API')
  }
  return json
}
