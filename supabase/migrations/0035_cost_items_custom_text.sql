-- Permite sobreescribir el título/descripción de un servicio personalizado
-- por-propuesta (sin tocar el catálogo general) desde el lápiz de edición
-- en Propuesta, igual que ya existe para componentes básicos / logística 360.
alter table proposal_cost_items
  add column custom_name text,
  add column custom_description text;
