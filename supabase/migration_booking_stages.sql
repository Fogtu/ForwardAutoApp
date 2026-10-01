-- ============================================================
-- Миграция: новая форма брони + IP-антиспам + пересмотр стейджей
-- Выполнить в SQL Editor поверх уже существующей базы (см. schema.sql).
-- ============================================================

-- 1. Убираем прямой анонимный insert в rentals — теперь заявки создаются
--    только через Edge Function create-rental (там же антиспам по IP).
drop policy if exists "public can create rental" on rentals;

-- 2. Новые поля формы заявки вместо старых renter_name/renter_contact.
alter table rentals
  drop column if exists renter_name,
  drop column if exists renter_contact;

alter table rentals
  add column if not exists vk_link text not null default '',
  add column if not exists game_nickname text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists client_ip text;

-- Убираем default '' сразу после того, как столбцы созданы —
-- он был нужен только чтобы alter не упал на существующих строках.
alter table rentals
  alter column vk_link drop default,
  alter column game_nickname drop default,
  alter column contact_name drop default;

create index if not exists rentals_client_ip_created_idx on rentals(client_ip, created_at);

-- 3. Про стейджи: схема vehicle_stages не меняется — повтор категорий
--    (например «Скорость» и в слоте 2, и в слоте 3) она и раньше не
--    запрещала на уровне БД, это ограничивала только админка. Саму
--    проверку «стейджи — это непрерывный список с 1, база всегда первая,
--    итого 0 или 2–4 подряд» теперь делает Edge Function admin-api
--    (файл supabase/functions/admin-api/index.ts) при сохранении.
