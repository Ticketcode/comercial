-- Módulo de Producción (fase 1: viáticos) — separado del flujo comercial.
-- Un evento "ganado" (proposals.status = 'cerrada') pasa a producción,
-- donde un equipo distinto (role = 'produccion') registra el personal
-- asignado y los viáticos a girar por contabilidad. La legalización de
-- viáticos (soportes/facturas) queda para una fase siguiente.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('comercial', 'produccion', 'admin'));

create table event_staff (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  full_name text not null,
  cargo text,
  cedula text,
  telefono text,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table viaticos (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  staff_id uuid not null references event_staff (id) on delete cascade,
  concepto text not null default 'viaticos',
  descripcion text,
  dias numeric not null default 1,
  valor_dia numeric not null default 0,
  valor_total numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'girado')),
  fecha_giro date,
  notas text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger viaticos_set_updated_at
  before update on viaticos
  for each row execute procedure set_updated_at();

alter table event_staff enable row level security;
alter table viaticos enable row level security;

-- Solo producción y admin pueden ver/editar estas tablas — separado del
-- equipo comercial, que sigue viendo únicamente tarifario/propuesta/contrato.
create policy "event_staff: produccion/admin all" on event_staff for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));

create policy "viaticos: produccion/admin all" on viaticos for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
