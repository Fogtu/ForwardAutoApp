import './FilterPanel.css'

const SORT_OPTIONS = [
  { id: 'popular', label: 'По популярности' },
  { id: 'price-asc', label: 'Сначала дешевле' },
  { id: 'price-desc', label: 'Сначала дороже' },
  { id: 'rating-desc', label: 'По рейтингу' },
]

export default function FilterPanel({ filters, setFilters, priceBounds, resultCount }) {
  const priceMin = filters.priceMin || priceBounds.min
  const priceMax = filters.priceMax === Infinity ? priceBounds.max : filters.priceMax

  return (
    <div className="filter-bar">
      <label className="filter-bar__search">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--text-faint)" strokeWidth="1.4" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Поиск по марке или модели"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </label>

      <div className="filter-bar__price">
        <span className="filter-bar__price-label mono">
          {priceMin.toLocaleString('ru-RU')}–{priceMax.toLocaleString('ru-RU')} ₽
        </span>
        <div className="filter-bar__range">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={priceBounds.step}
            value={priceMin}
            onChange={(e) => {
              const value = Math.min(Number(e.target.value), priceMax - priceBounds.step)
              setFilters((f) => ({ ...f, priceMin: value }))
            }}
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={priceBounds.step}
            value={priceMax}
            onChange={(e) => {
              const value = Math.max(Number(e.target.value), priceMin + priceBounds.step)
              setFilters((f) => ({ ...f, priceMax: value }))
            }}
          />
        </div>
      </div>

      <label className="filter-bar__sort">
        <span>Сортировка</span>
        <select value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </label>

      <span className="filter-bar__count mono">{resultCount}</span>
    </div>
  )
}
