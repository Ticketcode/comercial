/**
 * Servicios personalizados para la presentación: un paquete = una tarjeta con todos sus servicios dentro
 * (título y alcance de cada uno). Los paquetes se reparten en filas de 3 columnas sin dejar huecos.
 */
import { agruparEnPaquetes, type ItemParaPaquete } from "@/lib/data/paquetes";

export interface ServicioFicha {
  titulo: string;
  alcance: string;
}

export interface PaqueteServicios {
  nombre: string;
  /** Posición del paquete (define el color de la tarjeta). */
  idx: number;
  servicios: ServicioFicha[];
}

/** Tope del alcance en la lámina: un texto más largo (editado a mano) se recorta para no desbordar la tarjeta. */
const MAX_ALCANCE = 180;

export function recortarAlcance(texto: string | null | undefined): string {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  return t.length > MAX_ALCANCE ? `${t.slice(0, MAX_ALCANCE - 1).trimEnd()}…` : t;
}

/** Agrupa los servicios incluidos en sus paquetes comerciales, con su título y alcance. */
export function serviciosPorPaquete(servicios: { baseName: string; titulo: string; alcance: string | null }[]): PaqueteServicios[] {
  const items: ItemParaPaquete[] = servicios.map((s) => ({ familia: "servicio", baseName: s.baseName, name: s.titulo }));
  const grupo = agruparEnPaquetes(items).find((g) => g.grupo === "Servicios personalizados");
  if (!grupo) return [];
  const alcance = new Map(servicios.map((s) => [s.titulo, recortarAlcance(s.alcance)]));
  return grupo.paquetes.map((p, idx) => ({
    nombre: p.nombre,
    idx,
    servicios: p.items.map((titulo) => ({ titulo, alcance: alcance.get(titulo) ?? "" })),
  }));
}

/**
 * Reparte los paquetes en filas de 3 columnas: un paquete ocupa tantas columnas como servicios tiene
 * (máximo 3; si tiene más, se parte). Primero los más anchos, cada uno en la primera fila donde cabe.
 * Dos filas forman una lámina.
 */
export function repartirServicios(paquetes: PaqueteServicios[]): PaqueteServicios[][][] {
  const trozos: PaqueteServicios[] = [];
  for (const p of paquetes) {
    for (let i = 0; i < p.servicios.length; i += 3) trozos.push({ ...p, servicios: p.servicios.slice(i, i + 3) });
  }
  const filas: PaqueteServicios[][] = [];
  const unidades = (f: PaqueteServicios[]) => f.reduce((n, p) => n + p.servicios.length, 0);
  for (const t of [...trozos].sort((a, b) => b.servicios.length - a.servicios.length)) {
    const fila = filas.find((f) => unidades(f) + t.servicios.length <= 3);
    if (fila) fila.push(t);
    else filas.push([t]);
  }
  filas.forEach((f) => f.sort((a, b) => a.idx - b.idx));
  const laminas: PaqueteServicios[][][] = [];
  for (let i = 0; i < filas.length; i += 2) laminas.push(filas.slice(i, i + 2));
  return laminas;
}
