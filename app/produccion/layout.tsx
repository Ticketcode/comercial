import Link from "next/link";
import { ComercialShell } from "@/app/components/comercial-shell";
import { ComercialTopNav } from "@/app/components/comercial-top-nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";

export default async function ProduccionSectionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  // Sin perfil no se puede saber el rol: puede ser una sesión vencida o un fallo momentáneo
  // de conexión. No es lo mismo que "no tienes acceso", así que se avisa distinto.
  if (!profile) {
    return (
      <ComercialShell>
        <ComercialTopNav />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
          <div className="rounded-card bg-surface p-6 text-sm text-ink">
            <p className="font-semibold">No pudimos verificar tu sesión.</p>
            <p className="mt-1 text-muted">
              Puede ser un fallo momentáneo de conexión o que tu sesión haya vencido. Recarga la
              página; si sigue igual, vuelve a iniciar sesión.
            </p>
            <div className="mt-4 flex gap-3">
              {/* <a> a propósito: fuerza una carga completa de la página */}
              <a
                href="/produccion"
                className="flex min-h-11 items-center rounded-pill bg-strong px-5 text-sm font-bold text-strong-ink"
              >
                Recargar
              </a>
              <Link
                href="/login"
                className="flex min-h-11 items-center rounded-pill bg-surface2 px-5 text-sm font-semibold text-ink"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </ComercialShell>
    );
  }

  if (!canAccessProduccion(profile)) {
    return (
      <ComercialShell>
        <ComercialTopNav />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
          <div className="rounded-card bg-warn p-6 text-sm text-warn-ink">
            No tienes acceso a Producción. Este apartado es solo para el equipo de
            producción/administración.
          </div>
        </div>
      </ComercialShell>
    );
  }

  return (
    <ComercialShell>
      <ComercialTopNav />
      {children}
    </ComercialShell>
  );
}
