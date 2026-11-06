import { formatCOP } from "@/lib/pricing/summary";
import { CheckBadge, DISPLAY_FONT, Pill, Slide1920, THEME, Tile, tileColors, formatNumber, type DeckData, type TileVariant } from "./deck-shell";

/**
 * Láminas de EVE, la IA de eventos de Ticketcode. El texto del alcance técnico es fijo (es el alcance del módulo);
 * los números salen de la propuesta (aforo, tarifas de EVE y acompañamiento).
 */

export interface EveDeck {
  asistentes: number;
  fee: number;
  porAsistente: number;
  valorAsistentes: number;
  total: number;
  /** Acompañamiento en sitio solo para EVE; null = no lleva. */
  acompanamiento: { equipo: number; ciudad: string | null; dias: number; preoperativa: number; total: number } | null;
}

/** Datos de las láminas de EVE; null si la propuesta no lleva EVE (o es una versión anterior a EVE). */
export function getEveDeck(data: DeckData): EveDeck | null {
  const s = data.tarifarioSummary;
  if (data.proposal.con_eve !== true || !s.eve) return null;
  const acomp = s.eveAcompanamiento;
  return {
    asistentes: s.eve.asistentes,
    fee: s.eve.fee,
    porAsistente: s.eve.porAsistente,
    valorAsistentes: s.eve.valorAsistentes,
    total: s.eve.total,
    acompanamiento: acomp
      ? {
          equipo: Number(data.proposal.eve_qty_equipo ?? 0),
          ciudad: data.proposal.city,
          dias: Number(data.proposal.dias),
          preoperativa: Number(data.proposal.visita_preoperativa_dias ?? 0),
          total: s.eveAcompanamientoPrecio,
        }
      : null,
  };
}

const ALCANCE = {
  entendimiento: {
    titulo: "Entendimiento del flujo",
    intro: "Reunión de 1 a 2 horas para definir el flujo de operación del agente:",
    items: ["Fuentes de información, manejo de agenda y perfilamiento", "Fases de actuación del agente: expectativa de lanzamiento, sostenimiento y post-evento"],
  },
  diseno: {
    titulo: "Diseño, configuración y personalización del agente virtual IA",
    items: [
      "Fuentes de información histórica: eventos anteriores, memorias y todo el material de base",
      "Perfil del formulario de registro: información clave para networking y matchmaking",
      "Manejo de la agenda del evento: fuentes, actualizaciones y formatos",
      "Información colateral: transporte, zonas comunes y baños, restaurantes, parqueaderos y salidas de emergencia",
      "Flujo hacia la muestra comercial: stands y feria comercial",
      "Variables a tener en cuenta en los informes",
    ],
  },
  implementacion: {
    titulo: "Implementación",
    items: ["Despliegue de las personalizaciones en ambiente de pruebas, para revisiones, correcciones y ajustes", "Revisión de los flujos conversacionales del agente (validación de información)"],
  },
  tecnologia: {
    titulo: "Tecnología e infraestructura",
    items: ["Framework de lenguaje", "Motor de base de datos", "Servicio de hosting", "Sistema de caché", "API de mensajería", "Integración desde el registro a Ticketcode", "Sistema de mensajería"],
  },
  entregables: {
    titulo: "Entregables",
    items: [
      "Agente personalizado (avatar para el evento)",
      "Flujo comercial para generación de leads calificados post-evento, especial para participantes de la muestra comercial",
      "Flujo para aumentar aforo: campaña de calentamiento de la base de datos histórica del evento para generar registros o compra de boletería, y complemento con nuevas comunidades en redes sociales o buscadores",
    ],
  },
  soporte: { titulo: "Soporte técnico permanente", texto: "Mesa de ayuda remota, atención y solución a problemas técnicos, respaldo de operaciones." },
};

function Cabecera({ pill, titulo, intro }: { pill: string; titulo: string; intro?: string }) {
  const t = THEME.light;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
      <Pill>{pill}</Pill>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg, marginTop: 20 }}>{titulo}</h2>
      {intro && <p style={{ fontSize: 28, lineHeight: 1.35, color: t.muted, marginTop: 12 }}>{intro}</p>}
    </div>
  );
}

