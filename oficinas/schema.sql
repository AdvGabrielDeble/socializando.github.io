-- Socializando — Módulo de Oficinas v4.6.0
-- PostgreSQL / Supabase
-- Regra central: somente inscrições CONFIRMED consomem vaga.

create extension if not exists pgcrypto;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  experience_key text not null,
  slug text not null unique,
  title text not null,
  short_description text,
  event_date date not null,
  start_time time,
  end_time time,
  minimum_age integer not null default 5 check (minimum_age >= 0),
  age_label text,
  price_cents integer not null check (price_cents >= 0),
  capacity integer not null check (capacity > 0),
  status text not null default 'draft'
    check (status in ('draft','open','closed','sold_out','archived')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração segura caso a tabela já exista de uma etapa anterior do MVP.
alter table public.workshops add column if not exists experience_key text;
alter table public.workshops add column if not exists minimum_age integer default 5;
update public.workshops set experience_key = slug where experience_key is null;
update public.workshops set minimum_age = 5 where minimum_age is null;
alter table public.workshops alter column experience_key set not null;
alter table public.workshops alter column minimum_age set not null;

create index if not exists workshops_experience_date_idx
  on public.workshops (experience_key, event_date, start_time);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,

  responsible_name text not null,
  responsible_whatsapp text not null,
  responsible_email text,

  child_name text not null,
  child_birth_date date,
  child_age integer check (child_age is null or child_age between 0 and 18),
  notes text,

  amount_cents integer not null check (amount_cents >= 0),
  payment_reference text not null unique,

  status text not null default 'pending_payment'
    check (status in ('pending_payment','payment_reported','confirmed','cancelled')),

  payment_reported_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registrations add column if not exists public_token uuid default gen_random_uuid();
update public.registrations set public_token = gen_random_uuid() where public_token is null;
alter table public.registrations alter column public_token set not null;

create unique index if not exists registrations_public_token_idx
  on public.registrations (public_token);
create index if not exists registrations_workshop_status_idx
  on public.registrations (workshop_id, status);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);


-- Artes públicas das oficinas. O bucket permanece dentro da cota gratuita do projeto
-- e aceita somente arquivos de imagem de até 5 MB. Uploads/alterações são restritos
-- a usuários administrativos do módulo; leitura pública ocorre pelo endpoint público
-- do próprio Storage.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'workshop-artworks',
  'workshop-artworks',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_workshop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

create or replace view public.workshop_availability
with (security_invoker = true)
as
select
  w.id,
  w.experience_key,
  w.slug,
  w.title,
  w.short_description,
  w.event_date,
  w.start_time,
  w.end_time,
  w.minimum_age,
  w.age_label,
  w.price_cents,
  w.capacity,
  w.status,
  w.image_url,
  count(r.id) filter (where r.status = 'confirmed')::integer as confirmed_count,
  greatest(
    w.capacity - count(r.id) filter (where r.status = 'confirmed')::integer,
    0
  ) as available_spots
from public.workshops w
left join public.registrations r on r.workshop_id = w.id
group by w.id;

create or replace function public.list_public_workshops()
returns table (
  id uuid,
  experience_key text,
  slug text,
  title text,
  short_description text,
  event_date date,
  start_time time,
  end_time time,
  minimum_age integer,
  age_label text,
  price_cents integer,
  capacity integer,
  status text,
  image_url text,
  confirmed_count integer,
  available_spots integer
)
language sql
stable
security definer
set search_path = public
as $sql$
  select
    w.id, w.experience_key, w.slug, w.title, w.short_description,
    w.event_date, w.start_time, w.end_time, w.minimum_age, w.age_label,
    w.price_cents, w.capacity, w.status, w.image_url,
    count(r.id) filter (where r.status = 'confirmed')::integer as confirmed_count,
    greatest(w.capacity - count(r.id) filter (where r.status = 'confirmed')::integer, 0) as available_spots
  from public.workshops w
  left join public.registrations r on r.workshop_id = w.id
  where w.status in ('open','sold_out')
  group by w.id
  order by w.event_date, w.start_time;
$sql$;

create or replace function public.prevent_overbooking()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_capacity integer;
  v_confirmed integer;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    select capacity into v_capacity
    from public.workshops
    where id = new.workshop_id
    for update;

    select count(*)::integer into v_confirmed
    from public.registrations
    where workshop_id = new.workshop_id
      and status = 'confirmed'
      and id <> new.id;

    if v_confirmed >= v_capacity then
      raise exception 'Oficina sem vagas disponíveis';
    end if;

    new.confirmed_at := coalesce(new.confirmed_at, now());
    new.confirmed_by := coalesce(new.confirmed_by, auth.uid());
  end if;

  if new.status = 'payment_reported' and old.status is distinct from 'payment_reported' then
    new.payment_reported_at := coalesce(new.payment_reported_at, now());
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists registrations_prevent_overbooking on public.registrations;
create trigger registrations_prevent_overbooking
before update of status on public.registrations
for each row execute function public.prevent_overbooking();

create or replace function public.touch_workshop_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workshops_touch_updated_at on public.workshops;
create trigger workshops_touch_updated_at
before update on public.workshops
for each row execute function public.touch_workshop_updated_at();

