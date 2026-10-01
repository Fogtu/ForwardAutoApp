# Forward Auto Rent — обновление: навбар, футер, правила, skeleton-загрузка

## Как применить

Распакуйте архив и скопируйте папку `src` поверх вашей текущей `src`
в корне проекта (структура путей полностью совпадает — конфликтов
не будет, просто согласитесь на замену файлов при копировании).

```
forward-auto-rent/        ← ваш проект
  src/                     ← замените содержимым из архива
  ...
```

После копирования — просто `npm run dev`, никаких новых зависимостей
не требуется.

## Что внутри (новые и изменённые файлы)

### Изменено
- `src/App.jsx` — добавлен роут `/rules`
- `src/index.css` — добавлена глобальная shimmer-анимация для скелетонов
- `src/components/Header/Header.jsx` + `.css` — убраны фейковые ссылки,
  добавлена ссылка «Правила» с подсветкой активного пункта
- `src/components/Footer/Footer.jsx` + `.css` — убрана плашка про
  «вымышленный сервис», вместо колонок — ссылка на сообщество ВК
  (поменяйте `VK_COMMUNITY_URL` в `Footer.jsx` на свою)
- `src/components/Breadcrumbs/Breadcrumbs.css` — заметный отступ сверху/снизу
- `src/pages/CategoriesPage/*` — опущен заголовок «Категории»,
  skeleton-карточки вместо «Загрузка…»
- `src/pages/CategoryPage/*` — skeleton шапки категории + сетки карточек
- `src/pages/VehiclePage/*` — skeleton всей страницы машины
- `src/pages/BookingPage/*` — skeleton формы брони
- `src/pages/AdminPage/RentalsAdmin.jsx`,
  `VehiclesAdmin.jsx`, `CategoriesAdmin.jsx` — skeleton-строки таблиц

### Новое
- `src/pages/RulesPage/RulesPage.jsx` + `.css` — страница `/rules` с
  правилами сервиса (banal, но живой текст — поправьте под себя)
- `src/components/SkeletonCard/` — скелетон карточки категории
- `src/components/SkeletonVehicleCard/` — скелетон карточки машины
- `src/components/SkeletonVehiclePage/` — скелетон страницы машины целиком
- `src/components/SkeletonBookingForm/` — скелетон формы бронирования
- `src/components/SkeletonTableRows/` — переиспользуемые строки-скелетоны
  для любых таблиц админки (`columns={N}` — число колонок)

## Не забудьте

1. В `Footer.jsx` поменять `VK_COMMUNITY_URL` на реальную ссылку.
2. В `RulesPage.jsx` отредактировать текст правил под ваш сервер —
   сейчас это шаблонный, но осмысленный набор (заявка, использование
   транспорта, сроки, ответственность).
3. Проблему `create-rental` 500 Internal Server Error эти файлы не
   решают — это отдельная серверная часть (Supabase Edge Function),
   не связанная со стилями. Чек-лист по ней был отправлен отдельным
   сообщением: проверить `migration_booking_stages.sql`, передеплоить
   функцию, посмотреть Supabase Logs.
