-- Permite ocultar diapositivas completas de la Presentación (por grupo:
-- "informes", "casos", "cronograma", etc.) sin borrar los datos de origen —
-- "eliminar" una diapositiva es ocultarla permanentemente, reversible.
alter table proposals
  add column presentacion_hidden_slides text[] not null default '{}';
