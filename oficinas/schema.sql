-- Socializando — Módulo de Oficinas v4.6.0
-- Base: PostgreSQL / Supabase
-- Regra central: apenas inscrições CONFIRMADAS consomem vaga.

create extension if not exists pgcrypto;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text,
  event_date date not null,
  start_time time,
  end_time time,
  age_label text,
  price_cents integer not null check (price_cents >= 0),
  capacity integer not null check (capacity > 0),
  status text not null default 'draft'
    check (status in ('draft','open','closed','sold_out','archived')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists registrations_workshop_status_idx
  on public.registrations (workshop_id, status);

-- Contagem oficial de vagas: somente status = confirmed.
create or replace view public.workshop_availability as
select
  w.id,
  w.slug,
  w.title,
  w.event_date,
  w.start_time,
  w.end_time,
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

-- Impede confirmação quando a capacidade já foi atingida.
create or replace function public.prevent_overbooking()
returns trigger
language plpgsql
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

-- RLS: a configuração pública final será fechada quando definirmos
-- se o cadastro será gravado diretamente pelo cliente ou por Edge Function.
alter table public.workshops enable row level security;
alter table public.registrations enable row level security;

-- Leitura pública apenas das oficinas abertas.
drop policy if exists "public can read open workshops" on public.workshops;
create policy "public can read open workshops"
on public.workshops
for select
using (status in ('open','sold_out'));

-- IMPORTANTE:
-- Não abrir policy pública de INSERT em registrations antes da camada
-- de validação do cadastro estar definida. Isso evita spam e gravações arbitrárias.
