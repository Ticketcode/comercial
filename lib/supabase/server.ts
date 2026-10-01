import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Con cache() todos los componentes de una misma petición comparten el mismo
// cliente, y así getCurrentProfile se consulta una sola vez por navegación
// (TopNav, layouts y página) en vez de repetirse.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll fue llamado desde un Server Component sin middleware activo.
            // Se puede ignorar si el middleware ya refresca la sesión en cada request.
          }
        },
      },
    }
  );
});
