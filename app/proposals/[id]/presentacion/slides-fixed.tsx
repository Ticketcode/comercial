import { DISPLAY_FONT, Slide1920, THEME } from "./deck-shell";

const IMG = (name: string) => `/propuesta-deck/${name}`;

function FeatureCard({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  const t = THEME.light;
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 24,
        padding: 36,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        flex: 1,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: t.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
        {title}
      </h3>
    </div>
  );
}

function Icon({ path, size = 36 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0E1A17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

export function PlataformaSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG("p40k.jpg")}
          alt="Teléfono mostrando un código QR de ingreso, más de 40.000 personas"
          style={{ width: 640, height: 360, objectFit: "cover", borderRadius: 28 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
        <FeatureCard icon={<Icon path={<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />} />} title="Boletería electrónica" />
        <FeatureCard
          icon={
            <Icon
              path={
                <>
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <path d="M17 11a4 4 0 0 0 0-8" />
                  <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                </>
              }
            />
          }
          title="Logística 360"
        />
        <FeatureCard
          icon={
            <Icon
              path={
                <>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </>
              }
            />
          }
          title="Protocolos de seguridad"
        />
        <FeatureCard
          icon={
            <Icon
              path={
                <>
                  <path d="M3 3v18h18" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </>
              }
            />
          }
          title="DATA real"
        />
      </div>
    </Slide1920>
  );
}

export function CifrasSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.green;
  const stats: [string, string][] = [
    ["12", "años en la industria"],
    ["+5.000", "eventos"],
    ["+1.000.000", "asistentes"],
    ["Global", "plataforma"],
  ];
  return (
    <Slide1920 theme="green" section="Quiénes somos" page={page} total={total}>
      <div style={{ display: "flex", flexDirection: "row", gap: 96, alignItems: "center", flex: 1 }}>
        <div style={{ width: 600, display: "flex", flexDirection: "column", gap: 28 }}>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
            Nuestra experiencia en la industria no se improvisa
          </h2>
          <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
            Mantenerse por más de una década en una industria tan competitiva es muestra de que lo estamos
            haciendo bien.
          </p>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {stats.map(([n, label], i) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                padding: "20px 0",
                borderBottom: i < stats.length - 1 ? `2px solid ${t.line}` : undefined,
              }}
            >
              <p style={{ fontFamily: DISPLAY_FONT, fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: t.fg }}>
                {n}
              </p>
              <p style={{ fontSize: 28, fontWeight: 600, color: t.fg, width: 300, textAlign: "right" }}>{label}</p>
            </div>
          ))}
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
  return (
    <Slide1920 theme="light" section="Quiénes somos" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Todo lo que un organizador necesita
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        Los eventos son la capacidad de administrar con éxito la mayor cantidad de detalles.
      </p>
      <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
        {ORGANIZADOR_ITEMS.map((item) => (
          <div
            key={item.n}
            style={{
              background: t.card,
              border: `1px solid ${t.line}`,
              borderRadius: 24,
              padding: 36,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              flex: 1,
            }}
          >
            <p style={{ fontSize: 24, letterSpacing: 2, color: t.accent2 }}>{item.n}</p>
            <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.fg }}>
              {item.title}
            </h3>
            <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>{item.body}</p>
          </div>
        ))}
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

function InformeCard({ title, items }: { title: string; items: string[] }) {
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
        gap: 20,
        flex: 1,
      }}
    >
      <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: t.accent2 }}>
        {title}
      </h3>
      <ul style={{ fontSize: 26, lineHeight: 1.35, color: t.fg, paddingLeft: 26, margin: 0 }}>
        {items.map((i) => (
          <li key={i} style={{ marginBottom: 12 }}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InformesSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  return (
    <Slide1920 theme="light" section="La propuesta" page={page} total={total} contentStyle={{ gap: 32 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Informes y entregables
      </h2>
      <p style={{ fontSize: 28, lineHeight: 1.4, color: t.muted }}>
        DATA real y segmentada para indicadores, estadísticas, proyecciones y crecimiento del evento.
      </p>
      <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
        <InformeCard title="Informe general" items={INFORME_GENERAL} />
        <InformeCard title="Seguimiento y satisfacción" items={INFORME_SEGUIMIENTO} />
      </div>
    </Slide1920>
  );
}

const CASOS_IMAGES: [string, string, string][] = [
  ["p40k.jpg", "Código QR de ingreso en un teléfono", "https://youtu.be/k2eV9_Y-QgQ"],
  ["asistente.jpg", "Integrante del equipo Ticketcode en un evento", "https://youtu.be/FymqpvMFvfs"],
  ["persona.jpg", "Fachada de un recinto de eventos", "https://youtu.be/uCZlG9ApDV0"],
  ["arena.jpg", "Asistente sonriendo con su teléfono", "https://youtu.be/fs1jwiWRx5Q"],
  ["heroes.jpg", "Arte del evento Héroes Fest", "https://youtu.be/X_s7qhyN5QU"],
  ["cartagena.jpg", "Calle colonial de Cartagena", "https://youtu.be/ZdLbw4JGVRc"],
];

export function CasosSlide({ page, total }: { page: number; total: number }) {
  const t = THEME.light;
  return (
    <Slide1920 theme="light" section="Confianza" page={page} total={total} contentStyle={{ gap: 40 }}>
      <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: t.fg }}>
        Casos de éxito
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {CASOS_IMAGES.map(([file, alt, url]) => (
          // Cada foto es un fotograma de un video de YouTube — queda como
          // link clickeable tanto en la vista previa como en el PDF
          // exportado (ver data-pdf-link, usado por renderSlidesToPdf).
          <a key={file} href={url} target="_blank" rel="noreferrer" data-pdf-link={url} style={{ display: "block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG(file)}
              alt={alt}
              style={{ width: "100%", height: 303, objectFit: "cover", borderRadius: 24, display: "block" }}
            />
          </a>
        ))}
      </div>
    </Slide1920>
  );
}
