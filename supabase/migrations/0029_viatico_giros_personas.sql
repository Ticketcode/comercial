-- Honorarios se paga por N logísticos x N días, no solo por días: se
-- agrega "personas" como multiplicador opcional (solo aplica a ese rubro;
-- en el resto de rubros queda null y el cálculo de monto no cambia).
alter table viatico_giros
  add column personas numeric;
