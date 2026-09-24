-- Ajustes grandes al paso 2 (Propuesta), pedidos tras revisar el diseño:
--
-- 1) Perfil del evento necesitaba el campo "Lugar" (venue), no solo ciudad.
-- 2) El Acuerdo Comercial tiene un % global (el descuento real que se
--    aplica) y 5 conceptos cuyo peso % debe sumar 100 entre ellos (son la
--    composición interna del global, no descuentos adicionales).
-- 3) El modelo de pagos pasa a ser una lista dinámica de hitos (no 4 fijos).
-- 4) Los requerimientos operativos pasan de un textarea a una lista de
--    ítems editables.
-- 5) Los "Componentes básicos" y "Logística 360" que ve el cliente ahora
--    viven en catalog_items (categoría nueva 'logistica_360') y se
--    seleccionan por propuesta en proposal_catalog_selections (ya existía
--    la tabla, faltaba usarla).

alter table proposals
  add column lugar text,
  add column acuerdo_comercial_pct_global numeric(5, 2) not null default 0;

alter table catalog_items drop constraint catalog_items_category_check;
alter table catalog_items add constraint catalog_items_category_check
  check (category in ('componente_basico', 'servicio_personalizado', 'opcional', 'ia', 'logistica_360'));

create table proposal_payment_milestones (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  label text not null,
  pct numeric(5, 2) not null default 0,
  sort_order integer not null default 0
);
alter table proposal_payment_milestones enable row level security;
create policy "proposal_payment_milestones: authenticated all" on proposal_payment_milestones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table proposal_operational_requirements (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  text text not null,
  sort_order integer not null default 0
);
alter table proposal_operational_requirements enable row level security;
create policy "proposal_operational_requirements: authenticated all" on proposal_operational_requirements
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
