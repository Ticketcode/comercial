import { Fragment, useState } from "react";
import type { PresentacionContacto } from "@/lib/types";
import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import { GRUPO_INFO, agruparEnPaquetes, itemCatalogoAplica, type GrupoPaquetes, type ItemParaPaquete, type Paquete, type PaquetesDeGrupo } from "@/lib/data/paquetes";
import { cantidadesLogistica, type CantidadesLogistica } from "@/lib/data/logistica-cantidades";
import { repartirServicios, serviciosPorPaquete, type PaqueteServicios } from "@/lib/data/servicios-deck";
import {
  CheckBadge,
  DISPLAY_FONT,
  POR_DEFINIR,
  Pill,
  Slide1920,
  THEME,
  Tile,
  tileColors,
  type TileVariant,
  formatNumber,
  val,
  type DeckData,
} from "./deck-shell";

/** Tamaño de fuente/padding de las tablas de detalle (Componentes básicos,
 * Logística 360, Servicios personalizados) — escala según cuántos ítems hay
 * en la página en vez de un único corte "denso", para que con pocos ítems
 * las filas usen el espacio disponible en vez de quedar chicas con huecos
 * vacíos debajo. */
function tableScale(n: number) {
  const clamped = Math.min(Math.max(n, 3), 10);
  const t = (clamped - 3) / (10 - 3);
  const fontSize = Math.round(30 - t * 10);
  const vPad = Math.round(20 - t * 10);
  return { fontSize, padding: `${vPad}px ${vPad + 6}px` };
}

const modalityLabel: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrido: "Híbrido",
  mundo_virtual: "Mundo virtual",
};

/** Algunos ítems de Logística 360 traen en el catálogo un texto de plantilla
 * con cantidades sin llenar ("() personas", "(x) Portátiles") — se reemplaza
 * por la dotación real definida en Tarifario, igual que ya la calcula
 * recalcularSegunAforo. Si el comercial editó el texto a mano (lápiz en
 * Propuesta) ese override manual tiene prioridad sobre esto. */
const LOGISTICA_DYNAMIC_DESCRIPTIONS: Record<string, (p: DeckData["proposal"]) => string> = {
  "Acompañamiento durante el evento": (p) => `(${p.qty_productor}) Productor, (${p.qty_supervisor}) Supervisores`,
  "Suministro de personal logístico": (p) => {
    const base = `(${p.qty_logistico}) Logísticos para registro, acreditación, sesiones principales y sesiones internas`;
    return p.qty_logistica_salones_internos > 0
      ? `${base}, (${p.qty_logistica_salones_internos}) Logísticos adicionales para los salones internos`
      : base;
  },
  "Control de aceso a cada una de las sesiones internas del evento": (p) =>
    `(${p.qty_logistico}) personas de logística, (${p.qty_logistico}) equipos de lectura`,
  "Suministro de equipos": (p) =>
    `(${p.qty_computadores}) Portátiles, (${p.qty_impresoras}) Impresoras, (${p.qty_logistico}) smartphones de lectura`,
  "Suministro de consumibles": (p) => `(${p.qty_rollos_labels}) rollos de papel térmico para labels`,
};

function Stat({
  label,
  value,
  highlight = false,
  variant = "gray",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  variant?: TileVariant;
}) {
  const c = tileColors(variant);
  return (
    <Tile variant={variant} style={{ gap: 12, flex: 1, minHeight: 190 }}>
      <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: c.accent }}>{label}</p>
      <p
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.1,
          color: highlight ? c.fg : c.muted,
        }}
      >
        {value}
      </p>
    </Tile>
  );
}

export function CoverSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.dark;
  const { proposal, client, propuestaFecha } = data;
  const fecha = new Date(propuestaFecha + "T00:00:00");
  const dia = fecha.toLocaleDateString("es-CO", { day: "2-digit" });
  const mes = fecha.toLocaleDateString("es-CO", { month: "short" }).replace(".", "").toUpperCase();
  const anio = fecha.getFullYear();
  return (
    <Slide1920
      theme="dark"
      section={`Propuesta ${anio}`}
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", alignItems: "center", gap: 96 }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>
        <Pill>Propuesta comercial</Pill>
        <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.fg }}>
          {proposal.event_name}
        </h1>
        <p style={{ fontSize: 28, color: t.muted }}>
          Evento {modalityLabel[proposal.modality] ?? proposal.modality} · Plataforma integral de e-ticketing y
          logística
        </p>
      </div>
      <div style={{ width: 640, display: "flex", flexDirection: "column" }}>
        <Tile variant="gray" on="dark" badge style={{ gap: 12, height: 232 }}>
          <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: t.accent }}>Atención</p>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
            {val(client?.contact_name)}
          </p>
          <p style={{ fontSize: 28, color: t.muted }}>{val(client?.contact_cargo)}</p>
        </Tile>
        <Tile variant="mint" style={{ marginTop: 24, height: 232, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: "#0E1A17" }}>{dia}</p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <p style={{ fontSize: 40, fontWeight: 700, color: "#0E1A17" }}>{mes}</p>
            <p style={{ fontSize: 28, color: "#1B4D2E" }}>{anio}</p>
          </div>
        </Tile>
      </div>
    </Slide1920>
  );
}

const PRESENCIAL_COPY: Record<string, { title: string; intro: string; bullets: string[] }> = {
  presencial: {
    title: "Nuestra solución para eventos presenciales",
    intro: "Un servicio premium sobre el cual tenemos todo el control para garantizar:",
    bullets: [
      "La forma más eficiente de configurar y publicar cualquier evento.",
      "Organización, agilidad y comodidad desde el registro hasta el acceso de los asistentes.",
    ],
  },
  hibrido: {
    title: "Nuestra solución para eventos híbridos",
    intro: "Una sola plataforma para la experiencia presencial y virtual, con el mismo control:",
    bullets: [
      "Registro y acceso unificados para asistentes presenciales y virtuales.",
      "Transmisión y control de acceso al venue en una sola operación.",
      "DATA real y segmentada de ambas audiencias, antes y durante el evento.",
    ],
  },
  virtual: {
    title: "Nuestra solución para eventos 100% virtuales",
    intro: "Una plataforma propia para que tu evento virtual se sienta a la altura del mejor presencial:",
    bullets: [
      "La forma más eficiente de configurar y publicar tu evento virtual.",
      "Registro, acceso y transmisión en un solo flujo, sin fricciones.",
    ],
  },
  mundo_virtual: {
    title: "Nuestra solución para mundos virtuales",
    intro: "Un servicio premium sobre el cual tenemos todo el control para garantizar:",
    bullets: [
      "La forma más eficiente de configurar y publicar cualquier evento.",
      "Organización, agilidad y comodidad desde el registro hasta el acceso de los asistentes.",
    ],
  },
};

