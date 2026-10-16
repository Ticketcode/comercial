import { Children, Fragment, type ReactNode, type CSSProperties } from "react";
import type {
  Client,
  CatalogItem,
  Profile,
  Proposal,
  ProposalCatalogSelection,
  ProposalCommercialAgreement,
  ProposalOperationalRequirement,
  ProposalPaymentMilestone,
  ProposalScheduleItem,
} from "@/lib/types";
import type { TarifarioSummary } from "@/lib/pricing/summary";

export type SlideTheme = "dark" | "light" | "green";

export const THEME: Record<SlideTheme, { bg: string; fg: string; muted: string; card: string; line: string; accent: string; accent2: string }> = {
  dark: {
    bg: "#0E1A17",
    fg: "#EAF3F0",
    muted: "#9DB3AC",
    card: "#14251F",
    line: "#26403A",
    accent: "#3CD65C",
    accent2: "#B49BFF",
  },
  light: {
    bg: "#EEF6F3",
    fg: "#0E1A17",
    muted: "#4B5B57",
    card: "#FBFDFC",
    line: "#CFE2DC",
    accent: "#3CCB57",
    accent2: "#5B2FD1",
  },
  green: {
    bg: "#3CCB57",
    fg: "#0E1A17",
    muted: "#173524",
    card: "#0E1A17",
    line: "#2A8E43",
    accent: "#3CD65C",
    accent2: "#173524",
  },
};

export const DISPLAY_FONT = "var(--font-exo), Arial, sans-serif";
export const BODY_FONT = "var(--font-poppins), Arial, sans-serif";

/** Texto que llena el espacio de un dato que todavía no existe en la propuesta. */
export const POR_DEFINIR = "[Por definir]";

export function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return POR_DEFINIR;
  return String(v);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

/**
 * Reemplaza `gap` por separadores explícitos entre hijos directos — html2canvas
 * no siempre captura bien `gap` en flexbox al exportar a PDF, así que las
 * láminas usan esto en vez de la propiedad CSS `gap` (regla de maquetación
 * del diseño aprobado).
 */
export function Stack({
  direction = "column",
  gap,
  style,
  children,
}: {
  direction?: "row" | "column";
  gap: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  return (
    <div style={{ display: "flex", flexDirection: direction, ...style }}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 &&
            (direction === "row" ? (
              <div style={{ width: gap, flexShrink: 0 }} />
            ) : (
              <div style={{ height: gap, flexShrink: 0 }} />
            ))}
          {child}
        </Fragment>
      ))}
    </div>
  );
}

function Logo({ theme }: { theme: SlideTheme }) {
  if (theme === "green") {
    return (
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 44,
          width: 236,
          height: 62,
          background: "#0E1A17",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/propuesta-deck/logo_dark.png"
          alt="Ticketcode"
          style={{ width: 200, height: 42, objectFit: "contain" }}
        />
      </div>
    );
  }
  const src = theme === "dark" ? "/propuesta-deck/logo_dark.png" : "/propuesta-deck/logo_light.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Ticketcode"
      style={{ position: "absolute", left: 128, top: 56, width: 220, height: 47, objectFit: "contain" }}
    />
  );
}

/** Lienzo fijo 1920x1080 con el cromado común: logo, sección, pie de página. */
export function Slide1920({
  theme,
  section,
  page,
  total = 17,
  children,
  contentStyle,
}: {
  theme: SlideTheme;
  section: string;
  page: number;
  total?: number;
  children: ReactNode;
  contentStyle?: CSSProperties;
}) {
  const t = THEME[theme];
  const { gap: contentGap, flexDirection: contentDirection, ...restContentStyle } = contentStyle ?? {};
  return (
    <div
      data-pdf-slide
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        background: t.bg,
        color: t.fg,
        fontFamily: BODY_FONT,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Logo theme={theme} />
      <p
        style={{
          position: "absolute",
          right: 128,
          top: 64,
          width: 760,
          textAlign: "right",
          fontSize: 24,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: t.muted,
        }}
      >
        {section}
      </p>
      <div style={{ position: "absolute", inset: 0, padding: "128px 128px 160px" }}>
        <Stack
          direction={(contentDirection as "row" | "column") ?? "column"}
          gap={typeof contentGap === "number" ? contentGap : 0}
          style={{ height: "100%", justifyContent: "center", ...restContentStyle }}
        >
          {children}
        </Stack>
      </div>
      <p style={{ position: "absolute", left: 128, bottom: 64, width: 600, fontSize: 24, color: t.muted }}>
        www.ticketcode.co
      </p>
      <p
        style={{
          position: "absolute",
          right: 128,
          bottom: 64,
          width: 240,
          textAlign: "right",
          fontSize: 24,
          color: t.muted,
        }}
      >
        {String(page).padStart(2, "0")} / {total}
      </p>
    </div>
  );
}

/** Tarjeta tipo "ticket": borde perforado y dos muescas circulares del color del fondo de la lámina. */
export function TicketCard({
  width,
  height,
  cardBg,
  cardBorder,
  leftWidth,
  notchBg,
  accentBg,
  left,
  right,
}: {
  width: number;
  height: number;
  cardBg: string;
  cardBorder: string;
  leftWidth: number;
  notchBg: string;
  accentBg: string;
  left: ReactNode;
  right: ReactNode;
}) {
  const notchX = leftWidth - 22;
  return (
    <div style={{ position: "relative", width, height, padding: "24px 0" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: height - 48,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        <div style={{ width: leftWidth, padding: 44, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Stack direction="column" gap={12}>
            {left}
          </Stack>
        </div>
        <div style={{ borderLeft: `3px dashed ${cardBorder}` }} />
        <div
          style={{
            flex: 1,
            background: accentBg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack direction="column" gap={4} style={{ alignItems: "center" }}>
            {right}
          </Stack>
        </div>
      </div>
      <div
        style={{ position: "absolute", left: notchX, top: 0, width: 48, height: 48, borderRadius: "50%", background: notchBg }}
      />
      <div
        style={{
          position: "absolute",
          left: notchX,
          bottom: 0,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: notchBg,
        }}
      />
    </div>
  );
}

export function CheckBadge({ size = 36, iconSize = 22, bg }: { size?: number; iconSize?: number; bg: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#0E1A17" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export interface IncludedService {
  name: string;
  description: string | null;
}

export interface DeckData {
  proposal: Proposal;
  client: Client | null;
  owner: Profile | null;
  tarifarioSummary: TarifarioSummary;
  catalogItems: CatalogItem[];
  catalogSelections: ProposalCatalogSelection[];
  includedServices: IncludedService[];
  agreementItems: ProposalCommercialAgreement[];
  scheduleItems: ProposalScheduleItem[];
  paymentMilestones: ProposalPaymentMilestone[];
  operationalRequirements: ProposalOperationalRequirement[];
  propuestaFecha: string;
}
