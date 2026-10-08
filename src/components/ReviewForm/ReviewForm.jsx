import { useState } from 'react'
import { submitReview } from '../../api/rentals.js'

export default function ReviewForm({ code, onDone }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await submitReview({ code, rating, comment: comment.trim() })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Оставьте отзыв</h3>
      <div className="review-form__stars" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            className={n <= rating ? 'is-on' : ''}
            onClick={() => setRating(n)}
            aria-label={`${n} из 5`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        placeholder="Как прошла аренда? (необязательно)"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="booking-form__error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Отправляем…' : 'Отправить отзыв'}
      </button>
    </form>
  )
}
