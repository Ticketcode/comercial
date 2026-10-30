-- Permite fijar manualmente la tasa de IVA y la base gravable en el resumen
-- del Tarifario (por defecto ambas quedan en null y el cálculo sigue siendo
-- 19% sobre el valor propuesta final, igual que siempre).
alter table proposals
  add column iva_rate_override numeric,
  add column base_gravable_override numeric;