export function PresencialSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const copy = PRESENCIAL_COPY[data.proposal.modality] ?? PRESENCIAL_COPY.presencial;
  return (
    <Slide1920
      theme="light"
      section="Quiénes somos"
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", alignItems: "center", gap: 64 }}
    >
      <div style={{ width: 800, display: "flex", flexDirection: "column", gap: 32 }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
          {copy.title}
        </h2>
        <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>{copy.intro}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {copy.bullets.map((b) => (
            <div key={b} style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
              <CheckBadge size={44} iconSize={26} bg={t.accent} />
              <p style={{ flex: 1, fontSize: 28, lineHeight: 1.35, color: t.fg }}>{b}</p>
            </div>
          ))}
        </div>
      </div>
      <Tile variant="gray" style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/propuesta-deck/plataforma.png"
          alt="Panel de configuración de entradas de la plataforma Ticketcode"
          style={{ width: 752, height: 456, objectFit: "contain", borderRadius: 16 }}
        />
      </Tile>
    </Slide1920>
  );
}

export function PerfilSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const { proposal } = data;
  const t = tileColors("ink");
  const fechas =
    proposal.event_start_date
      ? `${formatFechaCorta(proposal.event_start_date)}${proposal.event_end_date ? ` a ${formatFechaCorta(proposal.event_end_date)}` : ""}`
      : POR_DEFINIR;
  const dias = proposal.dias ? `${proposal.dias} ${proposal.dias === 1 ? "día" : "días"}` : null;
  const lugarCiudad = [proposal.lugar, proposal.city].filter(Boolean).join(" · ") || POR_DEFINIR;
  const esHibrido = proposal.modality === "hibrido";
  const esVirtual = proposal.modality === "virtual" || proposal.modality === "mundo_virtual";
  const span2 = { gridColumn: "span 2", display: "flex" } as const;
  return (
    <Slide1920 theme="light" section="El evento" page={page} total={total} contentStyle={{ flexDirection: "row", gap: 32 }}>
      <Tile variant="ink" style={{ width: 800, padding: 56, justifyContent: "space-between" }}>
        <Pill>{modalityLabel[proposal.modality] ?? proposal.modality}</Pill>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: t.fg }}>
            {proposal.event_name}
          </h2>
          <p style={{ fontSize: 30, lineHeight: 1.3, color: t.muted }}>{lugarCiudad}</p>
        </div>
      </Tile>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "1fr", gap: 24 }}>
        <div style={span2}>
          <Tile variant="mint" style={{ flex: 1, gap: 12, justifyContent: "center" }}>
            <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: "#0E1A17" }}>Fechas</p>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 52, fontWeight: 800, lineHeight: 1.1, color: "#0E1A17" }}>{fechas}</p>
            {dias && <p style={{ fontSize: 28, color: "#1B4D2E" }}>{dias}</p>}
          </Tile>
        </div>
        {esHibrido ? (
          <>
            <Stat label="Aforo presencial" value={val(proposal.aforo)} highlight={!!proposal.aforo} />
            <Stat label="Aforo virtual" value={val(proposal.aforo_virtual)} highlight={!!proposal.aforo_virtual} />
          </>
        ) : esVirtual ? (
          <Stat label="Aforo virtual" value={val(proposal.aforo_virtual)} highlight={!!proposal.aforo_virtual} />
        ) : (
          <Stat label="Aforo" value={val(proposal.aforo)} highlight={!!proposal.aforo} />
        )}
        {esHibrido ? (
          <div style={span2}>
            <Stat label="Ciudad" value={val(proposal.city)} highlight={!!proposal.city} variant="deep" />
          </div>
        ) : (
          <Stat label="Ciudad" value={val(proposal.city)} highlight={!!proposal.city} variant="deep" />
        )}
      </div>
    </Slide1920>
  );
}

function ChecklistCard({
  title,
  items,
  emptyLabel,
  variant,
  showDescription = true,
}: {
  title: string;
  items: { key: string; label: string; description: string | null }[];
  emptyLabel: string;
  variant: TileVariant;
  /** Componentes básicos y Logística 360 ya tienen su propia lámina de
      detalle con la descripción completa (ver ComponentesSlide/LogisticaSlide)
      — acá solo se listan los nombres, para no depender de recortar texto con
      CSS (-webkit-line-clamp no siempre se respeta al capturar con
      html2canvas para el PDF, y se veía como si el contenido se cortara). */
  showDescription?: boolean;
}) {
  const c = tileColors(variant);
  // Con muchos ítems marcados, listar cada uno con su línea completa puede
  // no caber en la tarjeta — esta lámina es solo el resumen (el detalle
  // completo vive en Componentes básicos / Logística 360), así que de
  // sobrar espacio se recorta la lista con un "+N más" en vez de desbordar
  // en silencio.
  const MAX_ROWS = showDescription ? 9 : 12;
  const visible = items.slice(0, MAX_ROWS);
  const hiddenCount = items.length - visible.length;
  const compact = items.length > 7;
  const checkBg = variant === "mint" ? "#EAF3F0" : "#3CD65C";

  return (
    <Tile variant={variant} style={{ padding: 32, gap: 18, flex: 1, height: "100%", overflow: "hidden" }}>
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 36, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: 24, lineHeight: 1.4, color: c.muted }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 14, overflow: "hidden" }}>
          {visible.map((item) => (
            <div key={item.key} style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <CheckBadge size={compact ? 24 : 30} iconSize={compact ? 14 : 18} bg={checkBg} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <p style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25, color: c.fg, margin: 0 }}>
                  {item.label}
                </p>
                {showDescription && item.description && (
                  <p style={{ fontSize: 24, lineHeight: 1.3, color: c.muted, margin: 0 }}>{item.description}</p>
                )}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p style={{ fontSize: 24, fontWeight: 600, color: c.accent, margin: 0 }}>
              + {hiddenCount} más — ver detalle en la siguiente lámina
            </p>
          )}
        </div>
      )}
    </Tile>
  );
}

