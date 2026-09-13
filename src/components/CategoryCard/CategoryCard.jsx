import { Link } from 'react-router-dom'
import VehicleIcon from '../VehicleIcon/VehicleIcon.jsx'
import './CategoryCard.css'

export default function CategoryCard({ category, count }) {
  const isEmpty = count === 0

  return (
    <Link to={`/category/${category.id}`} className="cat-card" style={{ '--cat-color': category.color }}>
      <div className="cat-card__art">
        <VehicleIcon kind={category.kind} color={category.color} className="cat-card__icon" />
      </div>
      <div className="cat-card__body">
        <div className="cat-card__top">
          <h3>{category.label}</h3>
          <span className="cat-card__count mono">{count}</span>
        </div>
        <p>{isEmpty ? 'Парк на пополнении' : category.description}</p>
      </div>
    </Link>
  )
}
