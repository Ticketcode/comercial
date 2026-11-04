-- Dos datos del diagnóstico que cambian lo que lleva la propuesta:
--  * con_logistica: si el evento lleva logística 360 (personal, equipos y viáticos en sitio). Sin logística el
--    cálculo de Logística 360 da cero y no se muestran sus paquetes.
--  * vende_boletas: si el evento vende boletas por la plataforma (módulo de venta de boletería, pasarela, etc.).
alter table proposals
  add column if not exists con_logistica boolean not null default true,
  add column if not exists vende_boletas boolean not null default true;