export function IncluyeSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const { proposal } = data;
  const componentesBasicos = getCheckedComponentesItems(data).map((c) => ({
    key: c.id,
    label: c.name,
    description: c.description,
  }));
  const logistica360 = getCheckedLogisticaItems(data).map((c) => ({
    key: c.id,
    label: c.name,
    description: c.description,
  }));
  const servicios = data.includedServices.map((s) => ({ key: s.name, label: s.name, description: s.description }));

  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 60, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: THEME.light.fg, marginBottom: 32 }}>
        Lo que incluye tu evento
      </h2>
      <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "stretch", flex: 1, minHeight: 0 }}>
        <ChecklistCard
          title="Componentes básicos"
          variant="ink"
          items={componentesBasicos}
          emptyLabel="No hay componentes básicos definidos para esta modalidad."
          showDescription={false}
        />
        <ChecklistCard
          title="Logística 360"
          variant="mint"
          items={logistica360}
          emptyLabel={
            proposal.modality === "virtual"
              ? "No aplica logística presencial para esta modalidad."
              : "No se seleccionó logística 360 para este evento."
          }
          showDescription={false}
        />
        <ChecklistCard
          title="Servicios personalizados"
          variant="gray"
          items={servicios}
          emptyLabel="Esta propuesta no incluye servicios personalizados adicionales."
          showDescription={false}
        />
      </div>
    </Slide1920>
  );
}

/** Todo lo marcado en la propuesta (componentes, logística y servicios) agrupado en paquetes. */
export function getPaquetesDeck(data: DeckData): PaquetesDeGrupo[] {
  const { catalogItems, catalogSelections } = data;
  const selectedMap = Object.fromEntries(catalogSelections.map((s) => [s.catalog_item_id, s]));
  const items: ItemParaPaquete[] = [];
  for (const c of catalogItems) {
    if (!selectedMap[c.id]?.included || !itemCatalogoAplica(c, data.proposal)) continue;
    const familia = c.category === "componente_basico" ? "componente" : c.category === "logistica_360" ? "logistica" : null;
    if (!familia) continue;
    items.push({ familia, baseName: c.name, name: selectedMap[c.id]?.custom_name || c.name });
  }
  for (const s of data.includedServices) {
    items.push({ familia: "servicio", baseName: s.baseName ?? s.name, name: s.name });
  }
  return agruparEnPaquetes(items);
}

const sinTildes = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Logística 360 con sus cantidades (salen del Diagnóstico). null = no hay nada que mostrar. */
export function getLogisticaDeck(data: DeckData): CantidadesLogistica | null {
  const selectedMap = Object.fromEntries(data.catalogSelections.map((s) => [s.catalog_item_id, s]));
  const catalogo = data.catalogItems
    .filter((c) => c.category === "logistica_360")
    .map((c) => ({ name: c.name, included: !!selectedMap[c.id]?.included }));
  const pre = data.includedServices.find((s) => sinTildes(s.baseName ?? s.name).includes("pre acreditacion"));
  const capacitacion = data.includedServices.some((s) => sinTildes(s.baseName ?? s.name).includes("capacitacion al staff"));
  return cantidadesLogistica(data.proposal, Number(pre?.cantidad ?? 0), catalogo, capacitacion);
}

/** Servicios personalizados de la propuesta, agrupados por paquete y repartidos en láminas. */
export function getServiciosDeck(data: DeckData): PaqueteServicios[][][] {
  return repartirServicios(
    serviciosPorPaquete(data.includedServices.map((s) => ({ baseName: s.baseName ?? s.name, titulo: s.name, alcance: s.description })))
  );
}

/** Clave de "ocultar lámina" que corresponde a cada grupo de paquetes. */
export function claveOcultarGrupo(grupo: GrupoPaquetes): string {
  if (grupo === "Logística 360") return "logistica";
  if (grupo === "Servicios personalizados") return "servicios";
  return "componentes";
}

const VARIANTES: TileVariant[] = ["ink", "mint", "gray", "deep"];

/** Encabezado común de las láminas de componentes: píldora, título e intro opcional. */
function CabeceraComponentes({ pill, titulo, intro }: { pill: string; titulo: string; intro?: string }) {
  const t = THEME.light;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: intro ? 28 : 24 }}>
      <Pill>{pill}</Pill>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg, marginTop: 20 }}>{titulo}</h2>
      {intro && <p style={{ fontSize: 28, lineHeight: 1.35, color: t.muted, marginTop: 12 }}>{intro}</p>}
    </div>
  );
}

/** Reparte n tarjetas en filas que llenan el ancho: 4 → 2+2, 5 → 3+2, 6 → 3+3. */
function filasDe<T>(items: T[]): T[][] {
  const n = items.length;
  const tam = n <= 3 ? n : n === 4 ? 2 : 3;
  const filas: T[][] = [];
  for (let i = 0; i < n; i += tam || 1) filas.push(items.slice(i, i + (tam || 1)));
  return filas;
}

