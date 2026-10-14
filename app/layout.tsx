import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NumberInputFix } from "./components/number-input-fix";
import { NavigationProgress } from "./components/navigation-progress";
import { UiGuardProvider } from "./components/ui-guard";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-50 pb-20 text-neutral-900 lg:pb-0`}
      >
        <NumberInputFix />
        <NavigationProgress />
        <UiGuardProvider>{children}</UiGuardProvider>
      </body>
    </html>
  );
}
