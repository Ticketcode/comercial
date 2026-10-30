-- Permite sobreescribir el título/descripción de un componente por-propuesta
-- (sin tocar el catálogo general) desde el lápiz de edición en Propuesta.
alter table proposal_catalog_selections
  add column custom_name text,
  add column custom_description text;