/** Plataforma base (y otros grupos de componentes): una tarjeta por paquete, igual de altas y sin huecos. */
export function GrupoSlide({ grupo, paquetes, page, total }: { grupo: GrupoPaquetes; paquetes: Paquete[]; page: number; total: number }) {
  const MAX = 4;
  const grande = Math.max(...paquetes.map((p) => Math.min(p.items.length, MAX))) <= 3 && paquetes.length <= 4;
  const filas = filasDe(paquetes);
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total}>
      <CabeceraComponentes pill={grupo} titulo={GRUPO_INFO[grupo].titulo} intro={GRUPO_INFO[grupo].intro} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {filas.map((fila, r) => (
          <Fragment key={r}>
            {r > 0 && <div style={{ height: 24, flexShrink: 0 }} />}
            <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
              {fila.map((p, i) => {
                const idx = paquetes.indexOf(p);
                const v = VARIANTES[idx % VARIANTES.length];
                const c = tileColors(v);
                const checkBg = v === "mint" ? "#EAF3F0" : "#3CD65C";
                const visibles = p.items.slice(0, MAX);
                const resto = p.items.length - visibles.length;
                return (
                  <Fragment key={p.nombre}>
                    {i > 0 && <div style={{ width: 24, flexShrink: 0 }} />}
                    <Tile variant={v} style={{ flex: 1, padding: 32, overflow: "hidden" }}>
                      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: grande ? 38 : 36, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{p.nombre}</h3>
                      <p style={{ fontSize: 24, lineHeight: 1.3, color: c.muted, marginTop: 6 }}>{p.promesa}</p>
                      <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
                        {visibles.map((it, k) => (
                          <div key={it} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", marginTop: k === 0 ? 0 : 10 }}>
                            <CheckBadge size={grande ? 28 : 26} iconSize={grande ? 18 : 16} bg={checkBg} />
                            <p style={{ flex: 1, fontSize: grande ? 26 : 24, lineHeight: 1.25, fontWeight: 600, color: c.fg, marginLeft: 12 }}>{it}</p>
                          </div>
                        ))}
                        {resto > 0 && <p style={{ fontSize: 24, fontWeight: 600, color: c.accent, marginTop: 10 }}>+ {resto} más</p>}
                      </div>
                    </Tile>
                  </Fragment>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </Slide1920>
  );
}

/** Logística 360: lo que se pone en el evento, con la cantidad de cada cosa bien visible. */
export function LogisticaCantidadesSlide({ datos, page, total }: { datos: CantidadesLogistica; page: number; total: number }) {
  const { paquetes, sinLogistica } = datos;
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total}>
      <CabeceraComponentes
        pill={sinLogistica ? "Lo dispone el organizador" : "Logística 360"}
        titulo={sinLogistica ? "Lo que necesita tu evento en sitio" : "Personas y equipos en sitio"}
        intro={
          sinLogistica
            ? "Las cantidades que el organizador debe disponer. Ticketcode capacita a tu equipo en la plataforma."
            : "Esto es lo que ponemos en tu evento, con las cantidades calculadas para tu aforo."
        }
      />
      <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
        {paquetes.map((p, i) => {
          const v = VARIANTES[i % VARIANTES.length];
          const c = tileColors(v);
          const checkBg = v === "mint" ? "#EAF3F0" : "#3CD65C";
          return (
            <Fragment key={p.nombre}>
              {i > 0 && <div style={{ width: 24, flexShrink: 0 }} />}
              <Tile variant={v} style={{ flex: 1, padding: "24px 28px", overflow: "hidden" }}>
                <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{p.nombre}</h3>
                <p style={{ fontSize: 24, lineHeight: 1.25, color: c.muted, marginTop: 6 }}>{p.promesa}</p>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-evenly", marginTop: 12 }}>
                  {p.filas.map((f) => (
                    <div key={f.etiqueta} style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <div style={{ width: 84, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                        {f.cantidad === null ? (
                          <CheckBadge size={40} iconSize={24} bg={checkBg} />
                        ) : (
                          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 48, fontWeight: 800, lineHeight: 1, color: c.accent }}>{f.cantidad.toLocaleString("es-CO")}</p>
                        )}
                      </div>
                      <div style={{ flex: 1, marginLeft: 12 }}>
                        <p style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, color: c.fg }}>{f.etiqueta}</p>
                        {f.detalle && <p style={{ fontSize: 24, lineHeight: 1.2, color: c.muted, marginTop: 2 }}>{f.detalle}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Tile>
            </Fragment>
          );
        })}
      </div>
    </Slide1920>
  );
}

/** Servicios personalizados: UNA tarjeta por paquete, con todos sus servicios dentro (título y alcance de cada uno). */
export function ServiciosPorPaqueteSlide({ filas, parte, page, total }: { filas: PaqueteServicios[][]; parte?: string; page: number; total: number }) {
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total}>
      <CabeceraComponentes pill={parte ? `Servicios personalizados (${parte})` : "Servicios personalizados"} titulo={GRUPO_INFO["Servicios personalizados"].titulo} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {filas.map((fila, r) => (
          <Fragment key={r}>
            {r > 0 && <div style={{ height: 24, flexShrink: 0 }} />}
            <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
              {fila.map((p, i) => {
                const v = VARIANTES[p.idx % VARIANTES.length];
                const c = tileColors(v);
                return (
                  <Fragment key={p.nombre + p.servicios[0].titulo}>
                    {i > 0 && <div style={{ width: 24, flexShrink: 0 }} />}
                    <Tile variant={v} style={{ flex: p.servicios.length, padding: "20px 24px", overflow: "hidden", justifyContent: "flex-start" }}>
                      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{p.nombre}</h3>
                      <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0, marginTop: 14 }}>
                        {p.servicios.map((sv, k) => (
                          <Fragment key={sv.titulo}>
                            {k > 0 && <div style={{ width: 1, background: c.line, marginLeft: 16, marginRight: 16, flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ fontFamily: DISPLAY_FONT, fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: c.fg }}>{sv.titulo}</h4>
                              {sv.alcance && <p style={{ fontSize: 24, lineHeight: 1.25, color: c.muted, marginTop: 6 }}>{sv.alcance}</p>}
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </Tile>
                  </Fragment>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </Slide1920>
  );
}

export function getCheckedComponentesItems(data: DeckData) {
  const { catalogItems, catalogSelections } = data;
  const selectedMap = Object.fromEntries(catalogSelections.map((s) => [s.catalog_item_id, s]));
  return catalogItems
    .filter((c) => c.category === "componente_basico" && selectedMap[c.id]?.included)
    .map((c) => ({
      ...c,
      name: selectedMap[c.id]?.custom_name || c.name,
      description: selectedMap[c.id]?.custom_description || c.description,
    }));
}

const COMPONENTES_WEIGHT_PER_PAGE = 7;

/** Igual que chunkLogisticaItems: reparte la tabla en varias láminas cuando
    hay demasiados componentes marcados para caber en una sola, estimando
    peso por el largo de la descripción en vez de un conteo fijo de filas. */
export function chunkComponentesItems(items: ReturnType<typeof getCheckedComponentesItems>) {
  const chunks: typeof items[] = [];
  let current: typeof items = [];
  let weight = 0;
  for (const item of items) {
    const w = 1 + Math.ceil((item.description?.length ?? 0) / 70) * 0.5;
    if (current.length > 0 && weight + w > COMPONENTES_WEIGHT_PER_PAGE) {
      chunks.push(current);
      current = [];
      weight = 0;
    }
    current.push(item);
    weight += w;
  }
  if (current.length > 0) chunks.push(current);
  // Si la última página quedó con un solo ítem suelto (ej. "Informes"), se ve
  // desproporcionada frente al resto — se sube a la página anterior aunque
  // eso exceda un poco el peso objetivo, en vez de dejarla casi vacía.
  if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) {
    const last = chunks.pop()!;
    chunks[chunks.length - 1].push(...last);
  }
  return chunks.length > 0 ? chunks : [[]];
}

export function ComponentesSlide({
  items,
  chunkLabel,
  page,
  total,
}: {
  items: ReturnType<typeof getCheckedComponentesItems>;
  chunkLabel?: string;
  page: number;
  total: number;
}) {
  const t = THEME.light;
  const { fontSize, padding } = tableScale(items.length);

  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Componentes básicos{chunkLabel ? ` (${chunkLabel})` : ""}
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Lo que incluye cada módulo de la plataforma para tu evento.
      </p>
      {items.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>
          No hay componentes básicos incluidos en esta propuesta.
        </p>
      ) : (
        <div style={{ borderRadius: 28, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "34%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Componente
                </th>
                <th style={{ width: "66%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding, fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding, color: t.fg, verticalAlign: "top" }}>
                    {val(item.description)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Slide1920>
  );
}

export function getCheckedServiciosItems(data: DeckData) {
  return data.includedServices.map((s, i) => ({ id: `servicio-${i}`, name: s.name, description: s.description }));
}

export function chunkServiciosItems(items: ReturnType<typeof getCheckedServiciosItems>) {
  const chunks: typeof items[] = [];
  for (let i = 0; i < items.length; i += COMPONENTES_WEIGHT_PER_PAGE) {
    chunks.push(items.slice(i, i + COMPONENTES_WEIGHT_PER_PAGE));
  }
  return chunks.length > 0 ? chunks : [[]];
}

export function ServiciosSlide({
  items,
  chunkLabel,
  page,
  total,
}: {
  items: ReturnType<typeof getCheckedServiciosItems>;
  chunkLabel?: string;
  page: number;
  total: number;
}) {
  const t = THEME.light;
  const { fontSize, padding } = tableScale(items.length);

  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Servicios personalizados{chunkLabel ? ` (${chunkLabel})` : ""}
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Servicios adicionales elegidos para esta propuesta, por fuera de los componentes y la logística base.
      </p>
      {items.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>
          Esta propuesta no incluye servicios personalizados adicionales.
        </p>
      ) : (
        <div style={{ borderRadius: 28, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "34%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Servicio
                </th>
                <th style={{ width: "66%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding, fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding, color: t.fg, verticalAlign: "top" }}>
                    {val(item.description)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Slide1920>
  );
}

interface CountBox {
  n: string;
  label: string;
}

/**
 * Las descripciones de logística 360 a veces traen un desglose en conteos
 * — "(1) Productor, (2) Supervisores" o "4L acreditación, 1L Venta de
 * boletería..." — que el diseño aprobado muestra como cuadros con el número
 * grande. Se parte cada trozo separado por comas y, solo si CADA trozo
 * calza con uno de los dos formatos reales que usa el catálogo, se arma la
 * cuadrícula; si no, se deja como texto corrido (nunca se inventa el
 * desglose ni se descarta texto que no calce).
 */
function parseCountList(line: string): CountBox[] | null {
  const parts = line
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const boxes: CountBox[] = [];
  for (const part of parts) {
    const paren = part.match(/^\((\d+(?:-\d+)?)\)\s*(.+)$/);
    if (paren) {
      boxes.push({ n: paren[1], label: paren[2].trim() });
      continue;
    }
    const suffixed = part.match(/^(\d+(?:-\d+)?)\s*L\s+(.+)$/i);
    if (suffixed) {
      boxes.push({ n: suffixed[1], label: suffixed[2].trim() });
      continue;
    }
    return null;
  }
  return boxes;
}

interface ParsedLogistica {
  intro: string[];
  boxes: CountBox[] | null;
  sections: { heading: string; boxes: CountBox[] | null; text: string | null }[];
}

function parseLogisticaDescription(description: string | null): ParsedLogistica {
  const lines = (description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const intro: string[] = [];
  const sections: ParsedLogistica["sections"] = [];
  let boxes: CountBox[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^(Distribuci[oó]n|Actividades)\s*:?\s*(.*)$/i);
    if (heading) {
      let rest = heading[2].trim();
      if (!rest && i + 1 < lines.length) {
        i++;
        rest = lines[i];
      }
      sections.push({ heading: heading[1], boxes: parseCountList(rest), text: rest });
      continue;
    }
    const list: CountBox[] | null = sections.length === 0 && boxes === null ? parseCountList(line) : null;
    if (list) {
      boxes = list;
      continue;
    }
    intro.push(line);
  }
  return { intro, boxes, sections };
}

/** Etiquetas compactas tipo "pill" para un desglose de conteos — usadas
    dentro de una celda de tabla, a diferencia de los cuadros grandes del
    mockup: con tablas de más de 2-3 ítems los cuadros grandes no caben, así
    que esto escala a cualquier cantidad de logística incluida. */
function CountBadges({ boxes }: { boxes: CountBox[] }) {
  const t = THEME.light;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
      {boxes.map((b, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            background: "#FFFFFF",
            borderRadius: 999,
            padding: "3px 12px",
          }}
        >
          <strong style={{ color: t.accent2 }}>{b.n}</strong> {b.label}
        </span>
      ))}
    </span>
  );
}

function LogisticaDetail({ description }: { description: string | null }) {
  const t = THEME.light;
  const parsed = parseLogisticaDescription(description);
  const isPlain = parsed.intro.length === 0 && !parsed.boxes && parsed.sections.length === 0;

  if (isPlain) return <>{val(description)}</>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {parsed.intro.length > 0 && (
        <div style={{ whiteSpace: "pre-line" }}>{parsed.intro.join("\n")}</div>
      )}
      {parsed.boxes && <CountBadges boxes={parsed.boxes} />}
      {parsed.sections.map((s, i) => (
        <div key={i}>
          <strong style={{ color: t.muted }}>{s.heading}: </strong>
          {s.boxes ? <CountBadges boxes={s.boxes} /> : <span>{s.text}</span>}
        </div>
      ))}
    </div>
  );
}

export function getCheckedLogisticaItems(data: DeckData) {
  const { catalogItems, catalogSelections, proposal } = data;
  const selectedMap = Object.fromEntries(catalogSelections.map((s) => [s.catalog_item_id, s]));
  return catalogItems
    .filter((c) => c.category === "logistica_360" && selectedMap[c.id]?.included)
    .map((c) => {
      const custom = selectedMap[c.id]?.custom_description;
      // Match por prefijo: algunos catálogos agregan detalle entre paréntesis al
      // nombre base (ej. "Suministro de equipos (acreditación en sitio, ...)").
      const dynamicKey = Object.keys(LOGISTICA_DYNAMIC_DESCRIPTIONS).find((key) => c.name.startsWith(key));
      const dynamic = dynamicKey ? LOGISTICA_DYNAMIC_DESCRIPTIONS[dynamicKey](proposal) : undefined;
      return {
        ...c,
        name: selectedMap[c.id]?.custom_name || c.name,
        description: custom || dynamic || c.description,
      };
    });
}

/** Ítems simples (una línea) pesan poco; los que traen desglose de
    "Distribución"/"Actividades" pesan bastante más — se usa para repartir
    la lista en varias láminas cuando no caben todas en una sola, en vez de
    comprimir las filas hasta que se vuelvan ilegibles (lo que pasaba con la
    cuadrícula de tarjetas: con muchos ítems colapsaba la altura de cada una). */
function estimateLogisticaWeight(description: string | null): number {
  const p = parseLogisticaDescription(description);
  let w = 1;
  w += p.intro.length * 0.5;
  if (p.boxes) w += 1;
  w += p.sections.length * 1.2;
  return w;
}

const LOGISTICA_WEIGHT_PER_PAGE = 14;

export function chunkLogisticaItems(items: ReturnType<typeof getCheckedLogisticaItems>) {
  const chunks: typeof items[] = [];
  let current: typeof items = [];
  let weight = 0;
  for (const item of items) {
    const w = estimateLogisticaWeight(item.description);
    if (current.length > 0 && weight + w > LOGISTICA_WEIGHT_PER_PAGE) {
      chunks.push(current);
      current = [];
      weight = 0;
    }
    current.push(item);
    weight += w;
  }
  if (current.length > 0) chunks.push(current);
  return chunks.length > 0 ? chunks : [[]];
}

export function LogisticaSlide({
  items,
  chunkLabel,
  page,
  total,
}: {
  items: ReturnType<typeof getCheckedLogisticaItems>;
  chunkLabel?: string;
  page: number;
  total: number;
}) {
  const t = THEME.light;
  const { fontSize, padding } = tableScale(items.length);

  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Logística 360{chunkLabel ? ` (${chunkLabel})` : ""}
      </h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>
          No se incluyó logística 360 en esta propuesta.
        </p>
      ) : (
        <div style={{ borderRadius: 28, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "30%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Componente
                </th>
                <th style={{ width: "70%", padding, color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding, fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding, lineHeight: 1.4, verticalAlign: "top" }}>
                    <LogisticaDetail description={item.description} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Slide1920>
  );
}

export function ComercialSlide({
  data,
  page,
  total: totalPages,
  onEditImpactos,
}: {
  data: DeckData;
  page: number;
  total: number;
  /** Si se pasa, "Impacto inicial" se edita en la propia lámina en vez de solo mostrarse
   * (no se pasa en el área oculta que exporta el PDF, para no capturar cajas de input). */
  onEditImpactos?: (field: "registro" | "acreditacion", value: number | null) => void;
}) {
  const t = THEME.light;
  const { proposal } = data;
  const registro = proposal.impactos_registro;
  const acreditacion = proposal.impactos_acreditacion;
  const total = registro != null && acreditacion != null ? registro + acreditacion : null;
  const cell = (v: number | null) => (v != null ? `${formatNumber(v)} impactos de marca` : `${POR_DEFINIR} impactos de marca`);
  const editableCell = (field: "registro" | "acreditacion", v: number | null) =>
    onEditImpactos ? (
      <input
        type="number"
        min={0}
        value={v ?? ""}
        onChange={(e) => onEditImpactos(field, e.target.value === "" ? null : Number(e.target.value))}
        placeholder="N° de impactos"
        style={{
          width: 140,
          fontSize: 24,
          fontFamily: "inherit",
          color: t.fg,
          background: "transparent",
          border: `1px solid ${t.line}`,
          borderRadius: 8,
          padding: "6px 10px",
        }}
      />
    ) : (
      cell(v)
    );
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={totalPages}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg, marginBottom: 16 }}>
        Contribuimos con la comercialización del evento
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted, marginBottom: 24 }}>
        Generamos piezas y espacios digitales para vender a marcas aliadas y patrocinadores en el registro, la
        acreditación y el control de acceso.
      </p>
      <div style={{ borderRadius: 28, overflow: "hidden" }}>
      <table style={{ fontFamily: "inherit", fontSize: 28, color: t.fg, borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr style={{ background: t.accent2 }}>
            <th style={{ width: "22%", color: "#FFFFFF", textAlign: "left", padding: "16px 20px" }}>Concepto</th>
            <th style={{ width: "54%", color: "#FFFFFF", textAlign: "left", padding: "16px 20px" }}>
              Elementos con presencia de marca del patrocinador
            </th>
            <th style={{ width: "24%", color: "#FFFFFF", textAlign: "left", padding: "16px 20px" }}>Impacto inicial</th>
          </tr>
          <tr>
            <td style={{ padding: "16px 20px" }}>Registro</td>
            <td style={{ padding: "16px 20px" }}>
              Correo de confirmación · Correo de recordación · Escarapela digital (descarga) · Impacto comercial a
              la base de datos
            </td>
            <td style={{ padding: "16px 20px" }}>{editableCell("registro", registro)}</td>
          </tr>
          <tr>
            <td style={{ padding: "16px 20px" }}>Acreditación y control de acceso</td>
            <td style={{ padding: "16px 20px" }}>
              Escarapela digital (acceso) · Manilla biodegradable · Base de datos de visitantes a cada stand de la
              zona expo
            </td>
            <td style={{ padding: "16px 20px" }}>{editableCell("acreditacion", acreditacion)}</td>
          </tr>
          <tr style={{ background: t.card }}>
            <td style={{ padding: "16px 20px" }}>Total estimado</td>
            <td />
            <td style={{ padding: "16px 20px" }}>
              {total != null ? `${formatNumber(total)} impactos` : `${POR_DEFINIR} impactos`}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </Slide1920>
  );
}

/** Esta lámina solo tiene sentido cuando hay al menos un concepto marcado como incluido en el Acuerdo comercial de la Propuesta — si no, se omite del todo en vez de mostrarse vacía. */
export function hasAcuerdoComercial(data: DeckData): boolean {
  return data.agreementItems.some((a) => a.included);
}

export function AcuerdoSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const items = data.agreementItems.filter((a) => a.included);
  const variants: TileVariant[] = ["ink", "mint", "gray", "deep"];
  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ gap: 40 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Acuerdo comercial
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Lo que podemos negociar para optimizar el presupuesto inicial.
      </p>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "stretch" }}>
          {items.map((item, i) => {
            const v = variants[i % variants.length];
            const c = tileColors(v);
            return (
              <Tile key={item.id} variant={v} style={{ padding: 32, gap: 14, flex: 1 }}>
                <p style={{ fontSize: 24, letterSpacing: 2, fontWeight: 600, color: c.accent }}>{String(i + 1).padStart(2, "0")}</p>
                <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 32, fontWeight: 700, lineHeight: 1.15, color: c.fg }}>
                  {item.label}
                </h3>
                {item.notes && <p style={{ fontSize: 24, lineHeight: 1.4, color: c.muted }}>{item.notes}</p>}
              </Tile>
            );
          })}
        </div>
      )}
    </Slide1920>
  );
}

/** Fila de la cuenta de inversión: etiqueta a la izquierda y monto a la derecha. */
function MoneyRow({
  label,
  value,
  variant,
  on = "light",
  big = false,
  width,
}: {
  label: string;
  value: string;
  variant: TileVariant;
  on?: "light" | "dark";
  big?: boolean;
  width?: string;
}) {
  const c = tileColors(variant, on);
  return (
    <Tile
      variant={variant}
      on={on}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: big ? "36px 48px" : "24px 48px",
        borderRadius: big ? 48 : 36,
        width,
        alignSelf: "flex-end",
      }}
    >
      <p style={{ fontSize: big ? 32 : 28, fontWeight: 600, color: c.muted }}>{label}</p>
      <p style={{ fontFamily: DISPLAY_FONT, fontSize: big ? 68 : 48, fontWeight: 800, color: c.fg, whiteSpace: "nowrap" }}>
        {value}
      </p>
    </Tile>
  );
}

function ivaLabel(rate: number) {
  return `IVA ${Math.round(rate * 100)}%`;
}

export function InversionSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const { tarifarioSummary, proposal } = data;
  const base = tarifarioSummary.valorPropuestaFinal;
  const iva = base * tarifarioSummary.ivaRate;
  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ flexDirection: "row", alignItems: "stretch", gap: 48 }}>
      <Tile variant="ink" badge style={{ width: 520, height: 640, alignSelf: "center", justifyContent: "flex-end", gap: 16, padding: 48 }}>
        <p style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, color: "#7BE08F" }}>Inversión inicial</p>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: 56, fontWeight: 800, lineHeight: 1.05, color: "#EAF3F0" }}>
          {proposal.event_name}
        </p>
        <p style={{ fontSize: 26, color: "#9DB3AC" }}>Valor antes del acuerdo comercial.</p>
      </Tile>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <MoneyRow label="Valor de la propuesta antes de IVA" value={formatCOP(base)} variant="mint" width="90%" />
        <div style={{ height: 20 }} />
        <MoneyRow label={ivaLabel(tarifarioSummary.ivaRate)} value={formatCOP(iva)} variant="gray" width="95%" />
        <div style={{ height: 20 }} />
        <MoneyRow label="Total con IVA" value={formatCOP(base + iva)} variant="ink" width="100%" big />
        <p style={{ fontSize: 24, color: t.muted, marginTop: 24, textAlign: "right" }}>Valores en pesos colombianos.</p>
      </div>
    </Slide1920>
  );
}

