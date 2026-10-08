import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

const EMPTY = { username: '', password: '', role: 'manager' }

export default function UsersAdmin({ currentUser }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setUsers(await callAdminApi('users', 'list'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    try {
      await callAdminApi('users', 'create', form)
      setInfo(`Пользователь «${form.username}» создан.`)
      setForm(EMPTY)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSetPassword(u) {
    const password = prompt(`Новый пароль для «${u.username}» (от 8 символов):`)
    if (!password) return
    setError(null)
    setInfo(null)
    try {
      await callAdminApi('users', 'setPassword', { id: u.id, password })
      setInfo(`Пароль «${u.username}» изменён, его активные сессии завершены.`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Удалить пользователя «${u.username}»?`)) return
    setError(null)
    try {
      await callAdminApi('users', 'delete', { id: u.id })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-section">
      <form className="admin-inline-form" onSubmit={handleCreate}>
        <input
          placeholder="Логин (латиница, 3–32)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Пароль (от 8 символов)"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
        />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="manager">Менеджер</option>
          <option value="owner">Владелец</option>
        </select>
        <button type="submit" className="btn btn-primary">Создать</button>
      </form>

      <p className="admin-note">
        Менеджер работает с машинами, заявками и отзывами. Владелец дополнительно управляет пользователями и видит журнал.
      </p>
      {error && <p className="admin-error">{error}</p>}
      {info && <p className="admin-note">{info}</p>}

      <table className="admin-table">
        <thead>
          <tr><th>Логин</th><th>Роль</th><th>Создан</th><th /></tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonTableRows columns={4} />
          ) : (
            users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}{u.username === currentUser && <span className="admin-muted"> (вы)</span>}</td>
                <td>{u.role === 'owner' ? 'Владелец' : 'Менеджер'}</td>
                <td className="mono">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                  <button type="button" className="btn btn-outline" onClick={() => handleSetPassword(u)}>Сменить пароль</button>
                  {u.username !== currentUser && (
                    <button type="button" className="btn btn-outline btn-bad" onClick={() => handleDelete(u)}>Удалить</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
