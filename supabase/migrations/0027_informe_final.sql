-- Informe final de producción: un resumen gerencial por evento con las
-- cifras clave (actividades, presupuesto, viáticos/legalización, cuentas de
-- cobro) y un análisis redactado con IA a partir de esas cifras más las
-- novedades que reporte el equipo. Una sola fila por proposal_id.
create table informe_final (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals (id) on delete cascade,
  notas_actividades text,
  notas_viaticos text,
  notas_presupuesto text,
  notas_generales text,
  analisis_ia text,
  generado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger informe_final_set_updated_at
  before update on informe_final
  for each row execute procedure set_updated_at();

alter table informe_final enable row level security;

create policy "informe_final: produccion/admin all" on informe_final for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
