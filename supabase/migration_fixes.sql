-- ============================================================
-- Миграция: недостающие колонки vehicles + updated_at
-- Выполнить в SQL Editor. Безопасно запускать повторно.
-- ============================================================

-- 1. Колонки, которые уже используют фронтенд и Edge Functions,
--    но которых не было ни в schema.sql, ни в прошлых миграциях.
alter table vehicles
  add column if not exists deposit integer not null default 0,
  add column if not exists trunk_capacity integer,
  add column if not exists is_rented boolean not null default false;

-- 2. Автообновление updated_at при любом изменении машины.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on vehicles;
create trigger vehicles_set_updated_at
  before update on vehicles
  for each row
  execute function set_updated_at();

-- 3. Чистка просроченных админ-сессий (можно запускать вручную
--    или повесить на pg_cron).
delete from admin_sessions where expires_at < now();

-- Про стейджи: у машины теперь 0 стейджей (стоковая) либо 1–4 подряд,
-- начиная с позиции 1 ("База"). Схема vehicle_stages не меняется,
-- правило проверяет Edge Function admin-api.
