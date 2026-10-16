import { ThemeToggle } from "@/app/components/theme-toggle";

export const dynamic = "force-static";

const TOKENS: { name: string; cls: string; label: string }[] = [
  { name: "--bg", cls: "bg-bg", label: "bg" },
  { name: "--surface", cls: "bg-surface", label: "surface" },
  { name: "--surface2", cls: "bg-surface2", label: "surface2" },
  { name: "--accent", cls: "bg-accent", label: "accent" },
  { name: "--strong", cls: "bg-strong", label: "strong" },
  { name: "--highlight", cls: "bg-highlight", label: "highlight" },
  { name: "--warn-bg", cls: "bg-warn", label: "warn" },
  { name: "--danger", cls: "bg-danger", label: "danger" },
];

/**
 * Página interna, sin enlazar desde ningún menú — solo para verificar la
 * Fase 1 (tokens, tema claro/oscuro/sistema, tipografías) antes de aplicar
 * el diseño a pantallas reales. No hace parte del diseño final.
 */
export default function TokensPreviewPage() {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Fase 1 — tokens y tema
          </h1>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-sm text-muted">
          Página interna de verificación, no enlazada desde el menú. Revisar a 390/768/1280px en
          los tres temas.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Tipografías</h2>
          <div className="mt-4 space-y-3 rounded-card bg-surface p-6">
            <p className="font-display text-3xl font-extrabold tracking-tight">
              Exo 800 — Título de pantalla
            </p>
            <p className="font-display text-xl font-bold">Exo 700 — Subtítulo</p>
            <p className="text-base">
              Poppins 400 — Texto de cuerpo normal, el que se usa en párrafos y descripciones
              largas de la app.
            </p>
            <p className="text-base font-semibold">Poppins 600 — Texto con énfasis</p>
            <p className="text-base tabular-nums">Poppins — Números tabulares: $ 12.693.536</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Colores</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TOKENS.map((t) => (
              <div key={t.name} className="overflow-hidden rounded-card border border-border">
                <div className={`h-20 ${t.cls}`} />
                <div className="bg-surface p-3">
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Componentes de ejemplo</h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 rounded-card bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tarjeta</p>
              <h3 className="font-display mt-1 text-lg font-bold">Perfil del evento</h3>
              <div className="mt-4 rounded-inner-card bg-surface2 p-4">
                <p className="text-xs font-semibold text-muted">Subgrupo (surface2)</p>
                <p className="mt-1 text-sm">Contenido dentro de un subgrupo.</p>
              </div>
              <label className="mt-4 flex flex-col gap-1.5 text-xs font-semibold text-muted">
                Campo de ejemplo
                <input
                  type="text"
                  placeholder="Escribe algo..."
                  className="min-h-11 rounded-field border border-border bg-input-bg px-3 text-sm font-medium text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="min-h-11 rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink">
                  Botón principal
                </button>
                <button className="min-h-11 rounded-pill bg-surface2 px-5 text-sm font-semibold text-ink">
                  Secundario
                </button>
                <button className="min-h-11 rounded-pill border-[1.5px] border-accent px-5 text-sm font-bold text-accent">
                  Acento
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="rounded-pill bg-warn px-3.5 py-2 text-xs font-bold text-warn-ink">
                  Suma de pesos: 60% (debe ser 100%)
                </span>
              </div>
            </div>
            <div className="w-full flex-1 rounded-card bg-surface p-6 sm:max-w-xs">
              <h3 className="font-display text-lg font-bold">Resumen</h3>
              <div className="mt-4 rounded-inner-card bg-highlight p-4">
                <p className="text-xs font-bold text-highlight-ink">Valor Propuesta Final</p>
                <p className="font-display mt-0.5 text-2xl font-extrabold text-highlight-ink">
                  $ 12.693.536
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span>Estado con punto de color (danger)</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
