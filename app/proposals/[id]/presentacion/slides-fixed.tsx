import { CheckBadge, DISPLAY_FONT, POR_DEFINIR, Pill, Slide1920, THEME, Tile, tileColors, type TileVariant } from "./deck-shell";

const IMG = (name: string) => `/propuesta-deck/${name}`;

function FeatureCard({
  icon,
  title,
  variant,
}: {
  icon: (stroke: string) => React.ReactNode;
  title: string;
  variant: TileVariant;
}) {
  const c = tileColors(variant);
  const mint = variant === "mint";
  return (
    <Tile variant={variant} style={{ gap: 28, flex: 1 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: mint ? "#0E1A17" : "#3CD65C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon(mint ? "#7BE08F" : "#0E1A17")}
      </div>
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: c.fg }}>{title}</h3>
    </Tile>
  );
}

function Icon({ path, stroke = "#0E1A17", size = 40 }: { path: React.ReactNode; stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

// TODO: reemplazar por el link real del video de presentación de Ticketcode — mientras
// quede en null, esta lámina se queda con la foto fija de siempre (sin ícono de play).
const PLATAFORMA_VIDEO_URL: string | null = null;

export function PlataformaSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  const foto = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={IMG("p40k.jpg")}
      alt="Teléfono mostrando un código QR de ingreso, más de 40.000 personas"
      style={{ width: 640, height: 360, objectFit: "cover", borderRadius: 36, display: "block" }}
    />
  );
  return (
    <Slide1920 theme="light" section="Quiénes somos" page={page} total={total} contentStyle={{ gap: 48 }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 64, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
            La plataforma integral para realizar cualquier evento
          </h2>
          <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
            Aumentamos la comodidad de los asistentes y generamos DATA real y segmentada en tiempo real.
          </p>
        </div>
        {PLATAFORMA_VIDEO_URL ? (
          <a
            href={PLATAFORMA_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            data-pdf-link={PLATAFORMA_VIDEO_URL}
            style={{ position: "relative", display: "block" }}
          >
            {foto}
            <PlayIcon />
          </a>
        ) : (
          foto
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
        <FeatureCard variant="ink" icon={(s) => <Icon stroke={s} path={<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />} />} title="Boletería electrónica" />
        <FeatureCard
          variant="mint"
          icon={(s) => (
            <Icon
              stroke={s}
              path={
                <>
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <path d="M17 11a4 4 0 0 0 0-8" />
                  <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                </>
              }
            />
          )}
          title="Logística 360"
        />
        <FeatureCard
          variant="gray"
          icon={(s) => (
            <Icon
              stroke={s}
              path={
                <>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </>
              }
            />
          )}
          title="Protocolos de seguridad"
        />
        <FeatureCard
          variant="deep"
          icon={(s) => (
            <Icon
              stroke={s}
              path={
                <>
                  <path d="M3 3v18h18" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </>
              }
            />
          )}
          title="DATA real"
        />
      </div>
    </Slide1920>
  );
}

export function CifrasSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  const stats: [string, string, TileVariant][] = [
    ["12", "años en la industria", "ink"],
    ["+5.000", "eventos", "mint"],
    ["+1.000.000", "asistentes", "gray"],
    ["Global", "plataforma", "deep"],
  ];
  return (
    <Slide1920 theme="light" section="Quiénes somos" page={page} total={total}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1 }}>
        <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 28, marginRight: 72 }}>
          <Pill>Quiénes somos</Pill>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
            Nuestra experiencia en la industria no se improvisa
          </h2>
          <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
            Mantenerse por más de una década en una industria tan competitiva es muestra de que lo estamos
            haciendo bien.
          </p>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {stats.map(([n, label, variant]) => {
            const c = tileColors(variant);
            return (
              <Tile key={label} variant={variant} badge={variant === "ink"} style={{ gap: 12, height: 280, justifyContent: "flex-end" }}>
                <p style={{ fontFamily: DISPLAY_FONT, fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: c.fg }}>
                  {n}
                </p>
                <p style={{ fontSize: 28, fontWeight: 600, color: c.muted }}>{label}</p>
              </Tile>
            );
          })}
        </div>
      </div>
    </Slide1920>
  );
}

