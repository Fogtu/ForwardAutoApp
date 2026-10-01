# Forward Auto Rent — MTA Province #6

Сайт проката транспорта для игрового сервера MTA. Посетители смотрят каталог
техники и оставляют заявку на аренду, администратор управляет каталогом и
заявками через закрытую админку.

**Стек:** React 18 · Vite 5 · react-router-dom 6 · Supabase (Postgres + Edge
Functions на Deno) · Cloudinary (хранение фото).

## Возможности

**Для посетителей**

- Главная (`/`) — категории техники с количеством машин в каждой.
- Категория (`/category/:categoryId`) — список машин с поиском по марке/модели/
  классу, диапазоном цены за сутки и сортировкой (популярность, цена, рейтинг).
  Если в категории пусто — показывается пустое состояние.
- Машина (`/car/:vehicleId`) — галерея (реальные фото из Cloudinary или
  сгенерированный SVG-силуэт, если фото нет), характеристики, оснащение,
  тарифы аренды, установленные стейджи, залог, кнопка «Забронировать».
- Заявка (`/book/:vehicleId`) — форма: ссылка на ВК, игровое имя, как
  обращаться, даты «с» и «по». Итоговая цена считается по тарифам машины.
- Правила (`/rules`) — статичная страница с правилами сервиса.
- Пока данные грузятся, вместо контента показываются skeleton-заглушки.

**Для администратора** (`/admin`)

- Вход по общему паролю.
- Вкладки: **Машины**, **Категории**, **Аренды**.
- Машины: полный CRUD, загрузка фото в Cloudinary (первое фото — обложка,
  порядок можно менять), стейджи, тарифы по срокам, ручная кнопка
  «Освободить» для занятой машины.
- Категории: CRUD (id, название, тип силуэта, цвет, описание).
- Аренды: список заявок с датами, числом суток, ценой, ссылкой на ВК; смена
  статуса (активна / завершена / отменена), удаление.

## Как это работает

### Публичная часть

Страницы читают `categories`, `vehicles`, `vehicle_stages` и
`vehicle_price_tiers` напрямую из Supabase через anon-ключ. RLS разрешает
анонимному ключу **только `select`** на эти таблицы.

### Заявки на аренду

Прямого доступа к таблице `rentals` у anon-ключа нет вообще. Форма отправляет
данные в Edge Function `create-rental`, которая (сервисным ключом):

1. проверяет поля и корректность дат;
2. **антиспам:** не даёт отправить вторую заявку с того же IP в течение
   `RATE_LIMIT_MINUTES` (по умолчанию 10 минут; IP берётся из
   `x-forwarded-for`);
3. проверяет, что машина существует и не занята (`is_rented`), иначе 409;
4. сама считает цену: число суток включительно × цена за сутки из подходящего
   тарифа (цене из браузера сервер не доверяет);
5. создаёт заявку со статусом `active` и ставит машине `is_rented = true`.

### Занятость машины

`vehicles.is_rented` — флаг, который поддерживает сервер: `create-rental`
включает его, а `admin-api` пересчитывает при смене статуса или удалении
заявки (машина занята, если остался хотя бы один `active`-рентал). Пока машина
занята, кнопка «Забронировать» неактивна, а `/book/:id` вместо формы
показывает сообщение.

### Тарифы по срокам

У машины может быть 0 или больше тарифов вида «от X до Y суток → ₽ за сутки»
(`max_days = NULL` — «и больше»). Если тарифов нет или ни один не подошёл,
действует `price_day`. Если подошло несколько — берётся с наибольшим
`min_days`. Логика продублирована на клиенте (`src/utils/pricing.js`) и на
сервере (`create-rental`).

> Поле `price_week` осталось в БД и форме админки как необязательное и
> устаревшее — на публичных страницах не используется. Чтобы сохранить
> «неделя дешевле», заведите тариф «от 7 дней».

### Стейджи

Показывают, что реально стоит на машине:

- 0 стейджей — стоковая машина;
- иначе 2–4 подряд без пропусков;
- позиция 1 — всегда **База**;
- позиции 2–4 — любая из **Баланс / Скорость / Управление**, повторы разрешены.

Правило проверяет Edge Function `admin-api` при сохранении (БД дополнительно
гарантирует, что «База» — только на позиции 1).

### Админка и авторизация

Админка ничего не делает в Supabase напрямую:

1. `admin-login` получает SHA-256-хэш пароля (его считает браузер), сверяет с
   `admin_config.password_hash` и выдаёт токен на 12 часов
   (`admin_sessions`).
2. Токен хранится в `sessionStorage` и передаётся в заголовке `x-admin-token`.
3. `admin-api` проверяет токен на каждый запрос и выполняет CRUD сервисным
   ключом в обход RLS. Таблицы `admin_config` и `admin_sessions` недоступны из
   браузера.

## Быстрый старт

### 1. Supabase

1. Создайте проект на supabase.com.
2. В SQL Editor выполните `supabase/schema.sql`.
3. Затем выполните `supabase/migration_availability_pricing.sql`
   (добавляет `is_rented`, таблицу `vehicle_price_tiers`, убирает `period` из
   `rentals`).
4. Если в таблице `vehicles` ещё нет колонки залога, добавьте её:

   ```sql
   alter table vehicles add column if not exists deposit integer not null default 0;
   ```

   > Фронтенд и админка используют `deposit`, но ни `schema.sql`, ни миграции
   > её пока не создают.

