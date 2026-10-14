"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra de progreso arriba de la pantalla: aparece apenas el usuario hace clic
 * en un enlace interno y desaparece cuando la nueva página ya cargó.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Next.js llama preventDefault() en los <Link>, por eso no se mira defaultPrevented.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (url.pathname.startsWith("/api/")) return;

      stopTimer();
      setActive(true);
      setWidth(12);
      timer.current = setInterval(() => {
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w));
      }, 200);
    }
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stopTimer();
    };
  }, []);

  // La ruta cambió: la página nueva ya está lista.
  useEffect(() => {
    stopTimer();
    setWidth(100);
    const t = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 250);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="no-print pointer-events-none fixed left-0 top-0 z-50 h-0.5 bg-neutral-900"
      style={{
        width: `${width}%`,
        opacity: active ? 1 : 0,
        transition: "width 200ms ease-out, opacity 200ms ease-out",
      }}
    />
  );
}
