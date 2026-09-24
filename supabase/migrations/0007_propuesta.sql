-- Paso 2 (Propuesta): modelo de pagos (4 hitos, % editable) y
-- requerimientos operativos (texto libre, prellenado con la plantilla).
alter table proposals
  add column pago_pct_1 numeric(5, 2) not null default 10,
  add column pago_pct_2 numeric(5, 2) not null default 50,
  add column pago_pct_3 numeric(5, 2) not null default 30,
  add column pago_pct_4 numeric(5, 2) not null default 10,
  add column requerimientos_operativos text;

-- Tiers del Acuerdo Comercial (hoja "Acuerdo Comercial" / deck slides 18-19).
insert into commercial_agreement_tiers (name, description, default_pct, sort_order) values
  ('Aliado estratégico', 'Presencia en la web del evento como aliado principal, presencia de marca exclusiva, counter/espacio de registro, video de registro (brief entregado por Ticketcode).', 30, 0),
  ('Menciones - Conexiones de valor', 'Publicaciones y colaboración en redes sociales, menciones en comunicados de prensa/radio/TV, presencia de marca en pantallas, citas con tomadores de decisión de la industria.', 20, 1),
  ('Invitaciones especiales', 'Entradas VIP / All Access y entradas generales para el aliado.', 20, 2),
  ('Hospitalidad', 'Alimentación (almuerzo/refrigerio) para personal de logística y staff, tiquetes aéreos, acomodación en hoteles.', 30, 3),
  ('Suministro personal logístico', 'Personal de apoyo logístico (ej. 6 personas), pago de honorarios, alimentación y transporte a cargo del aliado.', 30, 4);
