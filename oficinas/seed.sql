-- Socializando — oficinas iniciais v4.6.0
-- Cada linha representa uma turma concreta. Novas datas da mesma oficina
-- reutilizam a mesma experience_key e recebem slug próprio.

-- migração de nomenclatura Squishy aprovada em 27/09/2026.
update public.workshops
set experience_key = 'fabrica-dos-squishy-magicos',
    slug = 'fabrica-dos-squishy-magicos-2026-10-10',
    title = 'Fábrica dos Squishy Mágicos',
    short_description = 'Oficina de Paper Squishy especial do Dia das Crianças.',
    updated_at = now()
where slug = 'fabrica-dos-squishy-magicos-2026-10-10';

insert into public.workshops (
  experience_key,
  slug,
  title,
  short_description,
  event_date,
  start_time,
  end_time,
  minimum_age,
  age_label,
  price_cents,
  capacity,
  status,
  image_url
) values
(
  'expedicao-jurassica',
  'expedicao-jurassica-2026-10-10',
  'Expedição Jurássica',
  'Monte, explore e crie seu dinossauro!',
  '2026-10-10',
  '14:00',
  '15:30',
  5,
  'A partir de 5 anos',
  5000,
  15,
  'open',
  null
),
(
  'fabrica-dos-squishy-magicos',
  'fabrica-dos-squishy-magicos-2026-10-10',
  'Fábrica dos Squishy Mágicos',
  'Oficina de Paper Squishy especial do Dia das Crianças.',
  '2026-10-10',
  '15:30',
  '17:00',
  5,
  'A partir de 5 anos',
  5000,
  15,
  'open',
  null
)
on conflict (slug) do update set
  experience_key = excluded.experience_key,
  title = excluded.title,
  short_description = excluded.short_description,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  minimum_age = excluded.minimum_age,
  age_label = excluded.age_label,
  price_cents = excluded.price_cents,
  capacity = excluded.capacity,
  status = excluded.status,
  updated_at = now();


-- Primeiro administrador aprovado para o módulo.
-- O acesso é passwordless via Supabase Auth; a lista não é exposta ao cliente.
insert into public.admin_emails (email, active)
values ('gabrieldeblegd@gmail.com', true)
on conflict (email) do update set active = excluded.active;
