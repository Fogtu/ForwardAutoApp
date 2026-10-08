import VehicleCard from '../VehicleCard/VehicleCard.jsx'
import './VehicleGrid.css'

// categoriesById — { [categoryId]: category } из БД.
export default function VehicleGrid({ vehicles, categoriesById = {} }) {
  return (
    <div className="v-grid">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} category={categoriesById[v.category]} />
      ))}
    </div>
  )
}
