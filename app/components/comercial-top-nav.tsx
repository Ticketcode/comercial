import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { logout } from "@/app/login/actions";
import { ComercialTopNavLinks } from "./comercial-top-nav-links";
import { ThemeToggle } from "./theme-toggle";

/** Barra superior del diseño aprobado del módulo Comercial — píldora blanca
    con logo y pestañas, selector de tema y cerrar sesión. Solo se usa en
    las secciones de Comercial (Propuestas, Catálogo); Producción sigue con
    TopNav (app/components/top-nav.tsx), que no tiene diseño todavía. */
export async function ComercialTopNav() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  return (
    <div className="no-print">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2 rounded-pill bg-surface p-1.5">
          <span className="font-display px-3.5 text-base font-extrabold tracking-tight">Ticketcode</span>
          <ComercialTopNavLinks showProduccion={canAccessProduccion(profile)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          {profile && (
            <form action={logout} className="flex items-center gap-3">
              <Link href="/perfil" className="hidden text-xs text-muted hover:text-ink sm:inline">
                {profile.full_name || "Mi perfil"}
              </Link>
              <button
                type="submit"
                className="min-h-11 rounded-pill border border-border bg-transparent px-4 text-xs font-semibold text-muted hover:bg-surface"
              >
                Cerrar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
