import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { logout } from "@/app/login/actions";
import { TopNavLinks } from "./top-nav-links";

export async function TopNav() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  return (
    <div className="no-print border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-neutral-900">Ticketcode</span>
          <TopNavLinks showProduccion={canAccessProduccion(profile)} />
        </div>
        {profile && (
          <form action={logout} className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">{profile.full_name ?? ""}</span>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Cerrar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
