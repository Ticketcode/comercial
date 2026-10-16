export type ThemeChoice = "claro" | "oscuro" | "sistema";

export const THEME_STORAGE_KEY = "tc-theme";
export const THEME_VALUES: ThemeChoice[] = ["claro", "oscuro", "sistema"];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_VALUES as string[]).includes(value);
}

/**
 * Script que corre antes del primer render (ver app/layout.tsx) para aplicar
 * el tema guardado sin parpadeo: lee localStorage y pone data-theme en
 * <html> antes de que el navegador pinte nada.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t||${JSON.stringify(THEME_VALUES)}.indexOf(t)===-1)t='sistema';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
