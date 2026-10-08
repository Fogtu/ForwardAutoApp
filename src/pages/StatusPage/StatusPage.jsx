import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import ReviewForm from '../../components/ReviewForm/ReviewForm.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import { fetchRentalStatus } from '../../api/rentals.js'
import { formatDate, formatMoney } from '../../utils/format.js'
import { daysBetween } from '../../utils/pricing.js'
import usePageMeta from '../../hooks/usePageMeta.js'

const STATUSES = {
  pending: { label: 'На рассмотрении', hint: 'Администратор ещё не принял решение. Обычно это занимает до суток — загляните позже или дождитесь сообщения в ВК.' },
  active: { label: 'Одобрена', hint: 'Заявка одобрена, машина закреплена за вами на выбранные даты. Детали выдачи пришлём в ВК.' },
  completed: { label: 'Завершена', hint: 'Аренда завершена. Спасибо, что выбрали Forward Auto Rent!' },
  cancelled: { label: 'Отменена', hint: 'Заявка отменена. Если это вышло случайно — напишите нам в сообщество ВК.' },
  rejected: { label: 'Отклонена', hint: 'К сожалению, заявку отклонили. Можно подать новую на другие даты или другую машину.' },
}

export default function StatusPage() {
  const { code: codeParam } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(codeParam || '')
  const [rental, setRental] = useState(null)
  const [phase, setPhase] = useState(codeParam ? 'loading' : 'idle') // idle | loading | ok | missing | error
  const [reloadKey, setReloadKey] = useState(0)
  const [reviewed, setReviewed] = useState(false)

  usePageMeta('Статус заявки')

  useEffect(() => {
    if (!codeParam) {
      setPhase('idle')
      setRental(null)
      return
    }
    let cancelled = false
    setPhase('loading')
    setReviewed(false)

    fetchRentalStatus(codeParam)
      .then((r) => {
        if (cancelled) return
        setRental(r)
        setPhase(r ? 'ok' : 'missing')
      })
      .catch(() => {
        if (!cancelled) setPhase('error')
      })

    return () => {
      cancelled = true
    }
  }, [codeParam, reloadKey])

  function handleSubmit(e) {
    e.preventDefault()
    const c = input.trim().toUpperCase()
    if (!c) return
    if (c === codeParam) setReloadKey((k) => k + 1)
    else navigate(`/status/${c}`)
  }

  const info = rental ? STATUSES[rental.status] || { label: rental.status, hint: '' } : null

  return (
    <section className="container status-page">
      <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Статус заявки' }]} />

      <div className="status-page__layout">
        <h1>Статус заявки</h1>
        <p className="status-page__lead">Введите номер, который вы получили после отправки заявки.</p>

        <form className="status-lookup" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например, A1B2C3D4E5"
            maxLength={20}
            aria-label="Номер заявки"
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim()}>Найти</button>
        </form>

        {phase === 'loading' && <p className="status-page__lead">Ищем заявку…</p>}

        {phase === 'missing' && (
          <p className="booking-form__error">Заявка с таким номером не найдена. Проверьте, что номер введён без ошибок.</p>
        )}

        {phase === 'error' && <ErrorState title="Не удалось проверить статус" onRetry={() => setReloadKey((k) => k + 1)} />}

        {phase === 'ok' && rental && (
          <div className="status-card">
            <div className="status-card__head">
              <span className={`status-badge is-${rental.status}`}>{info.label}</span>
              <span className="status-card__code mono">№ {rental.code}</span>
            </div>
            <h2>{rental.brand ? `${rental.brand} ${rental.model}` : 'Машина удалена из каталога'}</h2>
            <p className="status-card__hint">{info.hint}</p>

            <dl>
              <div><dt>Даты аренды</dt><dd className="mono">{formatDate(rental.start_date)} – {formatDate(rental.end_date)}</dd></div>
              <div><dt>Суток</dt><dd className="mono">{daysBetween(rental.start_date, rental.end_date)}</dd></div>
              <div><dt>Стоимость</dt><dd className="mono">{rental.price ? formatMoney(rental.price) : '—'}</dd></div>
              <div><dt>Подана</dt><dd className="mono">{formatDate(rental.created_at)}</dd></div>
            </dl>

            {rental.vehicle_id && rental.status !== 'rejected' && rental.status !== 'cancelled' && (
              <Link to={`/car/${rental.vehicle_id}`} className="btn btn-outline">Страница машины</Link>
            )}

            {rental.status === 'completed' && rental.vehicle_id && !rental.has_review && !reviewed && (
              <ReviewForm code={rental.code} onDone={() => setReviewed(true)} />
            )}
            {(rental.has_review || reviewed) && rental.status === 'completed' && (
              <p className="status-card__hint">Спасибо за отзыв — он уже на странице машины.</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
