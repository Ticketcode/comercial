-- Legalización pasa a ser por persona del staff (igual que Viáticos): cada
-- integrante diligencia su propia legalización contra su propio anticipo
-- (viatico_anticipos). No hay datos reales todavía en estas dos tablas, así
-- que se recrean en vez de migrar filas.
drop table legalizacion_gastos;
drop table legalizacion_meta;

create table legalizacion_meta (
  proposal_id uuid not null references proposals (id) on delete cascade,
  staff_id uuid not null references event_staff (id) on delete cascade,
  responsable text,
  actividad text,
  ciudad_elaboracion text,
  fecha_elaboracion date,
  updated_at timestamptz not null default now(),
  primary key (proposal_id, staff_id)
);

create table legalizacion_gastos (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  staff_id uuid not null references event_staff (id) on delete cascade,
  fecha date,
  numero_recibo text,
  tercero text,
  rubro text,
  concepto text,
  valor numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger legalizacion_meta_set_updated_at
  before update on legalizacion_meta
  for each row execute procedure set_updated_at();

create trigger legalizacion_gastos_set_updated_at
  before update on legalizacion_gastos
  for each row execute procedure set_updated_at();

alter table legalizacion_meta enable row level security;
alter table legalizacion_gastos enable row level security;

create policy "legalizacion_meta: produccion/admin all" on legalizacion_meta for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));

create policy "legalizacion_gastos: produccion/admin all" on legalizacion_gastos for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
