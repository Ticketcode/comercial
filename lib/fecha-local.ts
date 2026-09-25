/**
 * Formatea una fecha "YYYY-MM-DD" (columna `date` de Postgres) sin pasar
 * por conversión de zona horaria — `new Date("2026-09-20").toLocaleDateString()`
 * la interpreta como medianoche UTC y en zonas con offset negativo la
 * muestra un día antes.
 */
export function formatFechaCorta(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
