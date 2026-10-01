import { formatMoney } from '../../utils/format.js'
import './PriceTiers.css'

function rangeLabel(minDays, maxDays) {
  if (maxDays == null) return `от ${minDays} дней`
  if (minDays === maxDays) return `${minDays} ${minDays === 1 ? 'день' : 'дней'}`
  return `${minDays}–${maxDays} дней`
}

// tiers — массив { minDays, maxDays, pricePerDay }. Если тарифов нет,
// показываем единственную строку по обычной цене за сутки.
export default function PriceTiers({ priceDay, tiers }) {
  const rows = tiers && tiers.length > 0
    ? tiers
    : [{ minDays: 1, maxDays: null, pricePerDay: priceDay }]

  return (
    <ul className="price-tiers">
      {rows.map((t, i) => (
        <li key={i} className="price-tiers__row">
          <span className="price-tiers__range">{rangeLabel(t.minDays, t.maxDays)}</span>
          <span className="price-tiers__price mono">{formatMoney(t.pricePerDay)} / сутки</span>
        </li>
      ))}
    </ul>
  )
}
