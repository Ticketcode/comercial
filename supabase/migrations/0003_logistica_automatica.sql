-- La Logística 360 no se marca ítem por ítem: se calcula sola a partir de
-- los "Datos del evento" (días, aforo, ciudad, modalidad) más una dotación
-- de personal/equipos por defecto que el comercial casi nunca toca (según
-- confirmó el usuario). Estas columnas reemplazan el prellenado manual de
-- proposal_cost_items para los rubros de logística.
alter table proposals
  add column aforo_virtual integer not null default 0,
  add column visita_preoperativa_dias numeric(4, 1) not null default 1,
  add column qty_logistico numeric(6, 2) not null default 10,
  add column qty_supervisor numeric(6, 2) not null default 2,
  add column qty_logistica_salones_internos numeric(6, 2) not null default 0,
  add column qty_productor numeric(6, 2) not null default 1,
  add column qty_transporte_aeropuerto numeric(6, 2) not null default 2,
  add column qty_computadores numeric(6, 2) not null default 10,
  add column qty_impresoras numeric(6, 2) not null default 10,
  add column qty_rollos_labels numeric(6, 2) not null default 15,
  add column extra_camisetas_staff boolean not null default false,
  add column extra_lavado_chalecos boolean not null default false,
  add column extra_compra_agua boolean not null default false,
  add column extra_compra_bloqueador_solar boolean not null default false,
  add column extra_actividad_cierre boolean not null default false;
