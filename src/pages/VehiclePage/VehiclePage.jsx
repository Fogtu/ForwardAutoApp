import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import Gallery from '../../components/Gallery/Gallery.jsx'
import StagesList from '../../components/StagesList/StagesList.jsx'
import PriceTiers from '../../components/PriceTiers/PriceTiers.jsx'
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx'
import ReviewsList from '../../components/ReviewsList/ReviewsList.jsx'
import SkeletonVehiclePage from '../../components/SkeletonVehiclePage/SkeletonVehiclePage.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import NotFoundPage from '../NotFoundPage/NotFoundPage.jsx'
import { fetchVehicle } from '../../api/vehicles.js'
import { fetchCategoryById } from '../../api/categories.js'
import { fetchReviews } from '../../api/reviews.js'
import { formatMoney, formatDate, seatsLabel, slotsLabel, reviewsLabel } from '../../utils/format.js'
import { currentBusyUntil } from '../../utils/availability.js'
import { useFavorites, useCompare } from '../../hooks/useLocalList.js'
import usePageMeta from '../../hooks/usePageMeta.js'
import './VehiclePage.css'

export default function VehiclePage() {
  const { vehicleId } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [category, setCategory] = useState(null)
  const [reviews, setReviews] = useState([])
  const [status, setStatus] = useState('loading') // loading | ok | notFound | error
  const [reloadKey, setReloadKey] = useState(0)
  const fav = useFavorites()
  const cmp = useCompare()

  usePageMeta(
    vehicle ? `${vehicle.brand} ${vehicle.model} — аренда` : undefined,
    vehicle ? `${vehicle.class || ''} Аренда от ${formatMoney(vehicle.priceDay)} в сутки. Точка выдачи: ${vehicle.location || '—'}.` : undefined
  )

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    async function load() {
      try {
        const v = await fetchVehicle(vehicleId)
        if (!v) {
          if (!cancelled) setStatus('notFound')
          return
        }
        const [cat, revs] = await Promise.all([
          fetchCategoryById(v.category),
          fetchReviews(v.id).catch(() => []),
        ])
        if (!cancelled) {
          setVehicle(v)
          setCategory(cat)
          setReviews(revs)
          setStatus('ok')
        }
      } catch (e) {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [vehicleId, reloadKey])

  if (status === 'notFound') {
    return <NotFoundPage title="Машина не найдена" text="Возможно, её убрали из каталога. Посмотрите другие варианты." />
  }

  if (status === 'error') {
    return (
      <section className="container vehicle-page">
        <div className="vehicle-page__loading">
          <ErrorState title="Не удалось загрузить машину" onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      </section>
    )
  }

  if (status === 'loading' || !vehicle) {
    return (
      <section className="container vehicle-page">
        <div className="vehicle-page__loading">
          <SkeletonVehiclePage />
        </div>
      </section>
    )
  }

  const busyUntil = currentBusyUntil(vehicle.busy)
  const isFav = fav.has(vehicle.id)
  const inCompare = cmp.has(vehicle.id)

  return (
    <section className="container vehicle-page">
      <Breadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: category?.label, to: `/category/${category?.id}` },
          { label: `${vehicle.brand} ${vehicle.model}` },
        ]}
      />

      <div className="vehicle-page__layout">
        <div className="vehicle-page__gallery">
          <Gallery kind={category?.kind} color={category?.color} images={vehicle.images} />

          <div className="vehicle-page__section">
            <h2>Оснащение</h2>
            <ul className="vehicle-page__features">
              {vehicle.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="vehicle-page__section">
            <h2>Тарифы аренды</h2>
            <PriceTiers priceDay={vehicle.priceDay} tiers={vehicle.priceTiers} />
          </div>

          <div className="vehicle-page__section">
            <h2>Занятость</h2>
            <AvailabilityCalendar busy={vehicle.busy} />
          </div>

          <div className="vehicle-page__section">
            <h2>Установленные стейджи</h2>
            <StagesList stages={vehicle.stages} />
          </div>

          <div className="vehicle-page__section">
            <h2>Отзывы{vehicle.reviewsCount > 0 && ` · ${vehicle.reviewsCount}`}</h2>
            <ReviewsList reviews={reviews} />
          </div>
        </div>

        <aside className="vehicle-page__panel">
          <p className="vehicle-page__category" style={{ color: category?.color }}>{category?.label}</p>
          <h1 className="vehicle-page__title">{vehicle.brand} {vehicle.model}</h1>
          <p className="vehicle-page__class">{vehicle.class} · {vehicle.location}</p>

          <div className="vehicle-page__rating">
            <span className="mono">★ {vehicle.rating}</span>
            {vehicle.reviewsCount > 0 && (
              <span className="vehicle-page__rating-count">{reviewsLabel(vehicle.reviewsCount)}</span>
            )}
            <span>сдана в аренду {vehicle.rents} раз</span>
          </div>

          <p className="vehicle-page__price mono">
            от {formatMoney(vehicle.priceDay)}
            <span className="vehicle-page__price-unit"> / сутки</span>
          </p>

          {vehicle.deposit > 0 && (
            <p className="vehicle-page__deposit">
              Залог: <span className="mono">{formatMoney(vehicle.deposit)}</span>
              <span className="vehicle-page__deposit-note">
                возвращается, если машина возвращена целой
              </span>
            </p>
          )}

          {busyUntil && (
            <p className="vehicle-page__busy">
              Сейчас в аренде до {formatDate(busyUntil)}. Можно подать заявку на свободные даты — см. календарь.
            </p>
          )}

          <Link to={`/book/${vehicle.id}`} className="btn btn-primary vehicle-page__book">
            Забронировать
          </Link>

          <div className="vehicle-page__actions">
            <button type="button" className="btn btn-outline" onClick={() => fav.toggle(vehicle.id)} aria-pressed={isFav}>
              {isFav ? '♥ В избранном' : '♡ В избранное'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => cmp.toggle(vehicle.id)}
              aria-pressed={inCompare}
              disabled={!inCompare && cmp.isFull}
              title={!inCompare && cmp.isFull ? 'В сравнении уже 3 машины' : undefined}
            >
              {inCompare ? '✓ В сравнении' : '⇄ Сравнить'}
            </button>
          </div>

          <dl className="vehicle-page__specs">
            <div>
              <dt>Макс. скорость</dt>
              <dd className="mono">{vehicle.topSpeed} км/ч</dd>
            </div>
            <div>
              <dt>Мест в салоне</dt>
              <dd className="mono">{vehicle.seats != null ? seatsLabel(vehicle.seats) : '—'}</dd>
            </div>
            <div>
              <dt>Слоты под вещи</dt>
              <dd className="mono">{vehicle.trunkCapacity != null ? slotsLabel(vehicle.trunkCapacity) : '—'}</dd>
            </div>
            <div>
              <dt>Точка выдачи</dt>
              <dd>{vehicle.location}</dd>
            </div>
          </dl>

          <Link to={`/category/${category?.id}`} className="vehicle-page__back">
            ← Назад к категории «{category?.label}»
          </Link>
        </aside>
      </div>
    </section>
  )
}
