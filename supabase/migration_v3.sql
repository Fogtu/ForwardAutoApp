-- ============================================================
-- Миграция v3: заявки со статусом pending, календарь занятости,
-- отзывы, статус по номеру, отдельные админ-аккаунты, журнал
-- действий, защита входа от перебора.
-- Выполнить в SQL Editor ОДИН раз поверх текущей базы.
-- Если редактор ругнётся на ALTER TYPE — выполните две первые
-- команды отдельно, затем остальное.
-- ============================================================

alter type rental_status add value if not exists 'pending';
alter type rental_status add value if not exists 'rejected';

-- ---------- 1. Заявки: публичный номер ----------
alter table rentals add column if not exists public_code text;
update rentals set public_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)) where public_code is null;
alter table rentals alter column public_code set default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
alter table rentals alter column public_code set not null;
create unique index if not exists rentals_public_code_key on rentals(public_code);
create index if not exists rentals_vehicle_dates_idx on rentals(vehicle_id, status, start_date, end_date);

-- vehicles.is_rented больше не используется (занятость считается по датам
-- одобренных заявок). Колонка остаётся в БД, чтобы ничего не ломать.

-- ---------- 2. Календарь занятости (без персональных данных) ----------
create or replace function get_busy_ranges(p_vehicle_id text default null)
returns table (vehicle_id text, start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select r.vehicle_id,
         (r.start_date at time zone 'utc')::date,
         (r.end_date at time zone 'utc')::date
  from rentals r
  where r.status = 'active'
    and r.vehicle_id is not null
    and (p_vehicle_id is null or r.vehicle_id = p_vehicle_id)
    and (r.end_date at time zone 'utc')::date >= (now() at time zone 'utc')::date
$$;

-- ---------- 4. Отзывы ----------
alter table vehicles add column if not exists reviews_count integer not null default 0;

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  rental_id   uuid not null unique references rentals(id) on delete cascade,
  vehicle_id  text not null references vehicles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 500),
  author_name text not null,
  created_at  timestamptz default now()
);
create index if not exists reviews_vehicle_idx on reviews(vehicle_id, created_at desc);

alter table reviews enable row level security;
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);

-- Рейтинг машины = среднее по отзывам (пока отзывов нет — остаётся ручной).
create or replace function refresh_vehicle_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare vid text; cnt integer; avg_r numeric;
begin
  if tg_op = 'DELETE' then vid := old.vehicle_id; else vid := new.vehicle_id; end if;
  select count(*), avg(rating) into cnt, avg_r from reviews where vehicle_id = vid;
  update vehicles set reviews_count = cnt, rating = coalesce(round(avg_r, 1), rating) where id = vid;
  return null;
end $$;

drop trigger if exists reviews_refresh_rating on reviews;
create trigger reviews_refresh_rating
  after insert or delete on reviews
  for each row execute function refresh_vehicle_rating();

-- ---------- 3. Статус заявки по номеру (нужна таблица reviews выше) ----------
create or replace function get_rental_status(p_code text)
returns table (
  code text, status text, vehicle_id text, brand text, model text,
  start_date date, end_date date, price integer, created_at timestamptz, has_review boolean
)
language sql stable security definer set search_path = public as $$
  select r.public_code, r.status::text, r.vehicle_id, v.brand, v.model,
         (r.start_date at time zone 'utc')::date,
         (r.end_date at time zone 'utc')::date,
         r.price, r.created_at,
         exists (select 1 from reviews rv where rv.rental_id = r.id)
  from rentals r
  left join vehicles v on v.id = r.vehicle_id
  where r.public_code = upper(trim(p_code))
$$;

