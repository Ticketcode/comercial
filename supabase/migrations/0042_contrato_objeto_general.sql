-- Permite editar por contrato la cláusula PRIMERA (objeto general). NULL = se
-- usa el texto del formato (lib/data/contrato-objeto.ts). La plantilla del
-- contrato pasa a traer la variable {objeto_general} en lugar del texto fijo.
alter table proposal_contract_fields
  add column objeto_general text;
