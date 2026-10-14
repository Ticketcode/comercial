"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** 1500000 -> "1.500.000"; 3.5 -> "3,5". Formato es-CO. */
function format(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

/** "1.500.000,5" -> 1500000.5 ; "" -> null */
function parse(text: string): number | null {
  if (text === "") return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Si es true, un campo vacío entrega null; si no, entrega 0. */
  nullable?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

/**
 * Campo de dinero (pesos) con separador de miles mientras se escribe: 1500000 se ve
 * como 1.500.000. Acepta coma como decimal y no admite negativos ni letras.
 */
export function MoneyInput({ value, onChange, nullable = false, className, disabled, id, ...rest }: Props) {
  const [text, setText] = useState(() => format(value));
  const ref = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const justFocused = useRef(false);

  // Si el valor cambia desde fuera (por ejemplo, al elegir un rubro con tarifa fija), se refleja.
  useEffect(() => {
    const current = parse(text);
    const incoming = value ?? null;
    if (current !== incoming && !(current === null && incoming === 0 && !nullable)) {
      setText(format(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && ref.current) {
      ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [text]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    // Cuántos dígitos/coma había antes del cursor: se usa para recolocarlo tras formatear.
    const keepBefore = raw.slice(0, caret).replace(/[^0-9,]/g, "").length;

    const cleaned = raw.replace(/[^0-9,]/g, "");
    const [intRaw, ...decParts] = cleaned.split(",");
    const intPart = intRaw.replace(/^0+(?=\d)/, "");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const hasComma = cleaned.includes(",");
    const dec = hasComma ? "," + decParts.join("").slice(0, 2) : "";
    const next = grouped + dec;

    let seen = 0;
    let pos = 0;
    while (pos < next.length && seen < keepBefore) {
      if (/[0-9,]/.test(next[pos])) seen += 1;
      pos += 1;
    }
    pendingCaret.current = pos;

    setText(next);
    const parsed = parse(next);
    onChange(parsed === null ? (nullable ? null : 0) : parsed);
  }

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      value={text}
      onChange={handleChange}
      onMouseDown={(e) => {
        justFocused.current = document.activeElement !== e.currentTarget;
      }}
      onMouseUp={(e) => {
        // Evita que el clic que da el foco deseleccione el contenido.
        if (justFocused.current) e.preventDefault();
        justFocused.current = false;
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => setText(format(value))}
      className={className}
      {...rest}
    />
  );
}
