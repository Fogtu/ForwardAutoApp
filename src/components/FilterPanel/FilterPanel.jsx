import { EMPTY_FILTERS } from '../../utils/filterVehicles.js'
import './FilterPanel.css'

const SORT_OPTIONS = [
  { id: 'popular', label: 'По популярности' },
  { id: 'price-asc', label: 'Сначала дешевле' },
  { id: 'price-desc', label: 'Сначала дороже' },
  { id: 'rating-desc', label: 'По рейтингу' },
  { id: 'speed-desc', label: 'По скорости' },
  { id: 'deposit-asc', label: 'Сначала меньший залог' },
]

const SEAT_OPTIONS = [2, 4, 5, 7]

export default function FilterPanel({ filters, setFilters, priceBounds, resultCount, options = { classes: [], locations: [] } }) {
  const priceMin = filters.priceMin || priceBounds.min
  const priceMax = filters.priceMax === Infinity ? priceBounds.max : filters.priceMax
  const patch = (p) => setFilters((f) => ({ ...f, ...p }))
  const hasExtra = filters.vehicleClass || filters.location || filters.minSeats || filters.onlyFree

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
          onChange={(e) => patch({ search: e.target.value })}
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
            onChange={(e) => patch({ priceMin: Math.min(Number(e.target.value), priceMax - priceBounds.step) })}
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            step={priceBounds.step}
            value={priceMax}
            onChange={(e) => patch({ priceMax: Math.max(Number(e.target.value), priceMin + priceBounds.step) })}
          />
        </div>
      </div>

      <label className="filter-bar__sort">
        <span>Сортировка</span>
        <select value={filters.sortBy} onChange={(e) => patch({ sortBy: e.target.value })}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </label>

      <span className="filter-bar__count mono">{resultCount}</span>

      <div className="filter-bar__extra">
        {options.classes.length > 1 && (
          <select value={filters.vehicleClass} onChange={(e) => patch({ vehicleClass: e.target.value })} aria-label="Класс">
            <option value="">Все классы</option>
            {options.classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {options.locations.length > 1 && (
          <select value={filters.location} onChange={(e) => patch({ location: e.target.value })} aria-label="Точка выдачи">
            <option value="">Все точки выдачи</option>
            {options.locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        <select value={filters.minSeats} onChange={(e) => patch({ minSeats: Number(e.target.value) })} aria-label="Мест в салоне">
          <option value={0}>Любое число мест</option>
          {SEAT_OPTIONS.map((n) => <option key={n} value={n}>от {n} мест</option>)}
        </select>
        <label className="filter-bar__check">
          <input type="checkbox" checked={filters.onlyFree} onChange={(e) => patch({ onlyFree: e.target.checked })} />
          Только свободные сейчас
        </label>
        {hasExtra && (
          <button type="button" className="filter-bar__reset" onClick={() => setFilters({ ...EMPTY_FILTERS, search: filters.search, sortBy: filters.sortBy })}>
            Сбросить
          </button>
        )}
      </div>
    </div>
  )
}
