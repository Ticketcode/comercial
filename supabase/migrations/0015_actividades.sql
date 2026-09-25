-- Actividades de producción — recrea la estructura real del ClickUp del
-- equipo: 6 categorías fijas (Producción, Actividades Logísticas,
-- Actividades Operativas, Proveedores, Administrativo, Área Técnica), cada
-- una con tareas etiquetadas por momento (antes/durante/después del
-- evento), que pueden tener checklists agrupados (como en ClickUp: una
-- tarea puede tener 1+ grupos de checklist, cada uno con sus ítems).
--
-- `parent_activity_id` deja espacio para subtareas anidadas (varias tareas
-- del ClickUp real las tienen) aunque la UI inicial no las construye
-- todavía — se agrega cuando se necesite.

create table proposal_activities (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  parent_activity_id uuid references proposal_activities (id) on delete cascade,
  categoria text not null check (categoria in (
    'produccion', 'actividades_logisticas', 'actividades_operativas',
    'proveedores', 'administrativo', 'area_tecnica'
  )),
  nombre text not null,
  momento text check (momento in ('antes_evento', 'durante_evento', 'despues_evento')),
  responsable text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'completada')),
  fecha_limite date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table proposal_activity_checklist_groups (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references proposal_activities (id) on delete cascade,
  nombre text not null,
  sort_order int not null default 0
);

create table proposal_activity_checklist_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references proposal_activity_checklist_groups (id) on delete cascade,
  texto text not null,
  completado boolean not null default false,
  sort_order int not null default 0
);

create trigger proposal_activities_set_updated_at
  before update on proposal_activities
  for each row execute procedure set_updated_at();

alter table proposal_activities enable row level security;
alter table proposal_activity_checklist_groups enable row level security;
alter table proposal_activity_checklist_items enable row level security;

create policy "proposal_activities: produccion/admin all" on proposal_activities for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));

create policy "proposal_activity_checklist_groups: produccion/admin all" on proposal_activity_checklist_groups for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));

create policy "proposal_activity_checklist_items: produccion/admin all" on proposal_activity_checklist_items for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('produccion', 'admin')));
