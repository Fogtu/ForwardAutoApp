import { formatMoney } from '../../utils/format.js'
import './StagesList.css'

export default function StagesList({ stages }) {
  if (!stages || stages.length === 0) {
    return <p className="stages-empty">Тюнинг недоступен для этого класса техники.</p>
  }

  return (
    <ul className="stages">
      {stages.map((stage, i) => (
        <li key={stage.name} className="stages__row">
          <span className="stages__index mono">{String(i + 1).padStart(2, '0')}</span>
          <span className="stages__name">{stage.name}</span>
          <span className="stages__price mono">{formatMoney(stage.price)}</span>
        </li>
      ))}
    </ul>
  )
}
