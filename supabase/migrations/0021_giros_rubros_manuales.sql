-- Los giros de Viáticos pasan a ser líneas manuales (rubro, concepto,
-- cantidad, valor unitario) en vez de un solo monto sin desglose — el
-- equipo de producción arma la lista libremente, no queda forzado al
-- cálculo 100% automático desde Tarifario (útil sobre todo para eventos
-- operativos que entran directo a Producción sin pasar por el Tarifario).
alter table viatico_giros
  add column rubro text,
  add column concepto text,
  add column cantidad numeric not null default 1,
  add column valor_unitario numeric not null default 0;
