-- Estado de cada pregunta del Diagnóstico guiado: { "<pregunta>": "ia" | "ok" | "na" }.
-- Sin entrada = pendiente. "ia" = lo propuso Claude y falta confirmar; "ok" = confirmado
-- por el asesor; "na" = el asesor marcó que no aplica.
alter table proposals
  add column if not exists diagnostico_estado jsonb not null default '{}'::jsonb;
