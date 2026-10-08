export const EMPTY_FILTERS = {
  search: '',
  priceMin: 0,
  priceMax: Infinity,
  sortBy: 'popular',
  vehicleClass: '',
  location: '',
  minSeats: 0,
  onlyFree: false,
}

export function filterVehicles(vehicles, filters) {
  const {
    search = '', priceMin = 0, priceMax = Infinity, sortBy = 'popular',
    vehicleClass = '', location = '', minSeats = 0, onlyFree = false,
  } = filters
  const query = search.trim().toLowerCase()

  let result = vehicles.filter((v) => {
    if (v.priceDay < priceMin || v.priceDay > priceMax) return false
    if (vehicleClass && v.class !== vehicleClass) return false
    if (location && v.location !== location) return false
    if (minSeats && (v.seats ?? 0) < minSeats) return false
    if (onlyFree && v.busyNow) return false
    if (query) {
      const haystack = `${v.brand} ${v.model} ${v.class}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  result = [...result].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return a.priceDay - b.priceDay
      case 'price-desc': return b.priceDay - a.priceDay
      case 'rating-desc': return b.rating - a.rating
      case 'speed-desc': return (b.topSpeed ?? 0) - (a.topSpeed ?? 0)
      case 'deposit-asc': return (a.deposit ?? 0) - (b.deposit ?? 0)
      case 'popular':
      default: return b.rents - a.rents
    }
  })

  return result
}

// Уникальные непустые значения поля — для выпадающих списков фильтров.
export function distinctValues(vehicles, key) {
  return [...new Set(vehicles.map((v) => v[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))
}
