-- Presupuesto de producción — reproduce la hoja real de Excel (Proyectado
-- inicial, Presupuesto ajustado, Transferido, Ejecución), pero Subtotales
-- por categoría y Diferencia se calculan SIEMPRE en la app a partir de las
-- líneas (nunca se digitan a mano ni se desactualizan, a diferencia del
-- Excel original que tenía celdas sueltas y hasta errores #REF!). La
-- sección de "Rentabilidad/Imprevistos" del Excel no se replica: estaba
-- rota (#REF!, porcentajes negativos) y no aporta al seguimiento diario.

alter table proposals add column aforo_real integer;

create table presupuesto_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  categoria text not null,
  nombre text not null,
  dias_proyectado numeric,
  cantidad_proyectado numeric,
  valor_unitario_proyectado numeric,
  iva_proyectado numeric,
  total_proyectado numeric not null default 0,
  dias_ajustado numeric,
  cantidad_ajustado numeric,
  valor_unitario_ajustado numeric,
  iva_ajustado numeric,
  total_ajustado numeric not null default 0,
  transferido_fecha date,
  transferido_a text,
  ejecucion_valor numeric not null default 0,
  comentario text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger presupuesto_items_set_updated_at
  before update on presupuesto_items
  for each row execute procedure set_updated_at();

alter table presupuesto_items enable row level security;

create policy "presupuesto_items: produccion/admin all" on presupuesto_items for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
