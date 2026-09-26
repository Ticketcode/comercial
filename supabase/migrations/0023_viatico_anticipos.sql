-- Cuadro aparte para registrar los anticipos/valores girados a cada
-- integrante del equipo, con su fecha de transacción — separado del
-- desglose de rubros de viatico_giros (que es el presupuesto por rubro,
-- no el registro de qué se giró realmente).
create table viatico_anticipos (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  staff_id uuid not null references event_staff (id) on delete cascade,
  fecha date,
  valor numeric(14, 2) not null default 0,
  notas text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger viatico_anticipos_set_updated_at
  before update on viatico_anticipos
  for each row execute procedure set_updated_at();

alter table viatico_anticipos enable row level security;

create policy "viatico_anticipos: produccion/admin all" on viatico_anticipos for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
