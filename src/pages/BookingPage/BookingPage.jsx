import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import SkeletonBookingForm from '../../components/SkeletonBookingForm/SkeletonBookingForm.jsx'
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import NotFoundPage from '../NotFoundPage/NotFoundPage.jsx'
import { fetchVehicle } from '../../api/vehicles.js'
import { fetchCategoryById } from '../../api/categories.js'
import { submitRentalRequest } from '../../api/rentals.js'
import { formatMoney } from '../../utils/format.js'
import { daysBetween, pricePerDayFor, totalPriceFor } from '../../utils/pricing.js'
import { isRangeFree, todayStr } from '../../utils/availability.js'
import usePageMeta from '../../hooks/usePageMeta.js'
import './BookingPage.css'

function daysWord(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'сутки'
  return 'суток'
}

export default function BookingPage() {
  const { vehicleId } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [category, setCategory] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | notFound | error
  const [reloadKey, setReloadKey] = useState(0)

  const [vkLink, setVkLink] = useState('')
  const [gameNickname, setGameNickname] = useState('')
  const [contactName, setContactName] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())

  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState(null)
  const [error, setError] = useState(null)

  usePageMeta('Заявка на аренду')

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
        const cat = await fetchCategoryById(v.category)
        if (!cancelled) {
          setVehicle(v)
          setCategory(cat)
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
    return <NotFoundPage title="Машина не найдена" text="Заявку на эту машину оформить нельзя — её нет в каталоге." />
  }

  if (status === 'error') {
    return (
      <section className="container booking-page">
        <div className="booking-page__loading">
          <ErrorState title="Не удалось загрузить форму заявки" onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      </section>
    )
  }

  if (status === 'loading' || !vehicle) {
    return (
      <section className="container booking-page">
        <div className="booking-page__loading">
          <div className="booking-page__layout">
            <SkeletonBookingForm />
          </div>
        </div>
      </section>
    )
  }

  const days = daysBetween(startDate, endDate)
  const datesValid = days > 0
  const datesFree = datesValid ? isRangeFree(vehicle.busy, startDate, endDate) : true
  const pricePerDay = datesValid ? pricePerDayFor(days, vehicle.priceTiers, vehicle.priceDay) : vehicle.priceDay
  const price = totalPriceFor(days, vehicle.priceTiers, vehicle.priceDay)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!datesValid) {
      setError('Дата окончания не может быть раньше даты начала')
      return
    }
    if (!datesFree) {
      setError('На выбранные даты машина занята — выберите свободные в календаре')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitRentalRequest({ vehicleId: vehicle.id, vkLink, gameNickname, contactName, startDate, endDate })
      setCode(res.code)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (code) {
    return (
      <section className="container booking-page">
        <div className="booking-page__done">
          <h1>Заявка подана</h1>
          <p>
            Заявка на «{vehicle.brand} {vehicle.model}» отправлена и ждёт решения администратора —
            обычно в течение суток. Машина закрепится за вами после одобрения. Мы свяжемся с вами через ВК.
          </p>
          <p>Номер заявки — сохраните его, чтобы проверить статус:</p>
          <span className="booking-page__code">{code}</span>
          <Link to={`/status/${code}`} className="btn btn-primary">Проверить статус</Link>
          <Link to={`/car/${vehicle.id}`} className="btn btn-outline">Назад к машине</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="container booking-page">
      <Breadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: category?.label, to: `/category/${category?.id}` },
          { label: `${vehicle.brand} ${vehicle.model}`, to: `/car/${vehicle.id}` },
          { label: 'Заявка на аренду' },
        ]}
      />

      <div className="booking-page__layout">
        <form onSubmit={handleSubmit} className="booking-form">
          <h1>Заявка на аренду</h1>
          <p className="booking-form__vehicle">{vehicle.brand} {vehicle.model} · {vehicle.class}</p>

          <label className="booking-form__field">
            Ссылка на ВК
            <input type="url" required placeholder="https://vk.com/id..." value={vkLink} onChange={(e) => setVkLink(e.target.value)} />
          </label>

          <label className="booking-form__field">
            Игровое имя
            <input type="text" required placeholder="Ник в игре" value={gameNickname} onChange={(e) => setGameNickname(e.target.value)} />
          </label>

          <label className="booking-form__field">
            Как к вам обращаться
            <input type="text" required placeholder="Имя" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </label>

          <div className="booking-form__dates">
            <label className="booking-form__field">
              С какой даты
              <input
                type="date"
                required
                min={todayStr()}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value > endDate) setEndDate(e.target.value)
                }}
              />
            </label>
            <label className="booking-form__field">
              По какую дату
              <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <AvailabilityCalendar busy={vehicle.busy} selected={datesValid ? { start: startDate, end: endDate } : undefined} />

          {!datesFree && (
            <p className="booking-form__conflict">
              На эти даты машина уже занята. Выберите свободные дни — занятые перечёркнуты в календаре.
            </p>
          )}

          {datesValid ? (
            <div className="booking-form__price-breakdown">
              <span>
                {days} {daysWord(days)} × <span className="mono">{formatMoney(pricePerDay)}</span>
              </span>
              <p className="booking-form__price mono">{formatMoney(price)}</p>
            </div>
          ) : (
            <p className="booking-form__error">Выберите корректный диапазон дат</p>
          )}

          {vehicle.deposit > 0 && (
            <p className="booking-form__deposit">
              + залог <span className="mono">{formatMoney(vehicle.deposit)}</span> — возвращается,
              если машина возвращена целой; при повреждении остаётся у владельца в счёт компенсации.
            </p>
          )}

          {error && <p className="booking-form__error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting || !datesValid || !datesFree}>
            {submitting ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </form>
      </div>
    </section>
  )
}
