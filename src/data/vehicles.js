// Локации выдачи — вымышленные районы сервера, не привязаны к реальным городам.
export const LOCATIONS = ['Норд-Хилл', 'Ист-Пойнт', 'Бэй-Сайд', 'Ривертаун', 'Паласио']

// Стадии тюнинга: цена растёт с каждым уровнем. base — цена суточной аренды,
// от неё считаются условные апгрейды двигателя/подвески/тормозов.
function buildStages(base, count = 3) {
  const multipliers = [3, 7, 13, 21]
  return Array.from({ length: count }).map((_, i) => ({
    name: `Стадия ${i + 1}`,
    price: Math.round((base * multipliers[i]) / 100) * 100,
  }))
}

export const VEHICLES = [
  // ---------- Легковой транспорт ----------
  {
    id: 'straton-comet', category: 'legkovoy', brand: 'Straton', model: 'Comet',
    class: 'Спорткар', priceDay: 18000, priceWeek: 95000, seats: 2,
    topSpeed: 312, accel: 3.9, rating: 4.9, rents: 187, location: 'Норд-Хилл',
    badge: 'популярный',
    features: ['Спортивная подвеска', 'Ковшовые сиденья', 'Карбоновый обвес'],
    stages: buildStages(18000, 4),
  },
  {
    id: 'straton-veloce', category: 'legkovoy', brand: 'Straton', model: 'Veloce',
    class: 'Купе', priceDay: 9500, priceWeek: 52000, seats: 4,
    topSpeed: 270, accel: 5.4, rating: 4.7, rents: 141, location: 'Ист-Пойнт',
    badge: null,
    features: ['Климат-контроль', 'Аудиосистема', 'Подогрев сидений'],
    stages: buildStages(9500, 3),
  },
  {
    id: 'vantis-aurora', category: 'legkovoy', brand: 'Vantis', model: 'Aurora',
    class: 'Седан', priceDay: 6200, priceWeek: 34000, seats: 5,
    topSpeed: 230, accel: 6.8, rating: 4.5, rents: 203, location: 'Бэй-Сайд',
    badge: null,
    features: ['Круиз-контроль', 'Камера заднего вида', 'Мультимедиа'],
    stages: buildStages(6200, 3),
  },
  {
    id: 'vantis-solace', category: 'legkovoy', brand: 'Vantis', model: 'Solace',
    class: 'Седан бизнес-класса', priceDay: 8800, priceWeek: 47000, seats: 5,
    topSpeed: 245, accel: 6.1, rating: 4.8, rents: 96, location: 'Паласио',
    badge: null,
    features: ['Кожаный салон', 'Массаж сидений', 'Панорамная крыша'],
    stages: buildStages(8800, 3),
  },
  {
    id: 'rurik-atlas', category: 'legkovoy', brand: 'Rurik', model: 'Atlas',
    class: 'Внедорожник', priceDay: 11000, priceWeek: 58000, seats: 5,
    topSpeed: 210, accel: 7.5, rating: 4.6, rents: 118, location: 'Ривертаун',
    badge: null,
    features: ['Полный привод', 'Рейлинги', 'Защита днища'],
    stages: buildStages(11000, 3),
  },
  {
    id: 'rurik-frontier', category: 'legkovoy', brand: 'Rurik', model: 'Frontier',
    class: 'Пикап', priceDay: 7600, priceWeek: 40000, seats: 5,
    topSpeed: 195, accel: 8.2, rating: 4.3, rents: 64, location: 'Ривертаун',
    badge: null,
    features: ['Грузовая платформа', 'Полный привод', 'Фаркоп'],
    stages: buildStages(7600, 3),
  },
  {
    id: 'ardenne-lumen', category: 'legkovoy', brand: 'Ardenne', model: 'Lumen',
    class: 'Хэтчбек', priceDay: 4200, priceWeek: 23000, seats: 5,
    topSpeed: 205, accel: 8.9, rating: 4.4, rents: 172, location: 'Бэй-Сайд',
    badge: null,
    features: ['Кондиционер', 'Bluetooth', 'Датчики парковки'],
    stages: buildStages(4200, 2),
  },
  {
    id: 'ardenne-basic', category: 'legkovoy', brand: 'Ardenne', model: 'Basic',
    class: 'Эконом', priceDay: 2800, priceWeek: 15000, seats: 5,
    topSpeed: 180, accel: 10.6, rating: 4.1, rents: 254, location: 'Ист-Пойнт',
    badge: 'самый доступный',
    features: ['Кондиционер', 'Электростеклоподъёмники'],
    stages: buildStages(2800, 2),
  },
  {
    id: 'corvane-gtx', category: 'legkovoy', brand: 'Corvane', model: 'GTX',
    class: 'Спорткупе', priceDay: 15500, priceWeek: 82000, seats: 2,
    topSpeed: 298, accel: 4.2, rating: 4.8, rents: 89, location: 'Норд-Хилл',
    badge: null,
    features: ['Задний привод', 'Спортивные тормоза', 'Двухзонный климат'],
    stages: buildStages(15500, 4),
  },
  {
    id: 'solvane-nimbus', category: 'legkovoy', brand: 'Solvane', model: 'Nimbus',
    class: 'Электроседан', priceDay: 9900, priceWeek: 53000, seats: 5,
    topSpeed: 250, accel: 4.8, rating: 4.7, rents: 77, location: 'Паласио',
    badge: 'новинка',
    features: ['Автопилот', 'Быстрая зарядка', 'Панорамная крыша'],
    stages: buildStages(9900, 3),
  },
  {
    id: 'straton-marlin', category: 'legkovoy', brand: 'Straton', model: 'Marlin',
    class: 'Кабриолет', priceDay: 12800, priceWeek: 68000, seats: 4,
    topSpeed: 260, accel: 5.1, rating: 4.6, rents: 58, location: 'Бэй-Сайд',
    badge: null,
    features: ['Складная крыша', 'Подогрев сидений', 'Премиум-аудио'],
    stages: buildStages(12800, 3),
  },
  {
    id: 'vantis-regale', category: 'legkovoy', brand: 'Vantis', model: 'Regale',
    class: 'Лимузин', priceDay: 16000, priceWeek: 85000, seats: 7,
    topSpeed: 220, accel: 7.9, rating: 4.9, rents: 41, location: 'Паласио',
    badge: 'мало в наличии',
    features: ['Перегородка салона', 'Мини-бар', 'Массаж сидений'],
    stages: buildStages(16000, 2),
  },

  // ---------- Грузовой транспорт: пока пусто ----------
  // Парк грузового транспорта на пополнении — показывает пустое состояние каталога.

  // ---------- Общественный транспорт: пока пусто ----------
  // Автобусный парк в разработке — показывает пустое состояние каталога.

  // ---------- Мототранспорт ----------
  {
    id: 'kestrel-raptor', category: 'moto', brand: 'Kestrel', model: 'Raptor',
    class: 'Спортбайк', priceDay: 5200, priceWeek: 27000, seats: 2,
    topSpeed: 290, accel: 3.1, rating: 4.8, rents: 66, location: 'Норд-Хилл',
    badge: 'популярный',
    features: ['Спортивная посадка', 'Слик-шины', 'Квикшифтер'],
    stages: buildStages(5200, 2),
  },
  {
    id: 'kestrel-drifter', category: 'moto', brand: 'Kestrel', model: 'Drifter',
    class: 'Круизер', priceDay: 3400, priceWeek: 18000, seats: 2,
    topSpeed: 190, accel: 5.6, rating: 4.5, rents: 34, location: 'Ривертаун',
    badge: null,
    features: ['Низкая посадка', 'Кофры', 'Хромированные детали'],
    stages: buildStages(3400, 2),
  },
  {
    id: 'raska-comet', category: 'moto', brand: 'Raska', model: 'Comet',
    class: 'Городской мотоцикл', priceDay: 2100, priceWeek: 11000, seats: 2,
    topSpeed: 150, accel: 6.9, rating: 4.2, rents: 51, location: 'Ист-Пойнт',
    badge: null,
    features: ['Багажный кофр', 'Экономичный расход'],
    stages: buildStages(2100, 1),
  },

  // ---------- Автомобили из контейнеров ----------
  {
    id: 'solvane-obsidian', category: 'konteynery', brand: 'Solvane', model: 'Obsidian',
    class: 'Гиперкар лимитированной партии', priceDay: 42000, priceWeek: 220000, seats: 2,
    topSpeed: 340, accel: 2.9, rating: 5.0, rents: 19, location: 'Паласио',
    badge: 'редкий',
    features: ['Активная аэродинамика', 'Керамические тормоза', 'Гоночный каркас'],
    stages: buildStages(42000, 4),
  },
  {
    id: 'corvane-zephyr-import', category: 'konteynery', brand: 'Corvane', model: 'Zephyr Import',
    class: 'Импортное купе', priceDay: 27000, priceWeek: 145000, seats: 2,
    topSpeed: 305, accel: 3.6, rating: 4.9, rents: 27, location: 'Норд-Хилл',
    badge: 'редкий',
    features: ['Праворульная панель', 'Турбо двигатель', 'Лимитированная окраска'],
    stages: buildStages(27000, 4),
  },
  {
    id: 'ardenne-kaiju-jdm', category: 'konteynery', brand: 'Ardenne', model: 'Kaiju JDM',
    class: 'Тюнинг-платформа из контейнера', priceDay: 19500, priceWeek: 102000, seats: 4,
    topSpeed: 275, accel: 4.4, rating: 4.7, rents: 33, location: 'Ист-Пойнт',
    badge: null,
    features: ['Расширенные арки', 'Спортивный интеркулер', 'Заниженная подвеска'],
    stages: buildStages(19500, 4),
  },

  // ---------- Автомобили из событий ----------
  {
    id: 'straton-phantom-edition', category: 'sobytiya', brand: 'Straton', model: 'Phantom Edition',
    class: 'Эксклюзив зимнего ивента', priceDay: 35000, priceWeek: 180000, seats: 2,
    topSpeed: 320, accel: 3.3, rating: 4.9, rents: 14, location: 'Норд-Хилл',
    badge: 'эксклюзив',
    features: ['Уникальная ливрея', 'Подсветка ходовых огней', 'Нумерованный выпуск'],
    stages: buildStages(35000, 3),
  },
  {
    id: 'vantis-aurora-anniversary', category: 'sobytiya', brand: 'Vantis', model: 'Aurora Anniversary',
    class: 'Юбилейная версия', priceDay: 22000, priceWeek: 115000, seats: 5,
    topSpeed: 240, accel: 5.9, rating: 4.8, rents: 22, location: 'Бэй-Сайд',
    badge: 'эксклюзив',
    features: ['Юбилейные шильдики', 'Премиум-салон', 'Уникальные диски'],
    stages: buildStages(22000, 3),
  },
  {
    id: 'rurik-atlas-expedition', category: 'sobytiya', brand: 'Rurik', model: 'Atlas Expedition',
    class: 'Экспедиционная версия', priceDay: 26000, priceWeek: 135000, seats: 5,
    topSpeed: 215, accel: 7.1, rating: 4.7, rents: 17, location: 'Ривертаун',
    badge: 'эксклюзив',
    features: ['Экспедиционный багажник', 'Лебёдка', 'Шноркель'],
    stages: buildStages(26000, 3),
  },
  {
    id: 'solvane-halo-prototype', category: 'sobytiya', brand: 'Solvane', model: 'Halo Prototype',
    class: 'Прототип с презентации', priceDay: 48000, priceWeek: 250000, seats: 2,
    topSpeed: 330, accel: 2.7, rating: 5.0, rents: 9, location: 'Паласио',
    badge: 'эксклюзив',
    features: ['Прототипный кузов', 'Экспериментальная электроустановка', 'Единичный экземпляр'],
    stages: buildStages(48000, 3),
  },
]

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id)
}

export function getVehiclesByCategory(categoryId) {
  return VEHICLES.filter((v) => v.category === categoryId)
}
