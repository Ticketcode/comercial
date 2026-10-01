/**
 * Convierte los errores técnicos de Supabase/Postgres/red en mensajes que el usuario
 * entienda y pueda accionar. Si no reconoce el error, lo muestra tal cual al final.
 */
export function friendlyError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "");
  const m = msg.toLowerCase();

  if (!msg) return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  if (m.includes("no autorizado") || m.includes("row-level security") || m.includes("permission denied"))
    return "No tienes permiso para hacer esto. Si crees que es un error, pide acceso al administrador.";
  if (m.includes("jwt") || m.includes("session") || m.includes("not authenticated"))
    return "Tu sesión expiró. Vuelve a iniciar sesión y repite la acción (copia antes lo que escribiste).";
  if (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("networkerror") ||
    m.includes("network error") ||
    m.includes("load failed") ||
    m.includes("timeout")
  )
    return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo; tus cambios siguen en pantalla.";
  if (m.includes("duplicate key") || m.includes("already exists"))
    return "Ya existe un registro con esos mismos datos.";
  if (m.includes("foreign key"))
    return "Este registro está relacionado con otros datos y no se puede modificar o borrar así.";
  if (m.includes("violates not-null") || m.includes("null value in column"))
    return "Falta un dato obligatorio. Completa los campos vacíos e inténtalo de nuevo.";
  if (m.includes("invalid input syntax") || m.includes("out of range") || m.includes("numeric field overflow"))
    return "Hay un valor con formato inválido o demasiado grande. Revísalo e inténtalo de nuevo.";
  if (m.includes("server components render") || m.includes("unexpected response"))
    return "El servidor no respondió como se esperaba. Recarga la página e inténtalo de nuevo.";

  return msg;
}

/** Texto para mostrar junto al botón Guardar (SaveStatus lo pinta en rojo por el prefijo). */
export function saveErrorMessage(raw: unknown): string {
  return `Error: ${friendlyError(raw)}`;
}

/**
 * Ejecuta una acción de servidor sin dejar escapar excepciones (red caída, sesión vencida,
 * etc.): las convierte en `{ error }` para mostrarlas junto al botón en vez de romper la
 * pantalla y perder lo que el usuario escribió.
 */
export async function callSafe<T extends { error: string | null }>(
  fn: () => Promise<T>
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

/** Mensaje de validación previo a guardar (se pinta en rojo por el prefijo "Error"). */
export function problemsMessage(problems: string[]): string {
  const shown = problems.slice(0, 4).join(" · ");
  const rest = problems.length > 4 ? ` · …y ${problems.length - 4} más` : "";
  return `Error: no se guardó. Revisa — ${shown}${rest}`;
}
