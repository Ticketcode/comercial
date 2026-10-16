import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // El gris 400 por defecto (#a3a3a3) no alcanza el contraste mínimo sobre blanco
        // para texto; este valor sí (4.7:1).
        neutral: { 400: "#737373" },
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Tokens del diseño del módulo Comercial (ver docs/diseno-comercial/spec.json)
        // — valores reales en globals.css, con tema claro/oscuro/sistema.
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        strong: "var(--strong)",
        "strong-ink": "var(--strong-ink)",
        highlight: "var(--highlight)",
        "highlight-ink": "var(--highlight-ink)",
        warn: "var(--warn-bg)",
        "warn-ink": "var(--warn-ink)",
        "input-bg": "var(--input-bg)",
        danger: "var(--danger)",
      },
      fontFamily: {
        display: ["var(--font-exo)", "Arial", "sans-serif"],
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        "inner-card": "16px",
        field: "12px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
