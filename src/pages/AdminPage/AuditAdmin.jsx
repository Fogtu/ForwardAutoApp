import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

function short(details) {
  if (!details) return ''
  const s = JSON.stringify(details)
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

export default function AuditAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await callAdminApi('audit', 'list'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <span className="admin-note">Последние 200 действий: входы, изменения машин, статусы заявок (в том числе из Telegram).</span>
        <button type="button" className="btn btn-outline" onClick={load}>Обновить</button>
      </div>
      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Детали</th></tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonTableRows columns={5} />
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                <td>{r.username}</td>
                <td className="mono">{r.action}</td>
                <td className="mono">{r.target || '—'}</td>
                <td className="admin-wrap admin-muted">{short(r.details)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
