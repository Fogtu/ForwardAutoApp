import { Link } from 'react-router-dom'
import VehicleIcon from '../VehicleIcon/VehicleIcon.jsx'
import { formatMoney, slotsLabel } from '../../utils/format.js'
import { useFavorites, useCompare } from '../../hooks/useLocalList.js'
import './VehicleCard.css'

// category приходит снаружи (из БД) — карточка больше не зависит от статичного data/categories.js.
export default function VehicleCard({ vehicle, category }) {
  const fav = useFavorites()
  const cmp = useCompare()
  const isFav = fav.has(vehicle.id)
  const inCompare = cmp.has(vehicle.id)
  const color = category?.color || 'var(--cat-legkovoy)'

  return (
    <div className="v-card-wrap">
      <Link to={`/car/${vehicle.id}`} className="v-card">
        <div className="v-card__art" style={{ '--card-color': color }}>
          {vehicle.badge && <span className="v-card__badge">{vehicle.badge}</span>}
          {vehicle.busyNow && <span className="v-card__busy">В аренде</span>}
          {vehicle.images?.length > 0 ? (
            <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="v-card__photo" />
          ) : (
            <VehicleIcon kind={category?.kind} color={color} />
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

      <div className="v-card__actions">
        <button
          type="button"
          className={`icon-btn ${isFav ? 'is-on' : ''}`}
          onClick={() => fav.toggle(vehicle.id)}
          aria-pressed={isFav}
          title={isFav ? 'Убрать из избранного' : 'В избранное'}
        >
          {isFav ? '♥' : '♡'}
        </button>
        <button
          type="button"
          className={`icon-btn ${inCompare ? 'is-on' : ''}`}
          onClick={() => cmp.toggle(vehicle.id)}
          aria-pressed={inCompare}
          disabled={!inCompare && cmp.isFull}
          title={inCompare ? 'Убрать из сравнения' : cmp.isFull ? 'В сравнении уже 3 машины' : 'Сравнить'}
        >
          ⇄
        </button>
      </div>
    </div>
  )
}
