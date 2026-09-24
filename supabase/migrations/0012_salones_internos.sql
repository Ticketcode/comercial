-- Cada salón interno necesita una cantidad de logísticos según SU PROPIO
-- aforo (no un logístico fijo por salón): 0-100 → 1, 100-400 → 2,
-- 400-800 → 3, más de 800 → 4. Se guarda el aforo de cada salón (un
-- arreglo, uno por cada salón habilitado en el servicio "Módulo para
-- obtención de datos en diferentes sitios simultáneos").
alter table proposals
  add column salones_internos_aforos jsonb not null default '[]'::jsonb;
