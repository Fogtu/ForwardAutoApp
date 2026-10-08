import { useEffect, useState } from 'react'
import { getStoredSession, clearStoredToken, login } from '../../api/admin.js'
import DashboardAdmin from './DashboardAdmin.jsx'
import VehiclesAdmin from './VehiclesAdmin.jsx'
import CategoriesAdmin from './CategoriesAdmin.jsx'
import RentalsAdmin from './RentalsAdmin.jsx'
import ReviewsAdmin from './ReviewsAdmin.jsx'
import UsersAdmin from './UsersAdmin.jsx'
import AuditAdmin from './AuditAdmin.jsx'
import './AdminPage.css'
import './AdminExtra.css'

const TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'rentals', label: 'Аренды' },
  { id: 'vehicles', label: 'Машины' },
  { id: 'categories', label: 'Категории' },
  { id: 'reviews', label: 'Отзывы' },
  { id: 'users', label: 'Пользователи', ownerOnly: true },
  { id: 'audit', label: 'Журнал', ownerOnly: true },
]

export default function AdminPage() {
  const [session, setSession] = useState(getStoredSession())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('dashboard')

  // callAdminApi шлёт это событие, когда сессия истекла (401).
  useEffect(() => {
    const onUnauthorized = () => setSession(null)
    window.addEventListener('far-admin-unauthorized', onUnauthorized)
    return () => window.removeEventListener('far-admin-unauthorized', onUnauthorized)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setSession(await login(username.trim(), password))
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    clearStoredToken()
    setSession(null)
  }

  if (!session) {
    return (
      <div className="container admin-login">
        <h1>Админ-панель</h1>
        <form onSubmit={handleLogin} className="admin-login__form">
          <input
            type="text"
            placeholder="Логин"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Пароль"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !username || !password}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
        {error && <p className="admin-login__error">{error}</p>}
      </div>
    )
  }

  const isOwner = session.role === 'owner'
  const tabs = TABS.filter((t) => !t.ownerOnly || isOwner)

  return (
    <div className="container admin-page">
      <div className="admin-page__head">
        <h1>Админ-панель</h1>
        <div className="admin-page__head-user">
          <span>{session.username} · {isOwner ? 'владелец' : 'менеджер'}</span>
          <button type="button" className="btn btn-outline" onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      <div className="admin-page__tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-page__tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-page__body">
        {tab === 'dashboard' && <DashboardAdmin />}
        {tab === 'rentals' && <RentalsAdmin />}
        {tab === 'vehicles' && <VehiclesAdmin />}
        {tab === 'categories' && <CategoriesAdmin />}
        {tab === 'reviews' && <ReviewsAdmin />}
        {tab === 'users' && isOwner && <UsersAdmin currentUser={session.username} />}
        {tab === 'audit' && isOwner && <AuditAdmin />}
      </div>
    </div>
  )
}
