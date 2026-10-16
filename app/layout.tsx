import type { Metadata } from "next";
import "./globals.css";
import { exo, poppins } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { NumberInputFix } from "./components/number-input-fix";
import { NavigationProgress } from "./components/navigation-progress";
import { UiGuardProvider } from "./components/ui-guard";
import { ThemeProvider } from "./components/theme-provider";

export const metadata: Metadata = {
  title: { default: "Ticketcode Comercial", template: "%s · Ticketcode" },
  description: "Herramienta interna para armar propuestas comerciales de Ticketcode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer pintado — evita el parpadeo
            de cargar siempre en claro y cambiar un instante después. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${exo.variable} ${poppins.variable} antialiased bg-neutral-50 pb-20 text-neutral-900 lg:pb-0`}
      >
        <NumberInputFix />
        <NavigationProgress />
        <ThemeProvider>
          <UiGuardProvider>{children}</UiGuardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
