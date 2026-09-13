import { Link } from 'react-router-dom'
import Logo from '../Logo/Logo.jsx'
import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="container header__row">
        <Link to="/" className="header__logo">
          <Logo />
        </Link>

        <nav className="header__nav">
          <Link to="/">Категории</Link>
          <a href="#" onClick={(e) => e.preventDefault()}>Правила сервера</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Поддержка</a>
        </nav>

        <span className="header__server mono">MTA PROVINCE #6</span>
      </div>
    </header>
  )
}
