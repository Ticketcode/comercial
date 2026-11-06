-- EVE: el valor por asistente baja según el aforo total del evento (un evento grande no paga lo mismo por persona).
--   hasta 1.000 asistentes:     $3.000 por asistente
--   de 1.001 a 4.999:           $2.800
--   de 5.000 a 10.000:          $2.500
--   más de 10.000:              $2.000
-- El valor del tramo se aplica a todos los asistentes del evento. Mientras estas filas no existan, se usa la tarifa plana
-- "EVE - Valor por asistente".
insert into logistics_rate_items (category, name, unit, default_unit_cost, notes, sort_order)
select 'eve', v.name, 'por_persona', v.cost, v.notes, v.ord
from (values
  ('EVE - Asistente hasta 1000', 3000, 'Valor por asistente si el aforo total es de hasta 1.000', 3),
  ('EVE - Asistente hasta 4999', 2800, 'Valor por asistente si el aforo total es de 1.001 a 4.999', 4),
  ('EVE - Asistente hasta 10000', 2500, 'Valor por asistente si el aforo total es de 5.000 a 10.000', 5),
  ('EVE - Asistente más de 10000', 2000, 'Valor por asistente si el aforo total supera los 10.000', 6)
) as v(name, cost, notes, ord)
where not exists (select 1 from logistics_rate_items r where r.name = v.name);
