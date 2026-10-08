import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import { formatMoney } from '../../utils/format.js'

const PERIODS = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
  { days: 0, label: 'Всё время' },
]

export default function DashboardAdmin() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    callAdminApi('stats', 'get', { days })
      .then((s) => !cancelled && setStats(s))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [days])

  const maxRevenue = stats?.top?.[0]?.revenue || 1

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label className="admin-note">
          Период:{' '}
          <select value={days} onChange={(e) => { setStats(null); setDays(Number(e.target.value)) }}>
            {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
          </select>
        </label>
        <span className="admin-note">Считаются одобренные и завершённые аренды по дате их начала.</span>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {!stats && !error && <p className="admin-note">Считаем…</p>}

      {stats && (
        <>
          <dl className="admin-stats">
            <div className="admin-stat"><dt>Выручка</dt><dd>{formatMoney(stats.revenue)}</dd><small>средний чек {formatMoney(stats.avgCheck)}</small></div>
            <div className="admin-stat"><dt>Аренд</dt><dd>{stats.rentalsCount}</dd><small>из них завершено {stats.completedCount}</small></div>
            <div className="admin-stat"><dt>Загрузка парка</dt><dd>{stats.utilization}%</dd><small>за {stats.windowDays} дн.</small></div>
            <div className="admin-stat"><dt>Ждут решения</dt><dd>{stats.pendingNow}</dd><small>заявок на рассмотрении</small></div>
          </dl>

          <table className="admin-table">
            <thead>
              <tr><th>Самые доходные машины</th><th>Аренд</th><th>Суток</th><th>Выручка</th><th /></tr>
            </thead>
            <tbody>
              {stats.top.length === 0 ? (
                <tr><td colSpan={5} className="admin-muted">За этот период аренд не было.</td></tr>
              ) : (
                stats.top.map((v) => (
                  <tr key={v.vehicleId}>
                    <td>{v.name}</td>
                    <td className="mono">{v.rentals}</td>
                    <td className="mono">{v.days}</td>
                    <td className="mono">{formatMoney(v.revenue)}</td>
                    <td><div className="admin-bar"><span style={{ width: `${Math.round((v.revenue / maxRevenue) * 100)}%` }} /></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
