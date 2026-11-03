/**
 * Datos del evento que Claude saca de unas notas de reunión. Todo se valida
 * aquí: lo que no cumpla el formato o el rango se descarta, y nunca se guarda
 * nada hasta que el asesor confirma el formulario.
 */
import type { Modality } from "@/lib/types";

export interface BorradorEvento {
  client_name?: string;
  client_company?: string;
  client_cargo?: string;
  event_name?: string;
  lugar?: string;
  modality?: Modality;
  city?: string;
  dias?: number;
  aforo?: number;
  aforo_virtual?: number;
  event_start_date?: string;
  event_end_date?: string;
}

const MODALIDADES: Modality[] = ["presencial", "virtual", "hibrido", "mundo_virtual"];

const texto = (x: unknown, max: number): string | undefined =>
  typeof x === "string" && x.trim() ? x.trim().slice(0, max) : undefined;

const numero = (x: unknown, min: number, max: number): number | undefined =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? x : undefined;

function fecha(x: unknown): string | undefined {
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return undefined;
  const d = new Date(`${x}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== x) return undefined;
  const anio = d.getUTCFullYear();
  return anio >= 2024 && anio <= 2100 ? x : undefined;
}

/** Convierte la respuesta cruda de Claude en un borrador seguro. */
export function validarBorrador(raw: unknown): BorradorEvento {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b: BorradorEvento = {};
  const set = <K extends keyof BorradorEvento>(k: K, v: BorradorEvento[K] | undefined) => {
    if (v !== undefined) b[k] = v;
  };
  set("client_name", texto(r.contacto, 120));
  set("client_company", texto(r.empresa, 120));
  set("client_cargo", texto(r.cargo, 120));
  set("event_name", texto(r.evento, 160));
  set("lugar", texto(r.lugar, 160));
  set("city", texto(r.ciudad, 80));
  if (MODALIDADES.includes(r.modalidad as Modality)) b.modality = r.modalidad as Modality;
  set("dias", numero(r.dias, 0.5, 30));
  const aforo = numero(r.aforo, 1, 100000);
  set("aforo", aforo === undefined ? undefined : Math.round(aforo));
  const aforoV = numero(r.aforoVirtual, 1, 100000);
  set("aforo_virtual", aforoV === undefined ? undefined : Math.round(aforoV));
  set("event_start_date", fecha(r.fechaInicio));
  set("event_end_date", fecha(r.fechaFin));
  if (b.event_start_date && b.event_end_date && b.event_end_date < b.event_start_date) delete b.event_end_date;
  return b;
}
