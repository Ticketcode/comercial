-- "Días" es un campo explícito de "Datos del evento" en el Tarifario
-- (no se deriva de las fechas de inicio/fin).
alter table proposals
  add column dias numeric(4, 1) not null default 1;
