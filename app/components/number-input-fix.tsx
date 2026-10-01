"use client";

import { useEffect } from "react";

/**
 * Ajuste global para los campos numéricos (Viáticos, Tarifario, Legalización,
 * Presupuesto...): al entrar a un campo se selecciona su contenido, así el "0"
 * se reemplaza al escribir, y si queda un cero a la izquierda ("03000") se quita.
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
      const cleaned = t.value.replace(/^(-?)0+(?=\d)/, "$1");
      if (cleaned !== t.value) t.value = cleaned;
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
