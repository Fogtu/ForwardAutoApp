const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
const TOKEN_KEY = 'far_admin_token'

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Пароль хэшируется в браузере и на сервер уходит только хэш —
// сам пароль по сети не передаётся.
export async function login(password) {
  const passwordHash = await sha256Hex(password)

  const res = await fetch(`${FUNCTIONS_URL}/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwordHash }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Ошибка входа')

  sessionStorage.setItem(TOKEN_KEY, json.token)
  return json
}

export async function callAdminApi(resource, action, payload) {
  const token = getStoredToken()
  if (!token) {
    window.dispatchEvent(new Event('far-admin-unauthorized'))
    throw new Error('Не авторизовано, войдите заново')
  }

  const res = await fetch(`${FUNCTIONS_URL}/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify({ resource, action, payload }),
  })

  const json = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredToken()
      // AdminPage слушает это событие и возвращает на экран входа.
      window.dispatchEvent(new Event('far-admin-unauthorized'))
    }
    throw new Error(json.error || 'Ошибка запроса к админ-API')
  }
  return json
}
