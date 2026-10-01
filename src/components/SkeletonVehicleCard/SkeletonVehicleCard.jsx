import './SkeletonVehicleCard.css'

// Повторяет форму VehicleCard, пока идёт запрос списка техники.
export default function SkeletonVehicleCard() {
  return (
    <div className="skeleton-vcard">
      <div className="skeleton-vcard__art skeleton-shimmer" />
      <div className="skeleton-vcard__body">
        <div className="skeleton-vcard__row">
          <span className="skeleton-vcard__title skeleton-shimmer" />
          <span className="skeleton-vcard__rating skeleton-shimmer" />
        </div>
        <span className="skeleton-vcard__meta skeleton-shimmer" />
        <div className="skeleton-vcard__specs">
          <span className="skeleton-shimmer" />
          <span className="skeleton-shimmer" />
        </div>
        <div className="skeleton-vcard__bottom">
          <span className="skeleton-vcard__price skeleton-shimmer" />
          <span className="skeleton-vcard__link skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}
