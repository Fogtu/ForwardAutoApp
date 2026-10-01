import { Link } from 'react-router-dom'
import VehicleIcon from '../VehicleIcon/VehicleIcon.jsx'
import { formatMoney, slotsLabel } from '../../utils/format.js'
import { getCategory } from '../../data/categories.js'
import './VehicleCard.css'

export default function VehicleCard({ vehicle }) {
  const category = getCategory(vehicle.category)

  return (
    <Link to={`/car/${vehicle.id}`} className="v-card">
      <div className="v-card__art" style={{ '--card-color': category?.color }}>
        {vehicle.badge && <span className="v-card__badge">{vehicle.badge}</span>}
        {vehicle.images?.length > 0 ? (
          <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="v-card__photo" />
        ) : (
          <VehicleIcon kind={category?.kind} color={category?.color} />
        )}
      </div>

      <div className="v-card__body">
        <div className="v-card__top">
          <h3>{vehicle.brand} {vehicle.model}</h3>
          <span className="v-card__rating mono">★ {vehicle.rating}</span>
        </div>
        <p className="v-card__meta">{vehicle.class} · {vehicle.location}</p>

        <ul className="v-card__specs mono">
          <li>{vehicle.topSpeed} км/ч</li>
          {vehicle.trunkCapacity != null && <li>багажник: {slotsLabel(vehicle.trunkCapacity)}</li>}
        </ul>

        <div className="v-card__bottom">
          <p className="v-card__price">
            <span className="mono">{formatMoney(vehicle.priceDay)}</span>
            <span className="v-card__price-unit"> / сутки</span>
          </p>
          <span className="v-card__link">Подробнее</span>
        </div>
      </div>
    </Link>
  )
}
