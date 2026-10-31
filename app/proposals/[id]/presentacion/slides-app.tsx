import { formatCOP } from "@/lib/pricing/summary";
import { formatFechaCorta } from "@/lib/fecha-local";
import {
  CheckBadge,
  DISPLAY_FONT,
  POR_DEFINIR,
  Slide1920,
  THEME,
  TicketCard,
  formatNumber,
  val,
  type DeckData,
} from "./deck-shell";

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
  "Suministro de personal logístico": (p) =>
    `(${p.qty_logistico}) Logísticos para cubrir todos los espacios definidos (registro, acreditación, sesiones principales, sesiones internas)`,
  "Control de aceso a cada una de las sesiones internas del evento": (p) =>
    `(${p.qty_logistico}) personas de logística, (${p.qty_logistico}) equipos de lectura`,
  "Suministro de equipos": (p) =>
    `(${p.qty_computadores}) Portátiles, (${p.qty_impresoras}) Impresoras, (${p.qty_logistico}) smartphones de lectura`,
  "Suministro de consumibles": (p) => `(${p.qty_rollos_labels}) rollos de papel térmico para labels`,
};

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const t = THEME.light;
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 24,
        padding: 40,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: t.accent2 }}>{label}</p>
      <p
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.1,
          color: highlight ? t.fg : t.muted,
        }}
      >
        {value}
      </p>
    </div>
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
        <p style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: t.accent }}>Propuesta comercial</p>
        <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.fg }}>
          {proposal.event_name}
        </h1>
        <p style={{ fontSize: 28, color: t.muted }}>
          Evento {modalityLabel[proposal.modality] ?? proposal.modality} · Plataforma integral de e-ticketing y
          logística
        </p>
      </div>
      <TicketCard
        width={640}
        height={448}
        cardBg={t.card}
        cardBorder={t.line}
        leftWidth={450}
        notchBg={t.bg}
        accentBg={t.accent}
        left={
          <>
            <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: t.accent }}>Atención</p>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
              {val(client?.contact_name)}
            </p>
            <p style={{ fontSize: 28, color: t.muted }}>{val(client?.contact_cargo)}</p>
          </>
        }
        right={
          <>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1, color: "#0E1A17" }}>{dia}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#0E1A17" }}>{mes}</p>
            <p style={{ fontSize: 24, color: "#0E1A17" }}>{anio}</p>
          </>
        }
      />
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
      "DATA real y segmentada de todo el flujo de los asistentes antes y durante el evento.",
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
      "DATA real y segmentada de todo el flujo de los asistentes antes y durante el evento.",
    ],
  },
  mundo_virtual: {
    title: "Nuestra solución para mundos virtuales",
    intro: "Un servicio premium sobre el cual tenemos todo el control para garantizar:",
    bullets: [
      "La forma más eficiente de configurar y publicar cualquier evento.",
      "Organización, agilidad y comodidad desde el registro hasta el acceso de los asistentes.",
      "DATA real y segmentada de todo el flujo de los asistentes antes y durante el evento.",
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
      <div style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 28, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/propuesta-deck/plataforma.png"
          alt="Panel de configuración de entradas de la plataforma Ticketcode"
          style={{ width: 752, height: 456, objectFit: "contain", borderRadius: 12 }}
        />
      </div>
    </Slide1920>
  );
}

export function PerfilSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const { proposal } = data;
  const fechas =
    proposal.event_start_date
      ? `${formatFechaCorta(proposal.event_start_date)}${proposal.event_end_date ? ` a ${formatFechaCorta(proposal.event_end_date)}` : ""}`
      : POR_DEFINIR;
  return (
    <Slide1920 theme="light" section="El evento" page={page} total={total} contentStyle={{ gap: 56 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: THEME.light.fg }}>
        Perfil del evento
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        <div style={{ gridColumn: "span 2" }}>
          <Stat label="Nombre" value={proposal.event_name} highlight />
        </div>
        <Stat label="Modalidad" value={modalityLabel[proposal.modality] ?? proposal.modality} highlight />
        {proposal.modality === "hibrido" ? (
          <>
            <Stat label="Aforo presencial" value={val(proposal.aforo)} highlight={!!proposal.aforo} />
            <Stat label="Aforo virtual" value={val(proposal.aforo_virtual)} highlight={!!proposal.aforo_virtual} />
          </>
        ) : proposal.modality === "virtual" || proposal.modality === "mundo_virtual" ? (
          <Stat label="Aforo virtual" value={val(proposal.aforo_virtual)} highlight={!!proposal.aforo_virtual} />
        ) : (
          <Stat label="Aforo" value={val(proposal.aforo)} highlight={!!proposal.aforo} />
        )}
        <div style={{ gridColumn: "span 2" }}>
          <Stat label="Lugar" value={val(proposal.lugar)} highlight={!!proposal.lugar} />
        </div>
        <Stat label="Ciudad" value={val(proposal.city)} highlight={!!proposal.city} />
        <Stat label="Fechas" value={fechas} highlight={fechas !== POR_DEFINIR} />
      </div>
    </Slide1920>
  );
}

