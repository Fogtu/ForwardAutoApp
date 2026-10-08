import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import { Stars } from '../../components/ReviewsList/ReviewsList.jsx'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setReviews(await callAdminApi('reviews', 'list'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id) {
    if (!confirm('Удалить отзыв? Рейтинг машины пересчитается.')) return
    try {
      await callAdminApi('reviews', 'delete', { id })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="admin-section">
      <p className="admin-note">
        Отзывы оставляют клиенты после завершённой аренды (по номеру заявки). Рейтинг машины — среднее по ним.
      </p>
      {error && <p className="admin-error">{error}</p>}

      {!loading && reviews.length === 0 ? (
        <p className="mono">Отзывов пока нет.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Машина</th><th>Автор</th><th>Оценка</th><th>Отзыв</th><th>Дата</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : (
              reviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : '—'}</td>
                  <td>{r.author_name}</td>
                  <td><Stars value={r.rating} /></td>
                  <td className="admin-wrap">{r.comment || <span className="admin-muted">без текста</span>}</td>
                  <td className="mono">{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                  <td><button type="button" className="btn btn-outline" onClick={() => handleDelete(r.id)}>Удалить</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