> Если база создана по более старой версии схемы, вместо `schema.sql` нужна
> `supabase/migration_booking_stages.sql`, а затем пункты 3–4.

### 2. Пароль администратора

Посчитайте SHA-256 своего пароля в консоли браузера (F12):

```js
const enc = new TextEncoder().encode('ваш-пароль')
const buf = await crypto.subtle.digest('SHA-256', enc)
console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))
```

и сохраните хэш в SQL Editor:

```sql
insert into admin_config (id, password_hash) values (true, 'ВАШ_ХЭШ');
```

### 3. Edge Functions

Нужен Supabase CLI (`npm install -g supabase`):

```bash
supabase login
supabase link --project-ref <ваш-project-ref>

supabase functions deploy admin-login  --no-verify-jwt
supabase functions deploy admin-api    --no-verify-jwt
supabase functions deploy create-rental --no-verify-jwt
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` Supabase подставляет функциям
сам. Флаг `--no-verify-jwt` нужен, потому что функции вызываются без Supabase
Auth: `admin-login` проверяет пароль, `admin-api` — токен сессии,
`create-rental` публична и защищена антиспамом.

### 4. Cloudinary

Создайте **unsigned upload preset** в настройках Cloudinary — админка
загружает фото прямо из браузера.

### 5. Переменные окружения

Создайте `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-ключ из Project Settings → API>
VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.functions.supabase.co

VITE_CLOUDINARY_CLOUD_NAME=<cloud name>
VITE_CLOUDINARY_UPLOAD_PRESET=<unsigned preset>
```

Файлы `.env*` добавлены в `.gitignore`.

### 6. Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production-сборка
npm run preview   # предпросмотр сборки
```

### 7. Наполнение каталога

Откройте `/admin`, создайте категории, затем машины. Фото добавляются прямо в
форме машины. Категория должна существовать до создания машин в ней; удалить
категорию, в которой есть машины, нельзя (`on delete restrict`).

## Структура проекта

```
src/
  api/
    admin.js            # вход в админку, вызовы admin-api, токен в sessionStorage
    categories.js       # чтение категорий из Supabase
    vehicles.js         # чтение машин (со стейджами и тарифами), маппинг snake_case → camelCase
    rentals.js          # отправка заявки в create-rental
    cloudinary.js       # unsigned-загрузка фото
  lib/
    supabaseClient.js   # клиент Supabase
  utils/
    format.js           # деньги (₽), «N мест»
    filterVehicles.js   # поиск / диапазон цены / сортировка
    pricing.js          # число суток и выбор тарифа
  components/
    Header/, Footer/, Logo/, Breadcrumbs/, EmptyState/
    CategoryCard/, VehicleCard/, VehicleGrid/, FilterPanel/
    Gallery/            # фото или SVG-силуэт
    VehicleIcon/        # силуэты car / truck / bus / moto
    StagesList/, PriceTiers/
    ImageUploader/      # загрузка и сортировка фото в админке
    Skeleton*/          # заглушки: карточки, страница машины, форма, строки таблиц
  pages/
    CategoriesPage/     # /
    CategoryPage/       # /category/:categoryId
    VehiclePage/        # /car/:vehicleId
    BookingPage/        # /book/:vehicleId
    RulesPage/          # /rules
    AdminPage/          # /admin (VehiclesAdmin, CategoriesAdmin, RentalsAdmin)
  data/
    categories.js       # статичные категории (см. «Известные ограничения»)
    vehicles.js         # устаревшие моковые данные, не используются
  App.jsx               # роуты
  index.css             # дизайн-токены, кнопки, shimmer-анимация скелетонов

supabase/
  schema.sql                          # схема БД + RLS
  migration_booking_stages.sql        # миграция: новая форма заявки, антиспам
  migration_availability_pricing.sql  # миграция: is_rented, тарифы, даты вместо period
  functions/
    admin-login/    # проверка пароля, выдача токена
    admin-api/      # CRUD для админки (машины, категории, стейджи, тарифы, аренды)
    create-rental/  # публичный приём заявок
```

## Что нужно настроить под себя

- `VK_COMMUNITY_URL` в `src/components/Footer/Footer.jsx` — ссылка на ваше
  сообщество ВКонтакте.
- Текст правил в `src/pages/RulesPage/RulesPage.jsx`.
- `RATE_LIMIT_MINUTES` в `supabase/functions/create-rental/index.ts` —
  интервал антиспама.
- `SESSION_TTL_MS` в `supabase/functions/admin-login/index.ts` — срок жизни
  админ-сессии (по умолчанию 12 часов).

## Известные ограничения

- `VehicleCard` всё ещё берёт цвет и тип иконки из статичного
  `src/data/categories.js`, а не из БД. Категории, созданные в админке, на
  карточках машин получат цвет/силуэт по умолчанию (пока не совпадут по `id`
  со статичным списком). Файл `src/data/vehicles.js` больше нигде не
  импортируется.
- Антиспам основан на IP из `x-forwarded-for`: игроки за одним NAT/VPN делят
  лимит, а смена IP его обходит. Для более строгой защиты нужна капча или
  лимит по ВК-ссылке.
- Вход в админку не ограничен по числу попыток, а хэш пароля фактически
  играет роль пароля для сервера. Используйте длинный уникальный пароль.
- Правило непересечения тарифов не проверяется жёстко — админ сам следит за
  диапазонами.