function ChecklistCard({
  title,
  items,
  emptyLabel,
  showDescription = true,
}: {
  title: string;
  items: { key: string; label: string; description: string | null }[];
  emptyLabel: string;
  /** Componentes básicos y Logística 360 ya tienen su propia lámina de
      detalle con la descripción completa (ver ComponentesSlide/LogisticaSlide)
      — acá solo se listan los nombres, para no depender de recortar texto con
      CSS (-webkit-line-clamp no siempre se respeta al capturar con
      html2canvas para el PDF, y se veía como si el contenido se cortara). */
  showDescription?: boolean;
}) {
  const t = THEME.light;
  // Con muchos ítems marcados, listar cada uno con su línea completa puede
  // no caber en la tarjeta — esta lámina es solo el resumen (el detalle
  // completo vive en Componentes básicos / Logística 360), así que de
  // sobrar espacio se recorta la lista con un "+N más" en vez de desbordar
  // en silencio.
  const MAX_ROWS = showDescription ? 9 : 12;
  const visible = items.slice(0, MAX_ROWS);
  const hiddenCount = items.length - visible.length;
  const compact = items.length > 7;

  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 24,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        flex: 1,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 36, fontWeight: 700, lineHeight: 1.1, color: t.accent2 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: 24, lineHeight: 1.4, color: t.muted }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 14, overflow: "hidden" }}>
          {visible.map((item) => (
            <div key={item.key} style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <CheckBadge size={compact ? 24 : 30} iconSize={compact ? 14 : 18} bg={t.accent} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <p style={{ fontSize: compact ? 20 : 24, fontWeight: 600, lineHeight: 1.25, color: t.fg, margin: 0 }}>
                  {item.label}
                </p>
                {showDescription && item.description && (
                  <p style={{ fontSize: 20, lineHeight: 1.3, color: t.muted, margin: 0 }}>{item.description}</p>
                )}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p style={{ fontSize: 20, fontWeight: 600, color: t.accent2, margin: 0 }}>
              + {hiddenCount} más — ver detalle en la siguiente lámina
            </p>
          )}
        </div>
      )}
    </div>
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
          items={componentesBasicos}
          emptyLabel="No hay componentes básicos definidos para esta modalidad."
          showDescription={false}
        />
        <ChecklistCard
          title="Logística 360"
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
          items={servicios}
          emptyLabel="Esta propuesta no incluye servicios personalizados adicionales."
          showDescription={false}
        />
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
  const dense = items.length > 6;

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
        <div style={{ borderRadius: 16, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: dense ? 22 : 26, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "34%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Componente
                </th>
                <th style={{ width: "66%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", color: t.fg, verticalAlign: "top" }}>
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
  const dense = items.length > 6;

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
        <div style={{ borderRadius: 16, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: dense ? 22 : 26, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "34%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Servicio
                </th>
                <th style={{ width: "66%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", color: t.fg, verticalAlign: "top" }}>
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
            background: t.bg,
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
  const dense = items.length > 5;

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
        <div style={{ borderRadius: 16, overflow: "hidden", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: dense ? 20 : 24, color: t.fg }}>
            <tbody>
              <tr style={{ background: t.accent2 }}>
                <th style={{ width: "30%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Componente
                </th>
                <th style={{ width: "70%", padding: dense ? "10px 16px" : "14px 20px", color: "#FFFFFF", textAlign: "left" }}>
                  Qué incluye
                </th>
              </tr>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? t.card : "transparent" }}>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", fontWeight: 700, verticalAlign: "top" }}>
                    {item.name}
                  </td>
                  <td style={{ padding: dense ? "10px 16px" : "14px 20px", lineHeight: 1.4, verticalAlign: "top" }}>
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
      <table style={{ fontFamily: "inherit", fontSize: 28, color: t.fg, borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr style={{ background: t.card }}>
            <th style={{ width: "22%", color: t.accent, textAlign: "left", padding: "16px 12px" }}>Concepto</th>
            <th style={{ width: "54%", color: t.accent, textAlign: "left", padding: "16px 12px" }}>
              Elementos con presencia de marca del patrocinador
            </th>
            <th style={{ width: "24%", color: t.accent, textAlign: "left", padding: "16px 12px" }}>Impacto inicial</th>
          </tr>
          <tr>
            <td style={{ padding: "16px 12px" }}>Registro</td>
            <td style={{ padding: "16px 12px" }}>
              Correo de confirmación · Correo de recordación · Escarapela digital (descarga) · Impacto comercial a
              la base de datos
            </td>
            <td style={{ padding: "16px 12px" }}>{editableCell("registro", registro)}</td>
          </tr>
          <tr>
            <td style={{ padding: "16px 12px" }}>Acreditación y control de acceso</td>
            <td style={{ padding: "16px 12px" }}>
              Escarapela digital (acceso) · Manilla biodegradable · Base de datos de visitantes a cada stand de la
              zona expo
            </td>
            <td style={{ padding: "16px 12px" }}>{editableCell("acreditacion", acreditacion)}</td>
          </tr>
          <tr style={{ background: t.card }}>
            <td style={{ padding: "16px 12px" }}>Total estimado</td>
            <td />
            <td style={{ padding: "16px 12px" }}>
              {total != null ? `${formatNumber(total)} impactos` : `${POR_DEFINIR} impactos`}
            </td>
          </tr>
        </tbody>
      </table>
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
  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ gap: 40 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Acuerdo comercial
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Lo que podemos negociar para optimizar el presupuesto inicial.
      </p>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                background: t.card,
                border: `1px solid ${t.line}`,
                borderRadius: 24,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                flex: 1,
              }}
            >
              <p style={{ fontSize: 24, letterSpacing: 2, color: t.accent2 }}>{String(i + 1).padStart(2, "0")}</p>
              <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: t.fg }}>
                {item.label}
              </h3>
              {item.notes && <p style={{ fontSize: 24, lineHeight: 1.4, color: t.muted }}>{item.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </Slide1920>
  );
}

export function InversionSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.light;
  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ justifyContent: "center", gap: 20 }}>
      <p style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: t.accent }}>Inversión inicial</p>
      <p
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: -3,
          color: t.fg,
          margin: 0,
        }}
      >
        {formatCOP(data.tarifarioSummary.valorPropuestaFinal)}
      </p>
      <div style={{ width: 160, height: 8, borderRadius: 4, background: t.accent, marginTop: 16 }} />
      <p style={{ fontSize: 28, color: t.muted, marginTop: 8 }}>
        Valor de la propuesta final, antes de IVA y del acuerdo comercial.
      </p>
    </Slide1920>
  );
}

