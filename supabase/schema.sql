-- ============================================================
-- Forward Auto Rent — схема Supabase (актуальная версия)
-- Выполнить целиком в Supabase SQL Editor на пустом проекте.
-- Если у вас уже есть база по старой версии schema.sql — используйте
-- вместо этого migration_booking_stages.sql.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Категории ----------
create table categories (
  id          text primary key,
  label       text not null,
  kind        text not null,
  color       text not null,
  description text
);

-- ---------- Машины ----------
create table vehicles (
  id          text primary key,
  category_id text not null references categories(id) on delete restrict,
  brand       text not null,
  model       text not null,
  class       text,
  price_day   integer not null,
  price_week  integer,
  seats       integer,
  top_speed   integer,
  accel       numeric,
  rating      numeric default 5,
  rents       integer default 0,
  location    text,
  badge       text,
  features    text[] default '{}',
  images      text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index vehicles_category_idx on vehicles(category_id);

-- ---------- Стейджи ----------
-- У машины может быть 0 стейджей (стоковая) либо 2–4 подряд, начиная с
-- позиции 1. Позиция 1 — всегда категория "База". Позиции 2–4 — любая из
-- Баланс/Скорость/Управление, категории МОГУТ повторяться (например,
-- дважды "Скорость" на разных позициях). Без базы (позиции 1) не может
-- быть позиции 2, без позиции 2 не может быть позиции 3 — эту логику
-- (0 или непрерывный диапазон 2–4, база всегда первая) проверяет
-- Edge Function admin-api при сохранении, а не сама БД.
create type stage_category as enum ('База', 'Баланс', 'Скорость', 'Управление');

create table vehicle_stages (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  text not null references vehicles(id) on delete cascade,
  position    smallint not null check (position between 1 and 4),
  category    stage_category not null,
  unique (vehicle_id, position),
  constraint stage_position_1_is_baza check (
    (position = 1 and category = 'База') or
    (position <> 1 and category <> 'База')
  )
);

create index vehicle_stages_vehicle_idx on vehicle_stages(vehicle_id);

-- ---------- Аренды (заявки) ----------
create type rental_status as enum ('active', 'completed', 'cancelled');

create table rentals (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     text references vehicles(id) on delete set null,
  vk_link        text not null,
  game_nickname  text not null,
  contact_name   text not null,
  period         text check (period in ('day', 'week')),
  price          integer,
  status         rental_status not null default 'active',
  client_ip      text,
  start_date     timestamptz not null default now(),
  end_date       timestamptz,
  created_at     timestamptz default now()
);

create index rentals_status_idx on rentals(status);
create index rentals_vehicle_idx on rentals(vehicle_id);
create index rentals_client_ip_created_idx on rentals(client_ip, created_at);

-- ---------- Админ: хэш пароля и сессии ----------
create table admin_config (
  id            boolean primary key default true check (id),
  password_hash text not null
);

-- insert into admin_config (id, password_hash) values (true, 'ВАШ_SHA256_ХЭШ_ПАРОЛЯ');

create table admin_sessions (
  token      uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table categories      enable row level security;
alter table vehicles        enable row level security;
alter table vehicle_stages  enable row level security;
alter table rentals         enable row level security;
alter table admin_config    enable row level security;
alter table admin_sessions  enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "public read vehicles" on vehicles
  for select using (true);

create policy "public read vehicle_stages" on vehicle_stages
  for select using (true);

-- Заявки на аренду создаются ТОЛЬКО через Edge Function create-rental
-- (сервисным ключом, в обход RLS) — так у неё есть возможность проверять
-- антиспам по IP до вставки. Прямого anon-доступа к rentals нет вообще:
-- ни на select, ни на insert — иначе антиспам обходился бы прямым
-- вызовом supabase.from('rentals').insert(...) из консоли браузера.

-- Для admin_config и admin_sessions политик тоже нет — anon-ключ
-- не имеет к ним доступа ни на чтение, ни на запись.
