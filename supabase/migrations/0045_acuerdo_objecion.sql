-- Objeción del cliente que originó el acuerdo comercial (texto libre del asesor).
-- Claude la lee para sugerir el descuento y los conceptos del acuerdo.
alter table proposals
  add column if not exists acuerdo_objecion text;
