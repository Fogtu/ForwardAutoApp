import './Logo.css'

export default function Logo({ size = 'md' }) {
  return (
    <span className={`logo logo--${size}`}>
      <svg viewBox="0 0 64 40" className="logo__mark" aria-hidden="true">
        <path
          d="M4 30 C4 24 8 20 15 19 L24 18 L34 8 C36 5 40 3 44 3 L52 3 C55 3 57 6 56 9 L52 18 C58 19 60 23 60 28 L60 30 L4 30 Z"
          fill="none"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M22 18 L34 8" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="18" cy="30" r="3.2" fill="var(--text)" />
        <circle cx="48" cy="30" r="3.2" fill="var(--text)" />
      </svg>
      <span className="logo__text">
        <span className="logo__word">FORWARD</span>
        <span className="logo__sub">AUTO&nbsp;RENT</span>
      </span>
    </span>
  )
}