/** "7 de diciembre de 2026": fecha de la propuesta más los días de vigencia de la oferta. */
function vigenciaHasta(data: DeckData): string {
  const dias = Number(data.proposal.vigencia_dias ?? 15);
  const d = new Date(data.propuestaFecha + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function FinalSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.dark;
  const { tarifarioSummary, proposal } = data;
  const base = tarifarioSummary.valorPropuestaFinal;
  const descuentoPct = proposal.acuerdo_comercial_pct_global;
  const hasAcuerdo = descuentoPct > 0;
  const descuento = base * (descuentoPct / 100);
  const conDescuento = base - descuento;
  const iva = conDescuento * tarifarioSummary.ivaRate;

  return (
    <Slide1920
      theme="dark"
      section="Inversión"
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", gap: 72, alignItems: "center" }}
    >
      <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
          Presupuesto final
        </h2>
        <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>Valor justo y ganador para las partes.</p>
        <p style={{ fontSize: 28, lineHeight: 1.4, color: t.fg, fontWeight: 600 }}>Oferta válida hasta el {vigenciaHasta(data)}.</p>
        {hasAcuerdo && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            <MoneyRow label="Valor sin acuerdo comercial" value={formatCOP(base)} variant="gray" on="dark" width="100%" />
            <div style={{ height: 16 }} />
            <MoneyRow label={`Acuerdo comercial (${descuentoPct}%)`} value={`- ${formatCOP(descuento)}`} variant="deep" on="dark" width="100%" />
          </div>
        )}
      </div>
      <Tile variant="mint" on="dark" badge style={{ flex: 1, padding: 56, gap: 16, justifyContent: "center" }}>
        <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: "#1B4D2E" }}>Total propuesta</p>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: "#0E1A17" }}>
          {formatCOP(conDescuento)}
        </p>
        <p style={{ fontSize: 28, color: "#1B4D2E" }}>Antes de IVA</p>
        <div style={{ height: 3, background: "#0E1A17", opacity: 0.15, marginTop: 8, marginBottom: 8 }} />
        <p style={{ fontSize: 28, color: "#1B4D2E" }}>
          {ivaLabel(tarifarioSummary.ivaRate)}: <strong style={{ color: "#0E1A17" }}>{formatCOP(iva)}</strong>
        </p>
        <p style={{ fontSize: 32, fontWeight: 700, color: "#0E1A17" }}>Total con IVA: {formatCOP(conDescuento + iva)}</p>
      </Tile>
    </Slide1920>
  );
}

