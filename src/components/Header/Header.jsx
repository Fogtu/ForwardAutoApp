import { NavLink, Link } from 'react-router-dom'
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
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Категории
          </NavLink>
          <NavLink to="/rules" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Правила
          </NavLink>
        </nav>

        <span className="header__server mono">MTA PROVINCE #6</span>
      </div>
    </header>
  )
}