create or replace function submit_review(p_code text, p_rating integer, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r rentals%rowtype;
begin
  select * into r from rentals where public_code = upper(trim(p_code));
  if not found then raise exception 'Заявка не найдена'; end if;
  if r.status::text <> 'completed' then
    raise exception 'Отзыв можно оставить только после завершения аренды';
  end if;
  if r.vehicle_id is null then raise exception 'Машина удалена из каталога'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Оценка должна быть от 1 до 5';
  end if;
  if exists (select 1 from reviews where rental_id = r.id) then
    raise exception 'Вы уже оставили отзыв на эту аренду';
  end if;
  insert into reviews (rental_id, vehicle_id, rating, comment, author_name)
  values (r.id, r.vehicle_id, p_rating, nullif(left(trim(coalesce(p_comment, '')), 500), ''), r.contact_name);
end $$;

grant execute on function get_busy_ranges(text) to anon, authenticated;
grant execute on function get_rental_status(text) to anon, authenticated;
grant execute on function submit_review(text, integer, text) to anon, authenticated;

-- ---------- 5. Админ-аккаунты ----------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique check (username = lower(username) and char_length(username) between 3 and 32),
  password_hash text not null,
  role          text not null default 'manager' check (role in ('owner', 'manager')),
  created_at    timestamptz default now()
);
alter table admin_users enable row level security;

-- Старые сессии (по общему паролю) больше недействительны.
delete from admin_sessions;
alter table admin_sessions
  add column if not exists admin_user_id uuid references admin_users(id) on delete cascade,
  add column if not exists username text,
  add column if not exists role text;

create table if not exists admin_audit_log (
  id            bigserial primary key,
  admin_user_id uuid,
  username      text not null,
  action        text not null,
  target        text,
  details       jsonb,
  created_at    timestamptz default now()
);
create index if not exists admin_audit_log_created_idx on admin_audit_log(created_at desc);
alter table admin_audit_log enable row level security;

create table if not exists admin_login_attempts (
  id         bigserial primary key,
  ip         text,
  username   text,
  created_at timestamptz default now()
);
create index if not exists admin_login_attempts_ip_idx on admin_login_attempts(ip, created_at);
create index if not exists admin_login_attempts_user_idx on admin_login_attempts(username, created_at);
alter table admin_login_attempts enable row level security;

-- Пароли хранятся как bcrypt (pgcrypto), проверка — внутри БД.
create or replace function admin_verify_login(p_username text, p_password text)
returns table (id uuid, username text, role text)
language sql stable security definer set search_path = public, extensions as $$
  select u.id, u.username, u.role
  from admin_users u
  where u.username = lower(trim(p_username))
    and u.password_hash = crypt(p_password, u.password_hash)
$$;

create or replace function admin_create_user(p_username text, p_password text, p_role text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare new_id uuid;
begin
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'Пароль должен быть не короче 8 символов';
  end if;
  insert into admin_users (username, password_hash, role)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf')), p_role)
  returning id into new_id;
  return new_id;
end $$;

create or replace function admin_set_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'Пароль должен быть не короче 8 символов';
  end if;
  update admin_users set password_hash = crypt(p_password, gen_salt('bf')) where id = p_id;
  delete from admin_sessions where admin_user_id = p_id;
end $$;

revoke all on function admin_verify_login(text, text) from public, anon, authenticated;
revoke all on function admin_create_user(text, text, text) from public, anon, authenticated;
revoke all on function admin_set_password(uuid, text) from public, anon, authenticated;
grant execute on function admin_verify_login(text, text) to service_role;
grant execute on function admin_create_user(text, text, text) to service_role;
grant execute on function admin_set_password(uuid, text) to service_role;

-- ---------- 6. ПЕРВЫЙ ВЛАДЕЛЕЦ ----------
-- Раскомментируйте, подставьте логин (строчными буквами) и новый пароль,
-- выполните ОТДЕЛЬНО. Без этого войти в админку будет нельзя.
--
-- insert into admin_users (username, password_hash, role)
-- values ('admin', crypt('ВАШ_НОВЫЙ_ПАРОЛЬ_от_8_символов', gen_salt('bf')), 'owner');