export function PagosSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const { paymentMilestones, tarifarioSummary, proposal } = data;
  const base = tarifarioSummary.valorPropuestaFinal;
  const descuento = base * (proposal.acuerdo_comercial_pct_global / 100);
  const totalPropuesta = base - descuento;
  const hitos = paymentMilestones.length > 0 ? paymentMilestones : [];
  const variants: TileVariant[] = ["ink", "mint", "gray", "deep"];

  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ gap: 36 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg, margin: 0 }}>
          Modelo de pagos
        </h2>
        <a
          href={`/proposals/${proposal.id}/propuesta#pagos`}
          data-pdf-link={`/proposals/${proposal.id}/propuesta`}
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 24,
            fontWeight: 700,
            color: t.accent2,
            border: `2px solid ${t.accent2}`,
            borderRadius: 999,
            padding: "12px 28px",
            textDecoration: "none",
          }}
        >
          Modificar modelo de pagos
        </a>
      </div>
      {hitos.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>Todavía no hay hitos de pago definidos en la Propuesta.</p>
      ) : hitos.length === 1 ? (
        <Tile variant="mint" badge style={{ flexDirection: "row", alignItems: "center", gap: 64, padding: 56 }}>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: "#0E1A17" }}>
            {hitos[0].pct}%
          </p>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: "#1B4D2E" }}>Hito único</p>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.15, color: "#0E1A17" }}>
              {hitos[0].label}
            </p>
          </div>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, color: "#0E1A17" }}>{formatCOP(totalPropuesta)}</p>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {hitos.map((h, i) => {
            const v = variants[i % variants.length];
            const c = tileColors(v);
            return (
              <Tile key={h.id} variant={v} style={{ flexDirection: "row", alignItems: "center", gap: 40, padding: "18px 40px", borderRadius: 32 }}>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 56, fontWeight: 800, color: c.accent, width: 160 }}>
                  {h.pct}%
                </p>
                <p style={{ flex: 1, fontSize: 30, fontWeight: 600, color: c.fg }}>{h.label}</p>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 36, fontWeight: 700, color: c.fg }}>
                  {formatCOP(totalPropuesta * (h.pct / 100))}
                </p>
              </Tile>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Elaboramos una sola factura sobre la cual se pueden hacer los abonos o facturas por cada abono. Valores
        antes de IVA.
      </p>
    </Slide1920>
  );
}

