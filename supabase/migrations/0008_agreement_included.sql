-- Cada tier del Acuerdo Comercial se activa/desactiva por propuesta
-- (igual que el resto del catálogo), faltaba esta columna.
alter table proposal_commercial_agreement
  add column included boolean not null default false;
