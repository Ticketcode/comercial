import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { PerfilForm } from "./perfil-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link href="/proposals" className="text-sm text-neutral-500 hover:underline">
        ← Volver
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-neutral-900">Mi perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Estos datos se usan como datos de contacto del asesor comercial en la Presentación de
        propuestas.
      </p>
      <PerfilForm profile={profile} />
    </div>
  );
}
export const metadata = { title: "Mi perfil" };
