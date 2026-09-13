import Logo from '../../components/Logo/Logo.jsx'
import CategoryCard from '../../components/CategoryCard/CategoryCard.jsx'
import { CATEGORIES } from '../../data/categories.js'
import { getVehiclesByCategory } from '../../data/vehicles.js'
import './CategoriesPage.css'

export default function CategoriesPage() {
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
        <div className="categories-grid">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} category={cat} count={getVehiclesByCategory(cat.id).length} />
          ))}
        </div>
      </section>
    </>
  )
}
