-- Rediseño del cronograma: semanas en filas, días en columnas (configurables,
-- se puede dejar como bloque de toda la semana o desglosar por día).
-- day_number = null significa "toda la semana" (bloque grande); con número,
-- es el hito de ese día puntual dentro de la semana.
alter table proposal_schedule_items
  add column day_number integer;

-- Cantidad de semanas/columnas de día configuradas para esta propuesta —
-- independiente de si ya tienen hitos cargados, para poder crear una semana
-- o columna de día vacía desde la UI. Null = se calcula del contenido
-- existente (comportamiento de siempre).
alter table proposals
  add column cronograma_semanas integer,
  add column cronograma_dias integer;
