-- Parámetros de rentabilidad de la propuesta (hoja "Tarifario", celdas de
-- "Datos del evento"). El Tarifario no tiene precio por ítem: se suman los
-- costos incluidos y se aplica una rentabilidad global + comisiones.
alter table proposals
  add column rentabilidad_pct numeric(5, 2) not null default 0.40,
  add column comision_director_pct numeric(5, 2) not null default 0.10,
  add column comision_asesor_pct numeric(5, 2) not null default 0.05,
  add column tasa_conversion_pct numeric(5, 2) not null default 0.45;
