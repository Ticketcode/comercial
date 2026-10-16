import { Exo, Poppins } from "next/font/google";

// Tipografías del diseño aprobado (presentación comercial y módulo
// Comercial — ver docs/propuesta-deck y docs/diseno-comercial). Un solo
// punto de carga para que next/font no duplique la descarga de la fuente
// entre rutas que la usan. Exo para títulos, Poppins para el resto del
// texto.
export const exo = Exo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-exo",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});
