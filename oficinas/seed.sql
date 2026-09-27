-- Socializando — oficinas iniciais v4.6.0
-- Dados aprovados em 26/09/2026.
-- Não altera artes ou conteúdo criativo; apenas cadastra dados operacionais.

insert into public.workshops (
  slug,
  title,
  short_description,
  event_date,
  start_time,
  end_time,
  age_label,
  price_cents,
  capacity,
  status,
  image_url
) values
(
  'expedicao-jurassica-2026-10-10',
  'Expedição Jurássica',
  'Monte, explore e crie seu dinossauro!',
  '2026-10-10',
  '14:00',
  '15:30',
  'A partir de 5 anos',
  5000,
  15,
  'open',
  null
),
(
  'fabrica-dos-squishs-magicos-2026-10-10',
  'Fábrica dos Squishs Mágicos',
  'Oficina de Paper Squish especial do Dia das Crianças.',
  '2026-10-10',
  '15:30',
  '17:00',
  'A partir de 5 anos',
  5000,
  15,
  'open',
  null
)
on conflict (slug) do update set
  title = excluded.title,
  short_description = excluded.short_description,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  age_label = excluded.age_label,
  price_cents = excluded.price_cents,
  capacity = excluded.capacity,
  status = excluded.status,
  updated_at = now();