const ORGANIZADOR_ITEMS = [
  {
    n: "01",
    title: "Versatilidad",
    body: "Nuestros componentes son realizados in-house por nuestra ingeniería: somos ágiles para implementaciones, integraciones y crecimiento del producto.",
  },
  {
    n: "02",
    title: "All-in",
    body: "Todo lo que necesita el organizador de un evento, integrado y empaquetado en un solo servicio automatizado.",
  },
  {
    n: "03",
    title: "Soporte + acompañamiento",
    body: "Nuestro equipo técnico y logístico está siempre en función de colaborar con los organizadores, cuidando todos los detalles del evento.",
  },
  {
    n: "04",
    title: "Capacidad de reacción",
    body: "No nos las sabemos todas, pero para cualquier contingencia o desafío siempre encontramos la solución.",
  },
];

export function OrganizadorSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  const variants: TileVariant[] = ["ink", "mint", "gray", "deep"];
  return (
    <Slide1920 theme="light" section="Quiénes somos" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Todo lo que un organizador necesita
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Los eventos son la capacidad de administrar con éxito la mayor cantidad de detalles.
      </p>
      <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
        {ORGANIZADOR_ITEMS.map((item, i) => {
          const c = tileColors(variants[i]);
          return (
            <Tile key={item.n} variant={variants[i]} style={{ gap: 16, flex: 1 }}>
              <p style={{ fontSize: 24, letterSpacing: 2, fontWeight: 600, color: c.accent }}>{item.n}</p>
              <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: c.fg }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 26, lineHeight: 1.4, color: c.muted }}>{item.body}</p>
            </Tile>
          );
        })}
      </div>
    </Slide1920>
  );
}

const INFORME_GENERAL = [
  "Acceso general por días al venue del evento",
  "Visitantes a la zona expo por días y consolidado",
  "Acceso a cada uno de los salones de la agenda por día",
  "Visitantes a cada stand de la zona expo por día y consolidado",
  "Participantes y asistentes especiales (concursos, prensa, gobierno)",
  "Demographics: género, procedencia, edad",
];
const INFORME_SEGUIMIENTO = [
  "Resultados de los píxeles de seguimiento a campañas en redes sociales",
  "Uso de las manillas del evento (interacciones)",
  "Internet dedicado de alta capacidad en los sitios oficiales",
  "Resultados de la encuesta de satisfacción",
  "Transferencia de conocimiento",
];

export const DEFAULT_INFORMES = [...INFORME_GENERAL, ...INFORME_SEGUIMIENTO];

export function InformesSlide({
  items,
  page,
  total,
  onEditInformes,
}: {
  items: string[];
  page: number;
  total: number;
  /** Si se pasa, la lista se edita en la propia lámina (no se pasa en el área oculta que exporta el PDF). */
  onEditInformes?: (items: string[]) => void;
}) {
  const t = THEME.light;
  const actionStyle = {
    fontSize: 22,
    fontFamily: "inherit",
    color: t.fg,
    background: "transparent",
    border: `1px solid ${t.line}`,
    borderRadius: 8,
    padding: "6px 16px",
    cursor: "pointer",
  } as const;
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Informes y entregables
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        DATA real y segmentada para indicadores, estadísticas, proyecciones y crecimiento del evento.
      </p>
      <Tile
        variant="gray"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: 48,
          rowGap: 20,
        }}
      >
        {items.map((text, idx) => (
          <div key={onEditInformes ? idx : text} style={{ display: "flex", flexDirection: "row", gap: 16, alignItems: "flex-start", width: "calc(50% - 24px)" }}>
            <CheckBadge size={30} iconSize={18} bg={t.accent} />
            {onEditInformes ? (
              <>
                <input
                  value={text}
                  onChange={(e) => onEditInformes(items.map((v, j) => (j === idx ? e.target.value : v)))}
                  placeholder="Entregable"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 24,
                    fontFamily: "inherit",
                    color: t.fg,
                    background: "transparent",
                    border: `1px solid ${t.line}`,
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                />
                <button
                  type="button"
                  title="Quitar"
                  onClick={() => onEditInformes(items.filter((_, j) => j !== idx))}
                  style={{ ...actionStyle, padding: "4px 12px" }}
                >
                  ×
                </button>
              </>
            ) : (
              <p style={{ flex: 1, fontSize: 26, lineHeight: 1.3, color: t.fg, margin: 0 }}>{text}</p>
            )}
          </div>
        ))}
      </Tile>
      {onEditInformes && (
        <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
          <button type="button" onClick={() => onEditInformes([...items, ""])} style={actionStyle}>
            + Agregar entregable
          </button>
          <button type="button" onClick={() => onEditInformes(DEFAULT_INFORMES)} style={actionStyle}>
            Restaurar lista original
          </button>
        </div>
      )}
    </Slide1920>
  );
}

