-- Escalas de precio por tramos: Honorarios Productor (por aforo) y
-- Escarapelas/Manillas (por cantidad, el precio por unidad baja entre más
-- se pida). Antes vivían hardcodeadas en el código; ahora son editables
-- desde /catalog igual que el resto del catálogo.
create table price_scale_items (
  id uuid primary key default gen_random_uuid(),
  scale_group text not null check (
    scale_group in (
      'honorarios_productor',
      'escarapelas_colaminada',
      'escarapelas_tinta_16mm',
      'manillas_full_color'
    )
  ),
  tier_min integer not null,
  tier_max integer,
  unit_value numeric(14, 4) not null,
  sort_order integer not null default 0
);

alter table price_scale_items enable row level security;

create policy "price_scale_items: authenticated read" on price_scale_items
  for select using (auth.role() = 'authenticated');
