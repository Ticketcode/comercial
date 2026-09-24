-- Faltaba la ciudad de residencia del representante legal del contratante
-- (distinta de la ciudad de domicilio de la empresa).
alter table proposal_contract_fields
  add column contratante_direccion_ciudad text;
