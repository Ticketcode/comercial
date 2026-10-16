import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import { logout } from "@/app/login/actions";
import { TopNavLinks } from "./top-nav-links";

export async function TopNav() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  return (
    <div className="no-print border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-neutral-900">Ticketcode</span>
          <TopNavLinks showProduccion={canAccessProduccion(profile)} />
        </div>
        {profile && (
          <form action={logout} className="flex items-center gap-3">
            <Link href="/perfil" className="hidden text-xs text-neutral-500 hover:text-neutral-900 sm:inline">
              {profile.full_name || "Mi perfil"}
            </Link>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
            >
              Cerrar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
