-- Ticketcode COMERCIAL — schema inicial
-- Proyecto Supabase separado del de EVE.

create extension if not exists "pgcrypto";

-- =========================================================
-- Perfiles (equipo comercial)
-- =========================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'comercial' check (role in ('comercial', 'admin')),
  created_at timestamptz not null default now()
);

create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =========================================================
-- Catálogo (se siembra desde los Excel; editable solo por admin)
-- =========================================================

-- Ítems de plataforma: "Componentes básicos", "Servicios personalizados",
-- "Opcionales" — todo lo que hoy vive en las hojas Presenciales / Virtuales /
-- Híbridos / Opcionales del Excel "Componentes para propuesta Integral".
create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  modality text not null check (modality in ('presencial', 'virtual', 'hibrido', 'mundo_virtual', 'general')),
  category text not null check (category in ('componente_basico', 'servicio_personalizado', 'opcional', 'ia')),
  name text not null,
  description text,
  unit text not null default 'incluido' check (unit in ('incluido', 'por_dia', 'por_persona', 'por_unidad', 'fijo')),
  has_price boolean not null default false,
  default_unit_price numeric(14, 2),
  default_included boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Rubros de logística/costos (hoja "Rubros Logistica" del Tarifario).
create table logistics_rate_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  unit text not null default 'por_dia' check (unit in ('por_dia', 'por_persona', 'por_unidad', 'fijo')),
  default_unit_cost numeric(14, 2) not null default 0,
  city text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Escalas por aforo (hoja "Escalas").
create table aforo_scales (
  id uuid primary key default gen_random_uuid(),
  city text,
  min_assistants integer not null,
  max_assistants integer,
  conversion_rate_pct numeric(5, 2),
  staffing_rules jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

-- Tiers del Acuerdo Comercial (Aliado estratégico, Menciones, etc.).
create table commercial_agreement_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_pct numeric(5, 2) not null default 0,
  sort_order integer not null default 0
);

-- =========================================================
-- Clientes y propuestas
-- =========================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  nit text,
  contact_name text,
  contact_email text,
  contact_phone text,
  city text,
  created_at timestamptz not null default now()
);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  owner_id uuid references profiles (id) on delete set null,
  event_name text not null,
  modality text not null check (modality in ('presencial', 'virtual', 'hibrido', 'mundo_virtual')),
  city text,
  event_start_date date,
  event_end_date date,
  aforo integer,
  status text not null default 'tarifario' check (status in ('tarifario', 'propuesta', 'contrato', 'cerrada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Paso 1 — Tarifario: costeo interno. Cada fila es un rubro de logística
-- (del catálogo o libre) que se puede incluir/excluir con su costo.
create table proposal_cost_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  logistics_rate_item_id uuid references logistics_rate_items (id) on delete set null,
  label text not null,
  included boolean not null default true,
  quantity numeric(10, 2) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  unit_price numeric(14, 2) not null default 0,
  notes text,
  sort_order integer not null default 0
);

-- Paso 2 — Propuesta: selección de componentes/opcionales que ve el
-- cliente. "included" reemplaza el borrado manual de filas antes de
-- copiar al PPT.
create table proposal_catalog_selections (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  catalog_item_id uuid not null references catalog_items (id) on delete cascade,
  included boolean not null default true,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(14, 2),
  unique (proposal_id, catalog_item_id)
);

create table proposal_commercial_agreement (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  tier_id uuid references commercial_agreement_tiers (id) on delete set null,
  label text not null,
  pct numeric(5, 2) not null default 0,
  notes text,
  sort_order integer not null default 0
);

-- Paso 2 — Cronograma (se pre-llena por modalidad, editable).
create table proposal_schedule_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  week_number integer not null,
  hito text not null,
  comentario text,
  sort_order integer not null default 0
);

-- Paso 3 — Contrato: datos legales que faltan por capturar.
create table proposal_contract_fields (
  proposal_id uuid primary key references proposals (id) on delete cascade,
  contratante_nombre text,
  contratante_cedula text,
  contratante_nit text,
  contratante_ciudad text,
  contratante_representante_legal text,
  contrato_numero text,
  contrato_fecha date,
  objeto text,
  valor_total numeric(14, 2),
  updated_at timestamptz not null default now()
);

create function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger proposals_set_updated_at
  before update on proposals
  for each row execute procedure set_updated_at();

create trigger proposal_contract_fields_set_updated_at
  before update on proposal_contract_fields
  for each row execute procedure set_updated_at();

-- =========================================================
-- RLS — cualquier usuario autenticado del equipo comercial puede
-- leer/escribir propuestas y sus tablas hijas. El catálogo es de
-- solo lectura para comercial (se siembra/edita con service role).
-- =========================================================
alter table profiles enable row level security;
alter table catalog_items enable row level security;
alter table logistics_rate_items enable row level security;
alter table aforo_scales enable row level security;
alter table commercial_agreement_tiers enable row level security;
alter table clients enable row level security;
alter table proposals enable row level security;
alter table proposal_cost_items enable row level security;
alter table proposal_catalog_selections enable row level security;
alter table proposal_commercial_agreement enable row level security;
alter table proposal_schedule_items enable row level security;
alter table proposal_contract_fields enable row level security;

create policy "profiles: self read" on profiles for select using (auth.uid() = id);
create policy "profiles: self update" on profiles for update using (auth.uid() = id);

create policy "catalog_items: authenticated read" on catalog_items for select using (auth.role() = 'authenticated');
create policy "logistics_rate_items: authenticated read" on logistics_rate_items for select using (auth.role() = 'authenticated');
create policy "aforo_scales: authenticated read" on aforo_scales for select using (auth.role() = 'authenticated');
create policy "commercial_agreement_tiers: authenticated read" on commercial_agreement_tiers for select using (auth.role() = 'authenticated');

create policy "clients: authenticated all" on clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposals: authenticated all" on proposals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposal_cost_items: authenticated all" on proposal_cost_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposal_catalog_selections: authenticated all" on proposal_catalog_selections for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposal_commercial_agreement: authenticated all" on proposal_commercial_agreement for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposal_schedule_items: authenticated all" on proposal_schedule_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proposal_contract_fields: authenticated all" on proposal_contract_fields for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
