import { useState } from 'react'
import VehicleIcon from '../VehicleIcon/VehicleIcon.jsx'
import './Gallery.css'

// Настоящих фото нет — вместо этого несколько кадров одного силуэта
// с разным масштабом/сдвигом/светом, чтобы получить эффект фотогалереи.
const SHOTS = [
  { id: 'side', label: 'Сбоку', transform: 'scale(1)', tone: 0 },
  { id: 'front', label: 'Спереди', transform: 'scale(2.1) translate(-24%, 6%)', tone: 6 },
  { id: 'rear', label: 'Сзади', transform: 'scale(2.1) translate(24%, 6%) scaleX(-1)', tone: -6 },
  { id: 'detail', label: 'Деталь', transform: 'scale(3.4) translate(34%, 12%)', tone: 10 },
]

export default function Gallery({ kind, color }) {
  const [active, setActive] = useState(0)
  const shot = SHOTS[active]

  return (
    <div className="gallery">
      <div
        className="gallery__main"
        style={{ '--card-color': color, filter: `brightness(${1 + shot.tone / 100})` }}
      >
        <VehicleIcon kind={kind} color={color} className="gallery__svg" style={{ transform: shot.transform }} />
        <span className="gallery__tag mono">{shot.label}</span>
      </div>

      <div className="gallery__thumbs">
        {SHOTS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`gallery__thumb ${i === active ? 'is-active' : ''}`}
            style={{ '--card-color': color }}
            onClick={() => setActive(i)}
            aria-label={s.label}
          >
            <VehicleIcon kind={kind} color={color} className="gallery__thumb-svg" />
          </button>
        ))}
      </div>
    </div>
  )
}
