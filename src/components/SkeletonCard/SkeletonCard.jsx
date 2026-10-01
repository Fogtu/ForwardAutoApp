import './SkeletonCard.css'

// Повторяет форму CategoryCard, пока идёт запрос к базе.
export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__art skeleton-shimmer" />
      <div className="skeleton-card__body">
        <div className="skeleton-card__row">
          <span className="skeleton-card__title skeleton-shimmer" />
          <span className="skeleton-card__count skeleton-shimmer" />
        </div>
        <span className="skeleton-card__text skeleton-shimmer" />
      </div>
    </div>
  )
}
