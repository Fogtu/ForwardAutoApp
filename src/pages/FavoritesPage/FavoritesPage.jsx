import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs.jsx'
import VehicleGrid from '../../components/VehicleGrid/VehicleGrid.jsx'
import SkeletonVehicleCard from '../../components/SkeletonVehicleCard/SkeletonVehicleCard.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import { fetchVehiclesByIds } from '../../api/vehicles.js'
import { fetchCategories } from '../../api/categories.js'
import { useFavorites } from '../../hooks/useLocalList.js'
import usePageMeta from '../../hooks/usePageMeta.js'

export default function FavoritesPage() {
  const fav = useFavorites()
  const [vehicles, setVehicles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  usePageMeta('Избранное')

  // Перезагружаем при изменении состава списка (убрали машину — исчезла из выдачи).
  const idsKey = fav.list.join(',')

  useEffect(() => {
    let cancelled = false
    setFailed(false)

    Promise.all([fetchVehiclesByIds(fav.list), fetchCategories()])
      .then(([v, c]) => {
        if (cancelled) return
        setVehicles(v)
        setCategories(c)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, reloadKey])

  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  return (
    <section className="container list-page">
      <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Избранное' }]} />

      <div className="list-page__head">
        <div>
          <h1>Избранное</h1>
          <p>Хранится в этом браузере — регистрация не нужна.</p>
        </div>
        {fav.list.length > 0 && (
          <div className="list-page__actions">
            <Link to="/compare" className="btn btn-outline">К сравнению</Link>
            <button type="button" className="btn btn-outline" onClick={fav.clear}>Очистить</button>
          </div>
        )}
      </div>

      {failed ? (
        <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
      ) : fav.list.length === 0 ? (
        <EmptyState
          title="Пока ничего не выбрано"
          text="Нажмите ♡ на карточке машины, чтобы сохранить её сюда."
        />
      ) : loading ? (
        <div className="v-grid">
          {fav.list.slice(0, 6).map((id) => <SkeletonVehicleCard key={id} />)}
        </div>
      ) : (
        <VehicleGrid vehicles={vehicles} categoriesById={categoriesById} />
      )}
    </section>
  )
}
