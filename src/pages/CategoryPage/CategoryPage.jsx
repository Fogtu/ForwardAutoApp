import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import FilterPanel from '../../components/FilterPanel/FilterPanel.jsx'
import VehicleGrid from '../../components/VehicleGrid/VehicleGrid.jsx'
import SkeletonVehicleCard from '../../components/SkeletonVehicleCard/SkeletonVehicleCard.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import VehicleIcon from '../../components/VehicleIcon/VehicleIcon.jsx'
import NotFoundPage from '../NotFoundPage/NotFoundPage.jsx'
import { fetchCategoryById } from '../../api/categories.js'
import { fetchVehiclesByCategory } from '../../api/vehicles.js'
import { EMPTY_FILTERS, filterVehicles, distinctValues } from '../../utils/filterVehicles.js'
import usePageMeta from '../../hooks/usePageMeta.js'
import './CategoryPage.css'

const SKELETON_COUNT = 6

export default function CategoryPage() {
  const { categoryId } = useParams()
  const [category, setCategory] = useState(null)
  const [allVehicles, setAllVehicles] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [status, setStatus] = useState('loading') // loading | ok | notFound | error
  const [reloadKey, setReloadKey] = useState(0)

  usePageMeta(category?.label, category?.description)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setFilters(EMPTY_FILTERS)

    async function load() {
      try {
        const cat = await fetchCategoryById(categoryId)
        if (!cat) {
          if (!cancelled) setStatus('notFound')
          return
        }
        const vehicles = await fetchVehiclesByCategory(categoryId)
        if (!cancelled) {
          setCategory(cat)
          setAllVehicles(vehicles)
          setStatus('ok')
        }
      } catch (e) {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [categoryId, reloadKey])

  const priceBounds = useMemo(() => {
    if (allVehicles.length === 0) return { min: 0, max: 1000, step: 100 }
    const prices = allVehicles.map((v) => v.priceDay)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { min, max, step: Math.max(100, Math.round((max - min) / 20 / 100) * 100) || 100 }
  }, [allVehicles])

  const options = useMemo(
    () => ({ classes: distinctValues(allVehicles, 'class'), locations: distinctValues(allVehicles, 'location') }),
    [allVehicles]
  )

  const filteredVehicles = useMemo(() => filterVehicles(allVehicles, filters), [allVehicles, filters])
  const categoriesById = useMemo(() => (category ? { [category.id]: category } : {}), [category])

  if (status === 'notFound') {
    return <NotFoundPage title="Категория не найдена" text="Такой категории нет — выберите одну из списка на главной." />
  }

  if (status === 'error') {
    return (
      <section className="container category-page">
        <div className="category-page__loading">
          <ErrorState title="Не удалось загрузить категорию" onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      </section>
    )
  }

  if (status === 'loading' || !category) {
    return (
      <section className="container category-page">
        <div className="category-page__loading">
          <div className="category-page__head">
            <div className="skeleton-category-icon skeleton-shimmer" />
            <div className="skeleton-category-text">
              <span className="skeleton-category-title skeleton-shimmer" />
              <span className="skeleton-category-desc skeleton-shimmer" />
            </div>
          </div>
          <div className="v-grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonVehicleCard key={i} />
            ))}
          </div>
        </div>
      </section>
    )
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
            options={options}
          />

          {filteredVehicles.length === 0 ? (
            <EmptyState
              title="По этим условиям ничего нет"
              text="Попробуйте расширить диапазон цены или изменить запрос."
              actionLabel="Сбросить фильтры"
              onAction={() => setFilters(EMPTY_FILTERS)}
            />
          ) : (
            <VehicleGrid vehicles={filteredVehicles} categoriesById={categoriesById} />
          )}
        </>
      )}
    </section>
  )
}
