import './SkeletonBookingForm.css'

export default function SkeletonBookingForm() {
  return (
    <div className="skeleton-booking">
      <span className="skeleton-booking__title skeleton-shimmer" />
      <span className="skeleton-booking__subtitle skeleton-shimmer" />

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton-booking__field">
          <span className="skeleton-booking__field-label skeleton-shimmer" />
          <span className="skeleton-booking__field-input skeleton-shimmer" />
        </div>
      ))}

      <span className="skeleton-booking__period skeleton-shimmer" />
      <span className="skeleton-booking__price skeleton-shimmer" />
      <span className="skeleton-booking__button skeleton-shimmer" />
    </div>
  )
}
