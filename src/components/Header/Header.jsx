import { NavLink, Link } from 'react-router-dom'
import Logo from '../Logo/Logo.jsx'
import { useFavorites, useCompare } from '../../hooks/useLocalList.js'
import './Header.css'

const linkClass = ({ isActive }) => (isActive ? 'is-active' : '')

export default function Header() {
  const fav = useFavorites()
  const cmp = useCompare()

  return (
    <header className="header">
      <div className="container header__row">
        <Link to="/" className="header__logo">
          <Logo />
        </Link>

        <nav className="header__nav">
          <NavLink to="/" end className={linkClass}>Категории</NavLink>
          <NavLink to="/favorites" className={linkClass}>
            Избранное{fav.list.length > 0 && <span className="header__count mono">{fav.list.length}</span>}
          </NavLink>
          <NavLink to="/compare" className={linkClass}>
            Сравнение{cmp.list.length > 0 && <span className="header__count mono">{cmp.list.length}</span>}
          </NavLink>
          <NavLink to="/status" className={linkClass}>Статус заявки</NavLink>
          <NavLink to="/rules" className={linkClass}>Правила</NavLink>
        </nav>

        <span className="header__server mono">MTA PROVINCE #6</span>
      </div>
    </header>
  )
}
