import { exo, poppins } from "@/lib/fonts";

/**
 * Envuelve las secciones de la app con los tokens de color con tema y las
 * tipografías Exo/Poppins del diseño aprobado (ver docs/diseno-comercial).
 */
export function ComercialShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${exo.variable} ${poppins.variable} min-h-screen bg-bg font-sans text-ink`}>{children}</div>
  );
}