const CASOS_IMAGES: [string, string, string, string | null][] = [
  ["p40k.jpg", "Código QR de ingreso en un teléfono", "https://youtu.be/k2eV9_Y-QgQ", "Colombia 4.0"],
  ["asistente.jpg", "Integrante del equipo Ticketcode en un evento", "https://youtu.be/FymqpvMFvfs", "Ulibro 2023"],
  ["persona.jpg", "Fachada de un recinto de eventos", "https://youtu.be/uCZlG9ApDV0", "EXMA 2019"],
  ["arena.jpg", "Asistente sonriendo con su teléfono", "https://youtu.be/fs1jwiWRx5Q", "Festival Gabo 2024"],
  ["heroes.jpg", "Arte del evento Héroes Fest", "https://youtu.be/X_s7qhyN5QU", "Héroes Fest"],
  ["cartagena.jpg", "Calle colonial de Cartagena", "https://youtu.be/ZdLbw4JGVRc", "FICCI 63"],
];

function PlayIcon() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(14,26,23,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

const PREPRODUCCION_ITEMS = [
  "Reunión de onboarding: alcance, cronograma y responsables",
  "Configuración y parametrización de la plataforma para el evento",
  "Validación de componentes de la transmisión (agenda, status speakers, piezas de diseño)",
  "Visita o revisión preoperativa del plan logístico (flujo de ingreso, internet, energía)",
  "Capacitación al staff de logística antes del evento",
  "Prueba general antes de la puesta en marcha",
];

export function PreproduccionSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  const variants: TileVariant[] = ["ink", "mint", "gray", "deep", "gray", "ink"];
  return (
    <Slide1920 theme="light" section="Ejecución" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Preproducción
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Lo que preparamos antes del evento para que todo funcione desde el primer minuto.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {PREPRODUCCION_ITEMS.map((item, i) => {
          const c = tileColors(variants[i]);
          return (
            <Tile key={item} variant={variants[i]} badge={i === 0} style={{ gap: 14, padding: 32, height: 232 }}>
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 800, color: c.accent }}>{String(i + 1).padStart(2, "0")}</p>
              <p style={{ fontSize: 26, lineHeight: 1.3, color: c.fg }}>{item}</p>
            </Tile>
          );
        })}
      </div>
    </Slide1920>
  );
}

export function CasosSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  return (
    <Slide1920 theme="light" section="Confianza" page={page} total={total} contentStyle={{ gap: 40 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Casos de éxito
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {CASOS_IMAGES.map(([file, alt, url, eventName]) => (
          // Cada foto es un fotograma de un video de YouTube — queda como
          // link clickeable tanto en la vista previa como en el PDF
          // exportado (ver data-pdf-link, usado por renderSlidesToPdf).
          <a
            key={file}
            href={url}
            target="_blank"
            rel="noreferrer"
            data-pdf-link={url}
            style={{ display: "block", textDecoration: "none" }}
          >
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMG(file)}
                alt={alt}
                style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: 36, display: "block" }}
              />
              <PlayIcon />
              <p
                style={{
                  position: "absolute",
                  left: 20,
                  bottom: 20,
                  background: t.bg,
                  borderRadius: 999,
                  padding: "8px 28px",
                  fontSize: 24,
                  fontWeight: 600,
                  color: t.fg,
                  margin: 0,
                }}
              >
                {eventName ?? POR_DEFINIR}
              </p>
            </div>
          </a>
        ))}
      </div>
    </Slide1920>
  );
}