export function CronogramaSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const weeks = Array.from(new Set(data.scheduleItems.map((s) => s.week_number))).sort((a, b) => a - b);
  const variants: TileVariant[] = ["ink", "mint", "gray", "deep"];
  return (
    <Slide1920 theme="light" section="Ejecución" page={page} total={total} contentStyle={{ gap: 48 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Cronograma
      </h2>
      {weeks.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>Todavía no hay cronograma definido en la Propuesta.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "stretch" }}>
          {weeks.map((w, i) => {
            const hitos = data.scheduleItems.filter((s) => s.week_number === w);
            const v = variants[i % variants.length];
            const c = tileColors(v);
            return (
              <Tile key={w} variant={v} badge={i === 0} style={{ flex: 1, padding: 28, gap: 16 }}>
                <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, color: c.muted }}>Semana</p>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1, color: c.accent }}>
                  {String(w).padStart(2, "0")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {hitos.map((h) => (
                    <div key={h.id} style={{ background: v === "ink" || v === "deep" ? "rgba(255,255,255,0.10)" : "rgba(14,26,23,0.08)", borderRadius: 20, padding: 20 }}>
                      <p style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: c.fg }}>{h.hito}</p>
                    </div>
                  ))}
                </div>
              </Tile>
            );
          })}
        </div>
      )}
    </Slide1920>
  );
}

