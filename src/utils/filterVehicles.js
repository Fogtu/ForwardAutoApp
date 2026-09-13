export const EMPTY_FILTERS = {
  search: '',
  priceMin: 0,
  priceMax: Infinity,
  sortBy: 'popular',
}

export function filterVehicles(vehicles, filters) {
  const { search = '', priceMin = 0, priceMax = Infinity, sortBy = 'popular' } = filters
  const query = search.trim().toLowerCase()

  let result = vehicles.filter((v) => {
    if (v.priceDay < priceMin || v.priceDay > priceMax) return false
    if (query) {
      const haystack = `${v.brand} ${v.model} ${v.class}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  result = [...result].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.priceDay - b.priceDay
      case 'price-desc':
        return b.priceDay - a.priceDay
      case 'rating-desc':
        return b.rating - a.rating
      case 'popular':
      default:
        return b.rents - a.rents
    }
  })

  return result
}
