const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-07-02" -> "2 de julio de 2026" */
export function fechaLarga(isoDate: string | null): string {
  if (!isoDate) return "____";
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "2026-07-02" -> "2 días del mes de julio del año 2026" (formato de firma) */
export function fechaFirmaLarga(isoDate: string | null): string {
  if (!isoDate) return "____";
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} días del mes de ${MESES[m - 1]} del año ${y}`;
}
