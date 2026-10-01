import './Logo.css'

export default function Logo({ size = 'md' }) {
  return (
    <span className={`logo logo--${size}`}>
      <img src="/logo.png" alt="" width={65} height={65}/>
      <span className="logo__text">
        <span className="logo__word">FORWARD</span>
        <span className="logo__sub">AUTO&nbsp;RENT</span>
      </span>
    </span>
  )
}
