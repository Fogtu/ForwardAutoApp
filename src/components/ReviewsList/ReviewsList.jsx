import { formatDate } from '../../utils/format.js'

export function Stars({ value }) {
  const n = Math.round(value)
  return <span className="stars" aria-label={`${n} из 5`}>{'★'.repeat(n)}<span className="stars__off">{'★'.repeat(5 - n)}</span></span>
}

export default function ReviewsList({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return <p className="stages-empty">Отзывов пока нет — они появляются после завершённых аренд.</p>
  }
  return (
    <ul className="reviews">
      {reviews.map((r) => (
        <li key={r.id} className="reviews__item">
          <div className="reviews__head">
            <strong>{r.author_name}</strong>
            <Stars value={r.rating} />
            <span className="reviews__date mono">{formatDate(r.created_at)}</span>
          </div>
          {r.comment && <p>{r.comment}</p>}
        </li>
      ))}
    </ul>
  )
}
