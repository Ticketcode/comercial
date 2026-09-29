-- No todos los rubros del Presupuesto llevan IVA — se marca por ítem, y el
-- Total (Proyectado inicial / Presupuesto ajustado) pasa a calcularse
-- siempre en la app como dias × cantidad × valor_unitario (+ 19% si aplica
-- IVA), en vez de digitarse a mano.
alter table presupuesto_items
  add column iva_aplica boolean not null default false;
