import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import { formatMoney } from '../../utils/format.js'
import { daysBetween } from '../../utils/pricing.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

const STATUS_LABELS = { active: 'Активна', completed: 'Завершена', cancelled: 'Отменена' }
const COLUMNS = 10

export default function RentalsAdmin() {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await callAdminApi('rentals', 'list')
      setRentals(data)
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
    try {
      await callAdminApi('rentals', 'updateStatus', { id, status })
      load()
    } catch (e) {
      setError(e.message)
    }
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

  return (
    <div className="admin-section">
      {error && <p className="admin-error">{error}</p>}

      {!loading && rentals.length === 0 ? (
        <p className="mono">Пока нет ни одной заявки.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Машина</th>
              <th>Игрок</th>
              <th>ВК</th>
              <th>Обращение</th>
              <th>Даты аренды</th>
              <th>Дней</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Создана</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={COLUMNS} />
            ) : (
              rentals.map((r) => (
                <tr key={r.id}>
                  <td>{r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : '—'}</td>
                  <td>{r.game_nickname}</td>
                  <td>
                    <a href={r.vk_link} target="_blank" rel="noreferrer">открыть</a>
                  </td>
                  <td>{r.contact_name}</td>
                  <td className="mono">
                    {new Date(r.start_date).toLocaleDateString('ru-RU')} – {new Date(r.end_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="mono">{daysBetween(r.start_date, r.end_date) || '—'}</td>
                  <td className="mono">{r.price ? formatMoney(r.price) : '—'}</td>
                  <td>
                    <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="mono">{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                  <td>
                    <button type="button" className="btn btn-outline" onClick={() => handleDelete(r.id)}>Удалить</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
