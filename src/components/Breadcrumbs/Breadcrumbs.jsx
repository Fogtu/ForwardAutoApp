import { Link } from 'react-router-dom'
import './Breadcrumbs.css'

export default function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Хлебные крошки">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={item.label} className="crumbs__item">
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            {!isLast && <span className="crumbs__sep">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
