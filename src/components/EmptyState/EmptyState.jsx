import './EmptyState.css'

export default function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="23" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        <path d="M15 24 L33 24 M24 15 L24 33" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" transform="rotate(45 24 24)" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {actionLabel && (
        <button type="button" className="btn btn-outline" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