export function RequerimientosSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  const items = data.operationalRequirements;
  return (
    <Slide1920 theme="light" section="Ejecución" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Requerimientos operativos
      </h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>No hay requerimientos operativos definidos en la Propuesta.</p>
      ) : (
        <Tile variant="gray" style={{ padding: "16px 48px" }}>
          {items.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 32,
                alignItems: "center",
                padding: "18px 0",
                borderBottom: i < items.length - 1 ? `1px solid ${t.line}` : undefined,
              }}
            >
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 32, fontWeight: 800, color: t.accent2, width: 64 }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p style={{ flex: 1, fontSize: 28, lineHeight: 1.35, color: t.fg }}>{r.text}</p>
            </div>
          ))}
        </Tile>
      )}
    </Slide1920>
  );
}

export function CierreSlide({
  data,
  page,
  total,
  onEditContacto,
}: {
  data: DeckData;
  page: number;
  total: number;
  /** Si se pasa, los datos de contacto se editan en la propia lámina (no se pasa en el área oculta que exporta el PDF). */
  onEditContacto?: (field: keyof PresentacionContacto, value: string) => void;
}) {
  const t = THEME.dark;
  const { owner, proposal } = data;
  const [editing, setEditing] = useState(false);
  const textos = {
    eyebrow: proposal.presentacion_contacto?.eyebrow ?? "Atentamente",
    titulo: proposal.presentacion_contacto?.titulo ?? "Gracias",
    mensaje:
      proposal.presentacion_contacto?.mensaje ??
      `Hagamos de ${proposal.event_name} un evento sin filas y con datos reales.`,
  };
  const inputStyle = (fontSize: number, color: string, fontFamily?: string) =>
    ({
      width: "100%",
      fontSize,
      fontFamily: fontFamily ?? "inherit",
      color,
      background: "transparent",
      border: `1px solid ${t.line}`,
      borderRadius: 8,
      padding: "4px 10px",
    }) as const;
  const field = (key: "full_name" | "cargo" | "correo" | "telefono", placeholder: string, fontSize: number, fontFamily?: string) => (
    <input
      value={owner?.[key] ?? ""}
      onChange={(e) => onEditContacto?.(key, e.target.value)}
      placeholder={placeholder}
      style={inputStyle(fontSize, key === "full_name" ? t.fg : t.muted, fontFamily)}
    />
  );
  const textField = (key: "eyebrow" | "titulo" | "mensaje", fontSize: number, color: string, fontFamily?: string) => (
    <input
      value={textos[key]}
      onChange={(e) => onEditContacto?.(key, e.target.value)}
      style={inputStyle(fontSize, color, fontFamily)}
    />
  );
  return (
    <Slide1920
      theme="dark"
      section="Contacto"
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", alignItems: "center", gap: 96 }}
    >
      {onEditContacto && (
        <button
          type="button"
          title={editing ? "Terminar de editar" : "Editar texto"}
          onClick={() => setEditing((v) => !v)}
          style={{
            position: "absolute",
            right: 128,
            top: 110,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: `1px solid ${t.line}`,
            background: editing ? t.accent : t.card,
            color: editing ? "#0E1A17" : t.fg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {editing ? <polyline points="20 6 9 17 4 12" /> : <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />}
          </svg>
        </button>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
        {onEditContacto && editing ? (
          <>
            {textField("eyebrow", 24, t.accent)}
            {textField("titulo", 80, t.fg, DISPLAY_FONT)}
            {textField("mensaje", 28, t.muted)}
          </>
        ) : (
          <>
            <p style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: t.accent }}>{textos.eyebrow}</p>
            <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.fg }}>
              {textos.titulo}
            </h1>
            <p style={{ fontSize: 28, color: t.muted }}>{textos.mensaje}</p>
          </>
        )}
      </div>
      <Tile variant="gray" on="dark" badge style={{ width: 640, gap: 14, padding: 48 }}>
        <>
            {onEditContacto && editing ? (
              <>
                {field("full_name", "Nombre", 32, DISPLAY_FONT)}
                {field("cargo", "Cargo", 24)}
                {field("correo", "Correo", 24)}
                {field("telefono", "Teléfono", 24)}
              </>
            ) : (
              <>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
                  {val(owner?.full_name)}
                </p>
                <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.cargo)}</p>
                <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.correo)}</p>
                <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.telefono)}</p>
              </>
            )}
        </>
      </Tile>
    </Slide1920>
  );
}
