import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import SkeletonBookingForm from '../../components/SkeletonBookingForm/SkeletonBookingForm.jsx'
import { fetchVehicle } from '../../api/vehicles.js'
import { fetchCategoryById } from '../../api/categories.js'
import { submitRentalRequest } from '../../api/rentals.js'
import { formatMoney } from '../../utils/format.js'
import { daysBetween, pricePerDayFor, totalPriceFor } from '../../utils/pricing.js'
import './BookingPage.css'

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysWord(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'сутки'
  return 'суток'
}

export default function BookingPage() {
  const { vehicleId } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [vkLink, setVkLink] = useState('')
  const [gameNickname, setGameNickname] = useState('')
  const [contactName, setContactName] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const v = await fetchVehicle(vehicleId)
        if (!v) {
          if (!cancelled) setNotFound(true)
          return
        }
        const cat = await fetchCategoryById(v.category)
        if (!cancelled) {
          setVehicle(v)
          setCategory(cat)
        }
      } catch (e) {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [vehicleId])

  if (notFound) {
    return <Navigate to="/" replace />
  }

  if (loading || !vehicle) {
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

  // Машину уже забронировали, пока мы грузили страницу, или она занята
  // с самого начала — форму не показываем вовсе.
  if (vehicle.isRented) {
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
        <div className="booking-page__done">
          <h1>Машина сейчас недоступна</h1>
          <p>
            «{vehicle.brand} {vehicle.model}» уже в аренде у другого игрока. Загляните
            позже — как только машина освободится, бронь снова станет доступна.
          </p>
          <Link to={`/car/${vehicle.id}`} className="btn btn-outline">Назад к машине</Link>
        </div>
      </section>
    )
  }

  const days = daysBetween(startDate, endDate)
  const datesValid = days > 0
  const pricePerDay = datesValid ? pricePerDayFor(days, vehicle.priceTiers, vehicle.priceDay) : vehicle.priceDay
  const price = totalPriceFor(days, vehicle.priceTiers, vehicle.priceDay)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!datesValid) {
      setError('Дата окончания не может быть раньше даты начала')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitRentalRequest({ vehicleId: vehicle.id, vkLink, gameNickname, contactName, startDate, endDate })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section className="container booking-page">
        <div className="booking-page__done">
          <h1>Заявка подана</h1>
          <p>
            Ваша заявка на аренду «{vehicle.brand} {vehicle.model}» отправлена и будет
            рассмотрена в течение суток, а часто и быстрее. Мы свяжемся с вами через ВК.
          </p>
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
            <input
              type="url"
              required
              placeholder="https://vk.com/id..."
              value={vkLink}
              onChange={(e) => setVkLink(e.target.value)}
            />
          </label>

          <label className="booking-form__field">
            Игровое имя
            <input
              type="text"
              required
              placeholder="Ник в игре"
              value={gameNickname}
              onChange={(e) => setGameNickname(e.target.value)}
            />
          </label>

          <label className="booking-form__field">
            Как к вам обращаться
            <input
              type="text"
              required
              placeholder="Имя"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
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
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

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

          <button type="submit" className="btn btn-primary" disabled={submitting || !datesValid}>
            {submitting ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </form>
      </div>
    </section>
  )
}
