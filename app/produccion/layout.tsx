import { TopNav } from "@/app/components/top-nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";

export default async function ProduccionSectionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  if (!canAccessProduccion(profile)) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-6xl px-6 py-10">
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
