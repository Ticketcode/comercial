"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEME_STORAGE_KEY, isThemeChoice, type ThemeChoice } from "@/lib/theme";

interface ThemeCtx {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script inline en app/layout.tsx ya aplicó data-theme antes del primer
  // pintado — acá solo se lee para que React sepa qué hay marcado (el valor
  // real se confirma en useEffect, que corre solo en el cliente).
  const [theme, setThemeState] = useState<ThemeChoice>("sistema");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (isThemeChoice(current)) setThemeState(current);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Almacenamiento no disponible (navegación privada, etc.) — el tema
      // sigue funcionando en esta sesión, solo no se recuerda la próxima vez.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider.");
  return ctx;
}
