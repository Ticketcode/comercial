-- Cuentas de cobro — independiente de Viáticos (confirmado: "los viaticos no
-- tienen nada que ver con las cuentas de cobro"). Los datos y valores se
-- cargan desde un archivo Excel plano que el equipo de producción sube por
-- evento; de ahí se genera el paquete de cuentas de cobro (.docx, una por
-- persona) list para firmar y enviar junto con el informe. Empresa
-- contratante fija: DEYRA S.A.S. (confirmado).

create table cuentas_cobro (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  nombre_completo text not null,
  cedula text not null,
  ciudad_expedicion_cedula text,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  concepto text not null,
  valor numeric not null default 0,
  ciudad_evento text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'firmada')),
  fecha_firma date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cuentas_cobro_set_updated_at
  before update on cuentas_cobro
  for each row execute procedure set_updated_at();

alter table cuentas_cobro enable row level security;

create policy "cuentas_cobro: produccion/admin all" on cuentas_cobro for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
