import './StagesList.css'

const STAGE_DESCRIPTIONS = {
  'База': 'Базовая комплектация двигателя',
  'Баланс': 'Настройка развесовки и устойчивости',
  'Скорость': 'Форсирование двигателя',
  'Управление': 'Улучшенная подвеска и рулевое',
}

// stages — простой массив категорий в порядке установки, напр.
// ['База', 'Скорость', 'Скорость', 'Управление']. Категории могут
// повторяться. Пустой массив = машина в стоковой комплектации.
export default function StagesList({ stages }) {
  if (!stages || stages.length === 0) {
    return <p className="stages-empty">Машина в стоковой комплектации — дополнительных стейджей не установлено.</p>
  }

  return (
    <ul className="stages">
      {stages.map((category, i) => (
        <li key={`${category}-${i}`} className="stages__row">
          <span className="stages__index mono">{String(i + 1).padStart(2, '0')}</span>
          <span className="stages__name">{category}</span>
          <span className="stages__desc">{STAGE_DESCRIPTIONS[category] || ''}</span>
        </li>
      ))}
    </ul>
  )
}
