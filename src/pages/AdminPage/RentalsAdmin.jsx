import { useEffect, useMemo, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import { formatMoney } from '../../utils/format.js'
import { daysBetween } from '../../utils/pricing.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

const STATUS_LABELS = {
  pending: 'На рассмотрении',
  active: 'Одобрена',
  completed: 'Завершена',
  cancelled: 'Отменена',
  rejected: 'Отклонена',
}
const COLUMNS = 11

export default function RentalsAdmin() {
  const [rentals, setRentals] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setRentals(await callAdminApi('rentals', 'list'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleStatusChange(id, status) {
    setError(null)
    try {
      await callAdminApi('rentals', 'updateStatus', { id, status })
    } catch (e) {
      setError(e.message) // например, «даты уже заняты другой одобренной заявкой»
    }
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Удалить запись об аренде?')) return
    try {
      await callAdminApi('rentals', 'delete', { id })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const pendingCount = rentals.filter((r) => r.status === 'pending').length

  // Заявки на рассмотрении — наверху.
  const visible = useMemo(() => {
    const list = filter === 'all' ? rentals : rentals.filter((r) => r.status === filter)
    return [...list].sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
  }, [rentals, filter])

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label className="admin-note">
          Показать:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </label>
        {pendingCount > 0 && <span className="admin-note">Ждут решения: {pendingCount}</span>}
      </div>

      {error && <p className="admin-error">{error}</p>}

      {!loading && visible.length === 0 ? (
        <p className="mono">Заявок нет.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th><th>Машина</th><th>Игрок</th><th>ВК</th><th>Обращение</th>
              <th>Даты аренды</th><th>Дней</th><th>Цена</th><th>Статус</th><th>Создана</th><th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={COLUMNS} />
            ) : (
              visible.map((r) => {
                const overdue = r.status === 'active' && String(r.end_date).slice(0, 10) < today
                return (
                  <tr key={r.id} className={r.status === 'pending' ? 'is-pending' : ''}>
                    <td className="mono">{r.public_code}</td>
                    <td>{r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : '—'}</td>
                    <td>{r.game_nickname}</td>
                    <td><a href={r.vk_link} target="_blank" rel="noreferrer">открыть</a></td>
                    <td>{r.contact_name}</td>
                    <td className="mono">
                      {new Date(r.start_date).toLocaleDateString('ru-RU')} – {new Date(r.end_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="mono">{daysBetween(r.start_date, r.end_date) || '—'}</td>
                    <td className="mono">{r.price ? formatMoney(r.price) : '—'}</td>
                    <td>
                      {r.status === 'pending' ? (
                        <>
                          <button type="button" className="btn btn-outline btn-ok" onClick={() => handleStatusChange(r.id, 'active')}>Одобрить</button>
                          <button type="button" className="btn btn-outline btn-bad" onClick={() => handleStatusChange(r.id, 'rejected')}>Отклонить</button>
                        </>
                      ) : (
                        <>
                          <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}>
                            {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                          </select>
                          {overdue && (
                            <div>
                              <button type="button" className="btn btn-outline btn-ok" onClick={() => handleStatusChange(r.id, 'completed')}>
                                Срок вышел — завершить
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="mono">{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                    <td><button type="button" className="btn btn-outline" onClick={() => handleDelete(r.id)}>Удалить</button></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
