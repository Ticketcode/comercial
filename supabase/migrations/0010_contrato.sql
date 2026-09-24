-- Paso 3 (Contrato): campos adicionales necesarios para llenar
-- "Plantilla Contrato 2026.docx" completa. Los datos del CONTRATISTA
-- (Ticketcode/DEYRA S.A.S.) quedan fijos en el template — no se piden acá.
alter table proposal_contract_fields
  add column contratante_cedula_ciudad text,
  add column contratante_direccion text,
  add column ciudad_firma text not null default 'Bogotá D.C.',
  add column fecha_firma date,
  add column plazo_inicio date,
  add column plazo_fin date,
  add column tiempo_servicio_inicio date,
  add column tiempo_servicio_fin date,
  add column objeto_particular text;