create or replace function public.create_public_registration(
  p_workshop_id uuid,
  p_responsible_name text,
  p_responsible_whatsapp text,
  p_responsible_email text,
  p_child_name text,
  p_child_age integer,
  p_child_birth_date date default null,
  p_notes text default null
)
returns table (
  registration_id uuid,
  public_token uuid,
  amount_cents integer,
  payment_reference text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop public.workshops%rowtype;
  v_id uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
  v_reference text;
begin
  select w.* into v_workshop
  from public.workshops w
  where w.id = p_workshop_id and w.status = 'open';

  if not found then
    raise exception 'Oficina indisponível para inscrição';
  end if;

  if p_responsible_name is null or length(trim(p_responsible_name)) < 3 then
    raise exception 'Nome do responsável inválido';
  end if;
  if p_responsible_whatsapp is null or length(regexp_replace(p_responsible_whatsapp, '\D', '', 'g')) < 10 then
    raise exception 'WhatsApp inválido';
  end if;
  if p_child_name is null or length(trim(p_child_name)) < 2 then
    raise exception 'Nome da criança inválido';
  end if;
  if p_child_age is null or p_child_age < v_workshop.minimum_age then
    raise exception 'Idade abaixo da faixa mínima da oficina';
  end if;

  if (
    select count(*) from public.registrations r
    where r.workshop_id = p_workshop_id and r.status = 'confirmed'
  ) >= v_workshop.capacity then
    raise exception 'Oficina sem vagas disponíveis';
  end if;

  v_reference := 'SJ' || upper(substr(replace(v_id::text, '-', ''), 1, 20));

  insert into public.registrations (
    id, public_token, workshop_id,
    responsible_name, responsible_whatsapp, responsible_email,
    child_name, child_age, child_birth_date, notes,
    amount_cents, payment_reference, status
  ) values (
    v_id, v_token, p_workshop_id,
    trim(p_responsible_name), trim(p_responsible_whatsapp), nullif(trim(p_responsible_email), ''),
    trim(p_child_name), p_child_age, p_child_birth_date, nullif(trim(p_notes), ''),
    v_workshop.price_cents, v_reference, 'pending_payment'
  );

  return query
  select v_id, v_token, v_workshop.price_cents, v_reference, 'pending_payment'::text;
end;
$$;

create or replace function public.report_public_payment(
  p_registration_id uuid,
  p_public_token uuid
)
returns table (status text, payment_reported_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registrations as r
  set status = 'payment_reported',
      payment_reported_at = coalesce(r.payment_reported_at, now()),
      updated_at = now()
  where r.id = p_registration_id
    and r.public_token = p_public_token
    and r.status = 'pending_payment';

  if not exists (
    select 1 from public.registrations
    where id = p_registration_id and public_token = p_public_token
  ) then
    raise exception 'Inscrição não encontrada';
  end if;

  return query
  select r.status, r.payment_reported_at
  from public.registrations r
  where r.id = p_registration_id and r.public_token = p_public_token;
end;
$$;

alter table public.workshops enable row level security;
alter table public.registrations enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public can read open workshops" on public.workshops;
create policy "public can read open workshops"
on public.workshops
for select
to anon
using (status in ('open','sold_out'));

drop policy if exists "admins can read all workshops" on public.workshops;
drop policy if exists "admins can manage workshops" on public.workshops;
drop policy if exists "admins can select workshops" on public.workshops;
drop policy if exists "admins can insert workshops" on public.workshops;
drop policy if exists "admins can update workshops" on public.workshops;
drop policy if exists "admins can delete workshops" on public.workshops;

create policy "admins can select workshops"
on public.workshops
for select
to authenticated
using (public.is_workshop_admin());

create policy "admins can insert workshops"
on public.workshops
for insert
to authenticated
with check (public.is_workshop_admin());

create policy "admins can update workshops"
on public.workshops
for update
to authenticated
using (public.is_workshop_admin())
with check (public.is_workshop_admin());

create policy "admins can delete workshops"
on public.workshops
for delete
to authenticated
using (public.is_workshop_admin());


-- Storage: leitura pública decorre do bucket público; escrita exige admin autenticado.
drop policy if exists "workshop admins can read artworks" on storage.objects;
drop policy if exists "workshop admins can upload artworks" on storage.objects;
drop policy if exists "workshop admins can update artworks" on storage.objects;
drop policy if exists "workshop admins can delete artworks" on storage.objects;

create policy "workshop admins can read artworks"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workshop-artworks'
  and public.is_workshop_admin()
);

create policy "workshop admins can upload artworks"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workshop-artworks'
  and public.is_workshop_admin()
);

create policy "workshop admins can update artworks"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workshop-artworks'
  and public.is_workshop_admin()
)
with check (
  bucket_id = 'workshop-artworks'
  and public.is_workshop_admin()
);

create policy "workshop admins can delete artworks"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workshop-artworks'
  and public.is_workshop_admin()
);

drop policy if exists "admins can read registrations" on public.registrations;
create policy "admins can read registrations"
on public.registrations
for select
to authenticated
using (public.is_workshop_admin());

drop policy if exists "admins can update registrations" on public.registrations;
create policy "admins can update registrations"
on public.registrations
for update
to authenticated
using (public.is_workshop_admin())
with check (public.is_workshop_admin());

revoke all on public.registrations from anon;
revoke all on public.admin_users from anon, authenticated;
revoke all on function public.is_workshop_admin() from public;
revoke execute on function public.is_workshop_admin() from anon;

grant select on public.workshops to anon;
grant select, insert, update on public.workshops to authenticated;
grant select, update on public.registrations to authenticated;
revoke all on public.workshop_availability from anon;
grant select on public.workshop_availability to authenticated;
grant execute on function public.list_public_workshops() to anon;
grant execute on function public.create_public_registration(uuid,text,text,text,text,integer,date,text) to anon;
grant execute on function public.report_public_payment(uuid,uuid) to anon;
grant execute on function public.is_workshop_admin() to authenticated;
