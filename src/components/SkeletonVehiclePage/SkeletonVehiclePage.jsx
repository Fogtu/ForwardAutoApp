import './SkeletonVehiclePage.css'

// Полноразмерный скелетон vehicle-page__layout: галерея + оснащение слева,
// карточка бронирования справа.
export default function SkeletonVehiclePage() {
  return (
    <div className="skeleton-vpage">
      <div className="skeleton-vpage__gallery">
        <div className="skeleton-vpage__main skeleton-shimmer" />
        <div className="skeleton-vpage__thumbs">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-vpage__thumb skeleton-shimmer" />
          ))}
        </div>

        <div className="skeleton-vpage__section">
          <span className="skeleton-vpage__heading skeleton-shimmer" />
          <div className="skeleton-vpage__lines">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="skeleton-shimmer" />
            ))}
          </div>
        </div>

        <div className="skeleton-vpage__section">
          <span className="skeleton-vpage__heading skeleton-shimmer" />
          <div className="skeleton-vpage__lines">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>

      <div className="skeleton-vpage__panel">
        <span className="skeleton-vpage__label skeleton-shimmer" />
        <span className="skeleton-vpage__title skeleton-shimmer" />
        <span className="skeleton-vpage__class skeleton-shimmer" />
        <span className="skeleton-vpage__rating skeleton-shimmer" />
        <span className="skeleton-vpage__period skeleton-shimmer" />
        <span className="skeleton-vpage__price skeleton-shimmer" />
        <span className="skeleton-vpage__button skeleton-shimmer" />
        <div className="skeleton-vpage__specs">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  )
}
