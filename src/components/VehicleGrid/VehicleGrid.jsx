import VehicleCard from '../VehicleCard/VehicleCard.jsx'
import './VehicleGrid.css'

export default function VehicleGrid({ vehicles }) {
  return (
    <div className="v-grid">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </div>
  )
}
