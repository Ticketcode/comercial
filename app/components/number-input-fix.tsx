"use client";

import { useEffect } from "react";

/**
 * Ajuste global para los campos numéricos (Viáticos, Tarifario, Legalización,
 * Presupuesto...): al entrar a un campo se selecciona su contenido, así el "0"
 * se reemplaza al escribir, y si queda un cero a la izquierda ("03000") se quita.
 * Además no admite negativos y respeta el atributo max.
 */
export function NumberInputFix() {
  useEffect(() => {
    function isNumberInput(t: EventTarget | null): t is HTMLInputElement {
      return t instanceof HTMLInputElement && t.type === "number";
    }

    function onFocusIn(e: FocusEvent) {
      if (isNumberInput(e.target) && !e.target.readOnly) e.target.select();
    }

    // Evita que el clic que da el foco deseleccione el contenido.
    function onMouseUp(e: MouseEvent) {
      const t = e.target;
      if (isNumberInput(t) && t.dataset.justFocused === "1") {
        e.preventDefault();
        delete t.dataset.justFocused;
      }
    }

    function onMouseDown(e: MouseEvent) {
      const t = e.target;
      if (isNumberInput(t) && document.activeElement !== t) t.dataset.justFocused = "1";
    }

    function onInput(e: Event) {
      const t = e.target;
      if (!isNumberInput(t)) return;
      let cleaned = t.value.replace(/^(-?)0+(?=\d)/, "$1");
      // Ningún campo numérico de la app admite negativos.
      if (!t.hasAttribute("data-allow-negative")) cleaned = cleaned.replace(/^-/, "");
      // Respeta el atributo max (por ejemplo, porcentajes hasta 100).
      const max = t.max !== "" ? Number(t.max) : NaN;
      if (cleaned !== "" && Number.isFinite(max) && Number(cleaned) > max) cleaned = String(max);
      if (cleaned !== t.value) {
        // Setter nativo: así React (campos controlados) sí detecta el cambio y dispara onChange.
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (setter) setter.call(t, cleaned);
        else t.value = cleaned;
      }
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  return null;
}
