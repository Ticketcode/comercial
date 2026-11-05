-- Vigencia de la oferta en días, contados desde la fecha de la propuesta. Se muestra en la lámina de inversión
-- ("Oferta válida hasta …") y se puede cambiar desde la Presentación o con NOVA.
alter table proposals
  add column if not exists vigencia_dias integer not null default 15
  check (vigencia_dias between 1 and 90);
