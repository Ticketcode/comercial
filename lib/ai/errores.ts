/** Mensaje claro (sin datos sensibles) para un fallo al consultar a NOVA; el detalle completo queda en el log del servidor. */
export function mensajeErrorClaude(e: unknown): string {
  console.error("[claude] fallo al consultar", e);
  const status = (e as { status?: number })?.status;
  const detalle = (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? (e instanceof Error ? e.message : "");
  const corto = detalle ? ` (${detalle.slice(0, 160)})` : "";
  if (status === 401 || status === 403) return `La clave de Anthropic no es válida o no tiene permiso${corto}.`;
  if (status === 404) return `El modelo de NOVA no está disponible para esta clave${corto}.`;
  if (status === 429) return "Se alcanzó el límite de uso de Anthropic. Intenta en un minuto.";
  if (status === 400) return `Anthropic rechazó la solicitud${corto}.`;
  if (status && status >= 500) return "Anthropic no responde ahora mismo. Intenta de nuevo.";
  return `No se pudo consultar a NOVA${corto}.`;
}
