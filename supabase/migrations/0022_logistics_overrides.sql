-- Permite forzar a mano el valor de un rubro puntual del desglose de
-- Logística 360 en el Tarifario, para casos donde el cálculo automático no
-- aplica. Se guarda como { "<label del rubro>": <valor forzado> }.
alter table proposals
  add column logistics_overrides jsonb not null default '{}'::jsonb;
