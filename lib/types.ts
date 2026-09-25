export type Modality = "presencial" | "virtual" | "hibrido" | "mundo_virtual";
export type CatalogModality = Modality | "general";
export type CatalogCategory =
  | "componente_basico"
  | "servicio_personalizado"
  | "opcional"
  | "ia"
  | "logistica_360";
export type ProposalStatus = "tarifario" | "propuesta" | "contrato" | "cerrada";
export type ProfileRole = "comercial" | "produccion" | "admin";
export type ViaticoEstado = "pendiente" | "girado";

export interface Profile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  nit: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  client_id: string | null;
  owner_id: string | null;
  event_name: string;
  modality: Modality;
  city: string | null;
  lugar: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  aforo: number | null;
  aforo_real: number | null;
  status: ProposalStatus;
  rentabilidad_pct: number;
  comision_director_pct: number;
  comision_asesor_pct: number;
  tasa_conversion_pct: number;
  aforo_virtual: number;
  dias: number;
  visita_preoperativa_dias: number;
  qty_logistico: number;
  qty_supervisor: number;
  qty_logistica_salones_internos: number;
  qty_productor: number;
  qty_transporte_aeropuerto: number;
  qty_computadores: number;
  qty_impresoras: number;
  qty_rollos_labels: number;
  extra_camisetas_staff: boolean;
  extra_lavado_chalecos: boolean;
  extra_compra_agua: boolean;
  extra_compra_bloqueador_solar: boolean;
  extra_actividad_cierre: boolean;
  salones_internos_aforos: number[];
  logistics_overrides: Record<string, { dias?: number; quantity?: number }>;
  pago_pct_1: number;
  pago_pct_2: number;
  pago_pct_3: number;
  pago_pct_4: number;
  requerimientos_operativos: string | null;
  acuerdo_comercial_pct_global: number;
  created_at: string;
  updated_at: string;
}

export interface ProposalPaymentMilestone {
  id: string;
  proposal_id: string;
  label: string;
  pct: number;
  sort_order: number;
}

export interface ProposalOperationalRequirement {
  id: string;
  proposal_id: string;
  text: string;
  sort_order: number;
}

export interface CatalogItem {
  id: string;
  modality: CatalogModality;
  category: CatalogCategory;
  name: string;
  description: string | null;
  unit: "incluido" | "por_dia" | "por_persona" | "por_unidad" | "fijo";
  has_price: boolean;
  default_unit_price: number | null;
  default_included: boolean;
  sort_order: number;
}

export interface LogisticsRateItem {
  id: string;
  category: string;
  name: string;
  unit: "por_dia" | "por_persona" | "por_unidad" | "fijo";
  default_unit_cost: number;
  city: string | null;
  notes: string | null;
  sort_order: number;
}

export interface ProposalCostItem {
  id: string;
  proposal_id: string;
  logistics_rate_item_id: string | null;
  label: string;
  included: boolean;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  notes: string | null;
  sort_order: number;
}

export interface CommercialAgreementTier {
  id: string;
  name: string;
  description: string | null;
  default_pct: number;
  sort_order: number;
}

export interface ProposalCommercialAgreement {
  id: string;
  proposal_id: string;
  tier_id: string | null;
  label: string;
  pct: number;
  included: boolean;
  notes: string | null;
  sort_order: number;
}

export interface ProposalCatalogSelection {
  id: string;
  proposal_id: string;
  catalog_item_id: string;
  included: boolean;
  quantity: number;
  unit_price: number | null;
}

export interface ProposalScheduleItem {
  id: string;
  proposal_id: string;
  week_number: number;
  hito: string;
  comentario: string | null;
  sort_order: number;
}

export type PriceScaleGroup =
  | "honorarios_productor"
  | "escarapelas_colaminada"
  | "escarapelas_tinta_16mm"
  | "manillas_full_color";

export interface PriceScaleItem {
  id: string;
  scale_group: PriceScaleGroup;
  tier_min: number;
  tier_max: number | null;
  unit_value: number;
  sort_order: number;
}

export interface EventStaff {
  id: string;
  proposal_id: string;
  full_name: string;
  cargo: string | null;
  cedula: string | null;
  telefono: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  sort_order: number;
  created_at: string;
}

export interface ViaticoGiro {
  id: string;
  proposal_id: string;
  staff_id: string;
  rubro: string | null;
  concepto: string | null;
  cantidad: number;
  valor_unitario: number;
  monto: number;
  estado: ViaticoEstado;
  fecha_giro: string | null;
  notas: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ActivityMomento = "antes_evento" | "durante_evento" | "despues_evento";
export type ActivityCategoria =
  | "produccion"
  | "actividades_logisticas"
  | "actividades_operativas"
  | "proveedores"
  | "administrativo"
  | "area_tecnica";
export type ActivityEstado = "pendiente" | "en_curso" | "completada";

export interface ProposalActivity {
  id: string;
  proposal_id: string;
  parent_activity_id: string | null;
  categoria: ActivityCategoria;
  nombre: string;
  momento: ActivityMomento | null;
  responsable: string | null;
  estado: ActivityEstado;
  fecha_limite: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityChecklistGroup {
  id: string;
  activity_id: string;
  nombre: string;
  sort_order: number;
}

export interface ActivityChecklistItem {
  id: string;
  group_id: string;
  texto: string;
  completado: boolean;
  sort_order: number;
}

export type CuentaCobroEstado = "pendiente" | "firmada";

export interface CuentaCobro {
  id: string;
  proposal_id: string;
  nombre_completo: string;
  cedula: string;
  ciudad_expedicion_cedula: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  concepto: string;
  valor: number;
  ciudad_evento: string | null;
  estado: CuentaCobroEstado;
  fecha_firma: string | null;
  firma_nombre: string | null;
  firma_imagen: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LegalizacionMeta {
  proposal_id: string;
  responsable: string | null;
  actividad: string | null;
  ciudad_elaboracion: string | null;
  fecha_elaboracion: string | null;
  updated_at: string;
}

export interface LegalizacionGasto {
  id: string;
  proposal_id: string;
  fecha: string | null;
  numero_recibo: string | null;
  tercero: string | null;
  rubro: string | null;
  concepto: string | null;
  valor: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PresupuestoItem {
  id: string;
  proposal_id: string;
  categoria: string;
  nombre: string;
  dias_proyectado: number | null;
  cantidad_proyectado: number | null;
  valor_unitario_proyectado: number | null;
  iva_proyectado: number | null;
  total_proyectado: number;
  dias_ajustado: number | null;
  cantidad_ajustado: number | null;
  valor_unitario_ajustado: number | null;
  iva_ajustado: number | null;
  total_ajustado: number;
  transferido_fecha: string | null;
  transferido_a: string | null;
  ejecucion_valor: number;
  comentario: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProposalContractFields {
  proposal_id: string;
  contratante_nombre: string | null;
  contratante_cedula: string | null;
  contratante_nit: string | null;
  contratante_ciudad: string | null;
  contratante_representante_legal: string | null;
  contrato_numero: string | null;
  contrato_fecha: string | null;
  objeto: string | null;
  valor_total: number | null;
  contratante_cedula_ciudad: string | null;
  contratante_direccion_ciudad: string | null;
  contratante_direccion: string | null;
  ciudad_firma: string;
  fecha_firma: string | null;
  plazo_inicio: string | null;
  plazo_fin: string | null;
  tiempo_servicio_inicio: string | null;
  tiempo_servicio_fin: string | null;
  objeto_particular: string | null;
}