function Lista({ items, variant, size = 24 }: { items: string[]; variant: TileVariant; size?: number }) {
  const c = tileColors(variant);
  const checkBg = variant === "mint" ? "#EAF3F0" : "#3CD65C";
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
      {items.map((it, k) => (
        <div key={it} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", marginTop: k === 0 ? 0 : 12 }}>
          <CheckBadge size={size + 2} iconSize={size - 6} bg={checkBg} />
          <p style={{ flex: 1, fontSize: size, lineHeight: 1.25, fontWeight: 600, color: c.fg, marginLeft: 12 }}>{it}</p>
        </div>
      ))}
    </div>
  );
}

function Caja({ variant, titulo, children, flex = 1 }: { variant: TileVariant; titulo: string; children: React.ReactNode; flex?: number }) {
  const c = tileColors(variant);
  return (
    <Tile variant={variant} style={{ flex, padding: 32, overflow: "hidden" }}>
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{titulo}</h3>
      {children}
    </Tile>
  );
}

const QUE_HACE: { variant: TileVariant; titulo: string; texto: string }[] = [
  { variant: "ink", titulo: "Agente en WhatsApp", texto: "Conoce a cada asistente y le recomienda la agenda en tiempo real, a quién conocer, con quién hacer negocios, la información del evento y la ubicación dentro del recinto. Sin descargar ninguna app." },
  { variant: "mint", titulo: "Integración con tus sistemas", texto: "Se conecta con la base de inscritos y el control de acceso, sin alterar tu operación." },
  { variant: "gray", titulo: "Perfilamiento", texto: "Completa el perfil que el formulario de registro no captura: sector, rol, qué busca y qué ofrece cada asistente." },
  { variant: "deep", titulo: "Matchmaking en tiempo real", texto: "Recomienda conexiones solo entre personas presentes en el recinto, coordinadas con los espacios de networking." },
];

/** 1. Qué es EVE y qué hace. */
export function EveSlide({ page, total }: { page: number; total: number }) {
  return (
    <Slide1920 theme="light" section="EVE" page={page} total={total}>
      <Cabecera pill="EVE by Ticketcode" titulo="EVE, la inteligencia artificial de tu evento" intro="Un agente personalizado que conoce a cada asistente y le ayuda a sacarle todo el valor al evento." />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {[QUE_HACE.slice(0, 2), QUE_HACE.slice(2)].map((fila, r) => (
          <div key={r} style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0, marginTop: r ? 24 : 0 }}>
            {fila.map((q, i) => {
              const c = tileColors(q.variant);
              return (
                <div key={q.titulo} style={{ display: "flex", flex: 1, marginLeft: i ? 24 : 0 }}>
                  <Tile variant={q.variant} style={{ flex: 1, padding: 32, overflow: "hidden" }}>
                    <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 38, fontWeight: 700, lineHeight: 1.1, color: c.accent }}>{q.titulo}</h3>
                    <p style={{ fontSize: 26, lineHeight: 1.35, fontWeight: 500, color: c.fg, marginTop: 14 }}>{q.texto}</p>
                  </Tile>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Slide1920>
  );
}

/** 2. Cómo se diseña EVE para el evento: entendimiento, diseño y personalización, implementación. */
export function EveDisenoSlide({ page, total }: { page: number; total: number }) {
  const { entendimiento, diseno, implementacion } = ALCANCE;
  return (
    <Slide1920 theme="light" section="EVE" page={page} total={total}>
      <Cabecera pill="Alcance técnico" titulo="Cómo diseñamos a EVE para tu evento" />
      <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flex: 5, minWidth: 0 }}>
          <Caja variant="ink" titulo={diseno.titulo}>
            <Lista items={diseno.items} variant="ink" />
          </Caja>
        </div>
        <div style={{ width: 24, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 4, minWidth: 0 }}>
          <Caja variant="mint" titulo={entendimiento.titulo} flex={1.25}>
            <p style={{ fontSize: 24, lineHeight: 1.3, color: tileColors("mint").muted, marginTop: 8 }}>{entendimiento.intro}</p>
            <Lista items={entendimiento.items} variant="mint" />
          </Caja>
          <div style={{ height: 24, flexShrink: 0 }} />
          <Caja variant="gray" titulo={implementacion.titulo}>
            <Lista items={implementacion.items} variant="gray" />
          </Caja>
        </div>
      </div>
    </Slide1920>
  );
}

/** 3. Tecnología, entregables y soporte. */
export function EveEntregablesSlide({ page, total }: { page: number; total: number }) {
  const { tecnologia, entregables, soporte } = ALCANCE;
  return (
    <Slide1920 theme="light" section="EVE" page={page} total={total}>
      <Cabecera pill="Alcance técnico" titulo="Tecnología, entregables y soporte" />
      <div style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flex: 4, minWidth: 0 }}>
          <Caja variant="deep" titulo={tecnologia.titulo}>
            <Lista items={tecnologia.items} variant="deep" />
          </Caja>
        </div>
        <div style={{ width: 24, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 6, minWidth: 0 }}>
          <Caja variant="ink" titulo={entregables.titulo} flex={3}>
            <Lista items={entregables.items} variant="ink" />
          </Caja>
          <div style={{ height: 24, flexShrink: 0 }} />
          <Caja variant="mint" titulo={soporte.titulo} flex={1}>
            <p style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 500, color: tileColors("mint").fg, marginTop: 12 }}>{soporte.texto}</p>
          </Caja>
        </div>
      </div>
    </Slide1920>
  );
}

