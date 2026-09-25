-- Rediseño de Viáticos: el anticipo NO se escribe a mano — se calcula
-- automáticamente con las MISMAS tarifas del Tarifario (Transporte,
-- Alimentación y hotel, Honorarios del equipo, Varios), porque así es como
-- opera la empresa: al Productor se le gira transporte/alimentación de todo
-- el equipo + honorarios de todo el equipo (menos el suyo, que se liquida
-- aparte por cuenta de cobro) + varios. Equipos NO entra al anticipo.
--
-- Lo único manual es el registro de los GIROS reales (a quién, cuánto,
-- cuándo) contra ese anticipo calculado — puede ser un solo giro o varios
-- (ej. anticipo parcial + saldo).

drop policy "viaticos: produccion/admin all" on viaticos;
drop table viaticos;

create table viatico_giros (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  staff_id uuid not null references event_staff (id) on delete cascade,
  monto numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'girado')),
  fecha_giro date,
  notas text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger viatico_giros_set_updated_at
  before update on viatico_giros
  for each row execute procedure set_updated_at();

alter table viatico_giros enable row level security;

create policy "viatico_giros: produccion/admin all" on viatico_giros for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
