import { useState } from 'react'
import { getStoredToken, clearStoredToken, login } from '../../api/admin.js'
import VehiclesAdmin from './VehiclesAdmin.jsx'
import CategoriesAdmin from './CategoriesAdmin.jsx'
import RentalsAdmin from './RentalsAdmin.jsx'
import './AdminPage.css'

const TABS = [
  { id: 'vehicles', label: 'Машины' },
  { id: 'categories', label: 'Категории' },
  { id: 'rentals', label: 'Аренды' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getStoredToken())
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('vehicles')

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      setAuthed(true)
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    clearStoredToken()
    setAuthed(false)
  }

  if (!authed) {
    return (
      <div className="container admin-login">
        <h1>Админ-панель</h1>
        <form onSubmit={handleLogin} className="admin-login__form">
          <input
            type="password"
            placeholder="Пароль администратора"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !password}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
        {error && <p className="admin-login__error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="container admin-page">
      <div className="admin-page__head">
        <h1>Админ-панель</h1>
        <button type="button" className="btn btn-outline" onClick={handleLogout}>Выйти</button>
      </div>

      <div className="admin-page__tabs">
        {TABS.map((t) => (
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
        {tab === 'vehicles' && <VehiclesAdmin />}
        {tab === 'categories' && <CategoriesAdmin />}
        {tab === 'rentals' && <RentalsAdmin />}
      </div>
    </div>
  )
}
