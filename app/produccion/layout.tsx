import Link from "next/link";
import { TopNav } from "@/app/components/top-nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";

export default async function ProduccionSectionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  // Sin perfil no se puede saber el rol: puede ser una sesión vencida o un fallo momentáneo
  // de conexión. No es lo mismo que "no tienes acceso", así que se avisa distinto.
  if (!profile) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
            <p className="font-medium text-neutral-900">No pudimos verificar tu sesión.</p>
            <p className="mt-1">
              Puede ser un fallo momentáneo de conexión o que tu sesión haya vencido. Recarga la
              página; si sigue igual, vuelve a iniciar sesión.
            </p>
            <div className="mt-4 flex gap-3">
              {/* <a> a propósito: fuerza una carga completa de la página */}
              <a
                href="/produccion"
                className="btn btn-primary"
              >
                Recargar
              </a>
              <Link
                href="/login"
                className="btn btn-secondary"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!canAccessProduccion(profile)) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            No tienes acceso a Producción. Este apartado es solo para el equipo de
            producción/administración.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
