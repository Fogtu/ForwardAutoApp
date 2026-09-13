import { Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import CategoriesPage from './pages/CategoriesPage/CategoriesPage.jsx'
import CategoryPage from './pages/CategoryPage/CategoryPage.jsx'
import VehiclePage from './pages/VehiclePage/VehiclePage.jsx'

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<CategoriesPage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/car/:vehicleId" element={<VehiclePage />} />
        <Route path="*" element={<CategoriesPage />} />
      </Routes>

      <Footer />
    </>
  )
}
