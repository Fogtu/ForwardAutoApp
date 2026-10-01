-- ============================================================
-- Миграция: занятость машины + гибкие тарифы по датам аренды
-- Выполнить в SQL Editor поверх существующей базы (после schema.sql
-- и migration_booking_stages.sql, если она уже была выполнена).
-- ============================================================

-- 1. Занятость машины — простой флаг, безопасный для публичного
--    чтения (никаких персональных данных заявки, только сам факт
--    "занята / свободна"). Сервер сам держит его в синхроне с
--    активными заявками — вручную его лучше не трогать.
alter table vehicles
  add column if not exists is_rented boolean not null default false;

-- 2. Гибкие тарифы по длительности аренды. У машины может быть
--    0 тарифов — тогда на каждые сутки действует обычная price_day —
--    либо любое число диапазонов [min_days; max_days]. max_days = NULL
--    значит "и больше". Диапазоны не обязаны покрывать все сутки без
--    пропусков — если ни один не подошёл, тоже используется price_day.
create table if not exists vehicle_price_tiers (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     text not null references vehicles(id) on delete cascade,
  min_days       integer not null check (min_days >= 1),
  max_days       integer check (max_days is null or max_days >= min_days),
  price_per_day  integer not null check (price_per_day >= 0),
  created_at     timestamptz default now()
);

create index if not exists vehicle_price_tiers_vehicle_idx on vehicle_price_tiers(vehicle_id);

alter table vehicle_price_tiers enable row level security;

drop policy if exists "public read vehicle_price_tiers" on vehicle_price_tiers;
create policy "public read vehicle_price_tiers" on vehicle_price_tiers
  for select using (true);

-- 3. Заявка теперь хранит конкретные даты аренды, а не абстрактный
--    "period" (сутки/неделя) — start_date/end_date уже были в схеме,
--    просто раньше start_date всегда был "сейчас". Количество суток и
--    итоговая цена считаются Edge Function create-rental по этим датам
--    и тарифам машины.
alter table rentals
  drop column if exists period;

alter table rentals
  alter column start_date drop default;
