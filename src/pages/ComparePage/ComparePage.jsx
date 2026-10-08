import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import { fetchVehiclesByIds } from '../../api/vehicles.js'
import { useCompare } from '../../hooks/useLocalList.js'
import { formatMoney, seatsLabel, slotsLabel } from '../../utils/format.js'
import usePageMeta from '../../hooks/usePageMeta.js'

// best: 'min' | 'max' | undefined — какое числовое значение подсвечивать как лучшее.
const ROWS = [
  { label: 'Класс', value: (v) => v.class || '—' },
  { label: 'Цена / сутки', value: (v) => formatMoney(v.priceDay), num: (v) => v.priceDay, best: 'min' },
  { label: 'Залог', value: (v) => (v.deposit > 0 ? formatMoney(v.deposit) : 'нет'), num: (v) => v.deposit || 0, best: 'min' },
  { label: 'Макс. скорость', value: (v) => (v.topSpeed != null ? `${v.topSpeed} км/ч` : '—'), num: (v) => v.topSpeed, best: 'max' },
  { label: 'Мест в салоне', value: (v) => (v.seats != null ? seatsLabel(v.seats) : '—'), num: (v) => v.seats, best: 'max' },
  { label: 'Слоты под вещи', value: (v) => (v.trunkCapacity != null ? slotsLabel(v.trunkCapacity) : '—'), num: (v) => v.trunkCapacity, best: 'max' },
  { label: 'Рейтинг', value: (v) => `★ ${v.rating}${v.reviewsCount ? ` (${v.reviewsCount})` : ''}`, num: (v) => Number(v.rating), best: 'max' },
  { label: 'Стейджи', value: (v) => (v.stages.length ? v.stages.join(' → ') : 'Сток') },
  { label: 'Точка выдачи', value: (v) => v.location || '—' },
  { label: 'Сейчас', value: (v) => (v.busyNow ? 'В аренде' : 'Свободна') },
]

function bestIndexes(row, vehicles) {
  if (!row.num || vehicles.length < 2) return []
  const nums = vehicles.map(row.num)
  if (nums.some((n) => n == null)) return []
  const target = row.best === 'min' ? Math.min(...nums) : Math.max(...nums)
  if (nums.every((n) => n === target)) return []
  return nums.map((n, i) => (n === target ? i : -1)).filter((i) => i >= 0)
}

export default function ComparePage() {
  const cmp = useCompare()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  usePageMeta('Сравнение машин')
  const idsKey = cmp.list.join(',')

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    fetchVehiclesByIds(cmp.list)
      .then((v) => !cancelled && setVehicles(v))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, reloadKey])

  return (
    <section className="container list-page">
      <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Сравнение' }]} />

      <div className="list-page__head">
        <div>
          <h1>Сравнение машин</h1>
          <p>До трёх машин. Лучшие значения подсвечены зелёным.</p>
        </div>
        {cmp.list.length > 0 && (
          <div className="list-page__actions">
            <button type="button" className="btn btn-outline" onClick={cmp.clear}>Очистить</button>
          </div>
        )}
      </div>

      {failed ? (
        <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
      ) : cmp.list.length === 0 ? (
        <EmptyState
          title="Нечего сравнивать"
          text="Нажмите ⇄ на карточках двух-трёх машин — они появятся здесь рядом."
        />
      ) : loading ? (
        <p className="status-page__lead">Загружаем…</p>
      ) : (
        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                {vehicles.map((v) => (
                  <th key={v.id}>
                    <Link to={`/car/${v.id}`}>{v.brand} {v.model}</Link>
                    <button type="button" className="compare-table__remove" onClick={() => cmp.remove(v.id)}>
                      Убрать
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = bestIndexes(row, vehicles)
                return (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {vehicles.map((v, i) => (
                      <td key={v.id} className={best.includes(i) ? 'is-best' : ''}>{row.value(v)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