export function FinalSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.green;
  const { tarifarioSummary, proposal } = data;
  const base = tarifarioSummary.valorPropuestaFinal;
  const descuentoPct = proposal.acuerdo_comercial_pct_global;
  const hasAcuerdo = descuentoPct > 0;
  const descuento = base * (descuentoPct / 100);
  const conDescuento = base - descuento;

  return (
    <Slide1920
      theme="green"
      section="Inversión"
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", gap: 96, alignItems: "center" }}
    >
      <div style={{ width: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
          Presupuesto final
        </h2>
        <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>Valor justo y ganador para las partes.</p>
        {hasAcuerdo && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              ["Valor sin acuerdo comercial", formatCOP(base)],
              [`Acuerdo comercial (${descuentoPct}%)`, `- ${formatCOP(descuento)}`],
              ["Valor con acuerdo comercial", formatCOP(conDescuento)],
            ].map(([label, value], i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "22px 0",
                  borderBottom: i < 2 ? `2px solid ${t.line}` : undefined,
                }}
              >
                <p style={{ fontSize: 24, color: t.muted }}>{label}</p>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, color: t.fg }}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <TicketCard
        width={800}
        height={408}
        cardBg="#0E1A17"
        cardBorder={t.line}
        leftWidth={600}
        notchBg={t.bg}
        accentBg={THEME.dark.accent}
        left={
          <>
            <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: THEME.dark.accent }}>
              Total propuesta
            </p>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: THEME.dark.fg }}>
              {formatCOP(conDescuento)}
            </p>
            <p style={{ fontSize: 28, color: THEME.dark.muted }}>Antes de IVA</p>
          </>
        }
        right={
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#0E1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4.5 5v6c0 4.97 3.19 9.44 7.5 10.5 4.31-1.06 7.5-5.53 7.5-10.5V5L12 2Z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        }
      />
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

  return (
    <Slide1920 theme="light" section="Inversión" page={page} total={total} contentStyle={{ gap: 48 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg, margin: 0 }}>
          Modelo de pagos
        </h2>
        <a
          href={`/proposals/${proposal.id}/propuesta#pagos`}
          data-pdf-link={`/proposals/${proposal.id}/propuesta`}
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 22,
            fontWeight: 700,
            color: t.accent2,
            border: `2px solid ${t.accent2}`,
            borderRadius: 999,
            padding: "12px 24px",
            textDecoration: "none",
          }}
        >
          Modificar modelo de pagos
        </a>
      </div>
      {hitos.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>Todavía no hay hitos de pago definidos en la Propuesta.</p>
      ) : hitos.length === 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 64,
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 28,
            padding: 56,
          }}
        >
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.accent2 }}>
            {hitos[0].pct}%
          </p>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: t.muted }}>Hito único</p>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.15, color: t.fg }}>
              {hitos[0].label}
            </p>
          </div>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, color: t.fg }}>{formatCOP(totalPropuesta)}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {hitos.map((h) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 40,
                background: t.card,
                border: `1px solid ${t.line}`,
                borderRadius: 24,
                padding: 32,
              }}
            >
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, color: t.accent2, width: 160 }}>
                {h.pct}%
              </p>
              <p style={{ flex: 1, fontSize: 32, fontWeight: 600, color: t.fg }}>{h.label}</p>
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, color: t.fg }}>
                {formatCOP(totalPropuesta * (h.pct / 100))}
              </p>
            </div>
          ))}
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
  return (
    <Slide1920 theme="light" section="Ejecución" page={page} total={total} contentStyle={{ gap: 56 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Cronograma
      </h2>
      {weeks.length === 0 ? (
        <p style={{ fontSize: 28, color: t.muted }}>Todavía no hay cronograma definido en la Propuesta.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
          {weeks.map((w) => {
            const hitos = data.scheduleItems.filter((s) => s.week_number === w);
            return (
              <div
                key={w}
                style={{
                  flex: 1,
                  borderTop: `6px solid ${t.accent}`,
                  paddingTop: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <p style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: t.muted }}>Semana</p>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1, color: t.accent2 }}>
                  {String(w).padStart(2, "0")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {hitos.map((h) => (
                    <div key={h.id} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 16, padding: 20 }}>
                      <p style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: t.fg }}>{h.hito}</p>
                    </div>
                  ))}
                </div>
              </div>
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 32,
                alignItems: "center",
                padding: "16px 0",
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 28, fontWeight: 700, color: t.accent, width: 56 }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p style={{ flex: 1, fontSize: 28, lineHeight: 1.35, color: t.fg }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </Slide1920>
  );
}

export function CierreSlide({ data, page, total }: { data: DeckData; page: number; total: number }) {
  const t = THEME.dark;
  const { owner, proposal } = data;
  return (
    <Slide1920
      theme="dark"
      section="Contacto"
      page={page}
      total={total}
      contentStyle={{ flexDirection: "row", alignItems: "center", gap: 96 }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
        <p style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: t.accent }}>Atentamente</p>
        <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.fg }}>
          Gracias
        </h1>
        <p style={{ fontSize: 28, color: t.muted }}>
          Hagamos de {proposal.event_name} un evento sin filas y con datos reales.
        </p>
      </div>
      <TicketCard
        width={640}
        height={448}
        cardBg={t.card}
        cardBorder={t.line}
        leftWidth={450}
        notchBg={t.bg}
        accentBg={t.accent}
        left={
          <>
            <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
              {val(owner?.full_name)}
            </p>
            <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.cargo)}</p>
            <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.correo)}</p>
            <p style={{ fontSize: 28, color: t.muted }}>{val(owner?.telefono)}</p>
          </>
        }
        right={
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#0E1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            <path d="M22 2 11 13" />
          </svg>
        }
      />
    </Slide1920>
  );
}