function FilaPrecio({ label, detalle, valor, variant }: { label: string; detalle?: string; valor: string; variant: TileVariant }) {
  const c = tileColors(variant);
  return (
    <Tile variant={variant} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "24px 48px" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 30, fontWeight: 700, color: c.fg }}>{label}</p>
        {detalle && <p style={{ fontSize: 24, lineHeight: 1.3, color: c.muted, marginTop: 4 }}>{detalle}</p>}
      </div>
      <p style={{ fontFamily: DISPLAY_FONT, fontSize: 48, fontWeight: 800, color: c.fg, whiteSpace: "nowrap" }}>{valor}</p>
    </Tile>
  );
}

/** 4. Inversión en EVE: fee + valor por asistente (+ acompañamiento si lo lleva). Valores antes de IVA. */
export function EveInversionSlide({ eve, page, total }: { eve: EveDeck; page: number; total: number }) {
  const a = eve.acompanamiento;
  const totalEve = eve.total + (a?.total ?? 0);
  return (
    <Slide1920 theme="light" section="EVE" page={page} total={total}>
      <Cabecera pill="Inversión" titulo="Inversión en EVE" intro="Un fee fijo por evento más un valor por asistente. Valores antes de IVA." />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, justifyContent: "center" }}>
        <FilaPrecio variant="gray" label="Fee fijo del evento" valor={formatCOP(eve.fee)} />
        <div style={{ height: 20 }} />
        <FilaPrecio
          variant="mint"
          label="Asistentes"
          detalle={`${formatNumber(eve.asistentes)} asistentes × ${formatCOP(eve.porAsistente)}`}
          valor={formatCOP(eve.valorAsistentes)}
        />
        {a && (
          <>
            <div style={{ height: 20 }} />
            <FilaPrecio
              variant="ink"
              label="Acompañamiento de EVE en sitio"
              detalle={`${a.equipo} personas${a.ciudad ? ` en ${a.ciudad}` : ""}${a.preoperativa > 0 ? `, desde ${a.preoperativa === 1 ? "un día antes" : `${a.preoperativa} días antes`}` : ""} y ${a.dias} ${a.dias === 1 ? "día" : "días"} de evento`}
              valor={formatCOP(a.total)}
            />
          </>
        )}
        <div style={{ height: 32 }} />
        <FilaPrecio variant="deep" label="Total EVE" valor={formatCOP(totalEve)} />
      </div>
    </Slide1920>
  );
}
