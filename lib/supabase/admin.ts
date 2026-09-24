import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key — bypassa RLS. Server-only, nunca
 * importar desde un componente cliente. Se usa para el seed del catálogo
 * y otras tareas de administración.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
