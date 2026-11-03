-- Versiones de una propuesta (V1, V2, ...). Cada versión guarda una foto
-- completa de los datos con los que se arma la Presentación (snapshot) y los
-- totales ya calculados, para poder verla, compararla y aceptarla sin que
-- cambie aunque después se edite la propuesta o se muevan las tarifas.
--
-- Solo una versión por propuesta puede ser la "final": la que se envía al
-- cliente para que la acepte. La aceptación se registra sobre esa versión y
-- el Contrato parte de ella.
create table proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  version_number integer not null,
  note text,
  is_final boolean not null default false,
  status text not null default 'borrador' check (status in ('borrador', 'enviada', 'aceptada')),
  -- Totales al momento de guardar (pesos).
  valor_inicial numeric(14, 2) not null,
  descuento_pct numeric(5, 2) not null default 0,
  valor_antes_iva numeric(14, 2) not null,
  iva numeric(14, 2) not null default 0,
  total_con_iva numeric(14, 2) not null,
  snapshot jsonb not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_cargo text,
  acceptance_note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);

create unique index proposal_versions_una_final on proposal_versions (proposal_id) where is_final;
create index proposal_versions_proposal_idx on proposal_versions (proposal_id, version_number);

alter table proposal_versions enable row level security;
create policy "proposal_versions: authenticated all" on proposal_versions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
