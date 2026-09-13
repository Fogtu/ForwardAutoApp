// Категории проката. kind используется для выбора силуэта иконки,
// color — для меток и акцентов, привязанных к смыслу (не декоративных).
export const CATEGORIES = [
  {
    id: 'legkovoy',
    label: 'Легковой транспорт',
    kind: 'car',
    color: 'var(--cat-legkovoy)',
    description: 'Седаны, купе и спорткары на каждый день',
  },
  {
    id: 'gruzovoy',
    label: 'Грузовой транспорт',
    kind: 'truck',
    color: 'var(--cat-gruzovoy)',
    description: 'Фуры и пикапы для перевозки груза',
  },
  {
    id: 'obshestvenniy',
    label: 'Общественный транспорт',
    kind: 'bus',
    color: 'var(--cat-obshestvenniy)',
    description: 'Автобусы для перевозки пассажиров',
  },
  {
    id: 'moto',
    label: 'Мототранспорт',
    kind: 'moto',
    color: 'var(--cat-moto)',
    description: 'Мотоциклы и спортбайки',
  },
  {
    id: 'konteynery',
    label: 'Автомобили из контейнеров',
    kind: 'car',
    color: 'var(--cat-konteynery)',
    description: 'Редкие импортные машины лимитированных партий',
  },
  {
    id: 'sobytiya',
    label: 'Автомобили из событий',
    kind: 'car',
    color: 'var(--cat-sobytiya)',
    description: 'Эксклюзив, доступный только во время ивентов',
  },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id)
}
