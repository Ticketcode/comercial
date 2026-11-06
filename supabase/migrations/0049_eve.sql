-- EVE, la IA de eventos de Ticketcode.
--   con_eve: la propuesta lleva EVE. Las propuestas que ya existen quedan en false para que sus precios no cambien;
--            las nuevas se crean con true (todos los eventos llevan EVE).
--   solo_eve: se cotiza únicamente la IA: sin plataforma, logística ni servicios adicionales.
--   eve_acompanamiento / eve_qty_equipo: acompañamiento en sitio solo para EVE (se calcula como la logística, con ciudad y días).
alter table proposals
  add column if not exists con_eve boolean not null default false,
  add column if not exists solo_eve boolean not null default false,
  add column if not exists eve_acompanamiento boolean not null default false,
  add column if not exists eve_qty_equipo integer not null default 3 check (eve_qty_equipo between 0 and 20);

-- Las propuestas que ya existen siguen sin EVE; de aquí en adelante toda propuesta nueva nace con EVE.
alter table proposals alter column con_eve set default true;

-- Tarifas de EVE: editables como el resto de tarifas, sin cifras fijas en el código.
insert into logistics_rate_items (category, name, unit, default_unit_cost, notes, sort_order)
select 'eve', v.name, v.unit, v.cost, v.notes, v.ord
from (values
  ('EVE - Fee fijo', 'fijo', 2000000, 'Fee fijo por evento', 1),
  ('EVE - Valor por asistente', 'por_persona', 7000, 'Se multiplica por el aforo total del evento (presencial + virtual)', 2)
) as v(name, unit, cost, notes, ord)
where not exists (select 1 from logistics_rate_items r where r.name = v.name);

-- Patrocinios conectados: un concepto más del Acuerdo comercial (sin porcentaje de descuento; el reparto va en la nota).
insert into commercial_agreement_tiers (name, description, default_pct, sort_order)
select 'Patrocinios conectados con EVE',
       'Ticketcode diseña, opera y entrega paquetes de patrocinio conectados con EVE (Bronce, Plata y Oro). Lo recaudado se reparte entre el organizador y Ticketcode desde el primer paquete vendido; el pago de EVE no depende de las ventas.',
       0, 5
where not exists (select 1 from commercial_agreement_tiers where name = 'Patrocinios conectados con EVE');
