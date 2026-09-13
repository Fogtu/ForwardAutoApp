import { useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import FilterPanel from '../../components/FilterPanel/FilterPanel.jsx'
import VehicleGrid from '../../components/VehicleGrid/VehicleGrid.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import VehicleIcon from '../../components/VehicleIcon/VehicleIcon.jsx'
import { getCategory } from '../../data/categories.js'
import { getVehiclesByCategory } from '../../data/vehicles.js'
import { EMPTY_FILTERS, filterVehicles } from '../../utils/filterVehicles.js'
import './CategoryPage.css'

export default function CategoryPage() {
  const { categoryId } = useParams()
  const category = getCategory(categoryId)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const allVehicles = useMemo(() => getVehiclesByCategory(categoryId), [categoryId])

  const priceBounds = useMemo(() => {
    if (allVehicles.length === 0) return { min: 0, max: 1000, step: 100 }
    const prices = allVehicles.map((v) => v.priceDay)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { min, max, step: Math.max(100, Math.round((max - min) / 20 / 100) * 100) || 100 }
  }, [allVehicles])

  const filteredVehicles = useMemo(
    () => filterVehicles(allVehicles, filters),
    [allVehicles, filters]
  )

  if (!category) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="container category-page">
      <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: category.label }]} />

      <div className="category-page__head" style={{ '--cat-color': category.color }}>
        <div className="category-page__icon">
          <VehicleIcon kind={category.kind} color={category.color} />
        </div>
        <div>
          <h1>{category.label}</h1>
          <p>{category.description}</p>
        </div>
      </div>

      {allVehicles.length === 0 ? (
        <EmptyState
          title="Парк этой категории пока пуст"
          text="Мы обновляем каталог — новая техника появится в ближайших патчах сервера."
        />
      ) : (
        <>
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            priceBounds={priceBounds}
            resultCount={filteredVehicles.length}
          />

          {filteredVehicles.length === 0 ? (
            <EmptyState
              title="По этим условиям ничего нет"
              text="Попробуйте расширить диапазон цены или изменить запрос."
              actionLabel="Сбросить фильтры"
              onAction={() => setFilters(EMPTY_FILTERS)}
            />
          ) : (
            <VehicleGrid vehicles={filteredVehicles} />
          )}
        </>
      )}
    </section>
  )
}
