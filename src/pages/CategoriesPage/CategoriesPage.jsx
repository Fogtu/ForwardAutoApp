import { useEffect, useState } from 'react'
import Logo from '../../components/Logo/Logo.jsx'
import CategoryCard from '../../components/CategoryCard/CategoryCard.jsx'
import SkeletonCard from '../../components/SkeletonCard/SkeletonCard.jsx'
import { fetchCategories } from '../../api/categories.js'
import { fetchVehicleCountsByCategory } from '../../api/vehicles.js'
import './CategoriesPage.css'

const SKELETON_COUNT = 6

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [cats, cnts] = await Promise.all([fetchCategories(), fetchVehicleCountsByCategory()])
        if (!cancelled) {
          setCategories(cats)
          setCounts(cnts)
        }
      } catch (e) {
        if (!cancelled) setErrorMsg('Не удалось загрузить категории. Попробуйте обновить страницу.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="landing-hero">
        <div className="container landing-hero__inner">
          <span className="landing-hero__server mono">MTA PROVINCE #6</span>
          <div className="landing-hero__logo">
            <Logo size="lg" />
          </div>
          <p className="landing-hero__text">
            Выберите категорию, чтобы посмотреть доступную технику — от городских
            седанов до редких машин из контейнеров и ивентов.
          </p>
        </div>
      </section>

      <section className="container categories-section">
        <h2 className="categories-section__title">Категории</h2>

        {errorMsg && <p className="mono">{errorMsg}</p>}

        {!errorMsg && (
          <div className="categories-grid">
            {loading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} count={counts[cat.id] || 0} />
                ))}
          </div>
        )}
      </section>
    </>
  )
}
