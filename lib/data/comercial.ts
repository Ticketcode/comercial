import type { FilaComercial, Proposal } from "@/lib/types";

export const COMERCIAL_REGISTRO_DEFAULT =
  "Correo de confirmación · Correo de recordación · Escarapela digital (descarga) · Impacto comercial a la base de datos";
export const COMERCIAL_ACREDITACION_DEFAULT =
  "Escarapela digital (acceso) · Manilla biodegradable · Base de datos de visitantes a cada stand de la zona expo";

/**
 * Filas de la tabla de comercialización. Si el asesor la editó fila por fila se usan esas; si no, la tabla original
 * (Registro y Acreditación), con sus textos e impactos guardados.
 */
export function filasComercial(p: Pick<Proposal, "presentacion_contacto" | "impactos_registro" | "impactos_acreditacion">): FilaComercial[] {
  const c = p.presentacion_contacto;
  if (c?.comercial_filas) return c.comercial_filas;
  return [
    { concepto: "Registro", elementos: c?.comercial_registro ?? COMERCIAL_REGISTRO_DEFAULT, impactos: p.impactos_registro ?? null },
    { concepto: "Acreditación y control de acceso", elementos: c?.comercial_acreditacion ?? COMERCIAL_ACREDITACION_DEFAULT, impactos: p.impactos_acreditacion ?? null },
  ];
}
