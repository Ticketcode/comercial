// Plantilla base de Presupuesto — transcrita de la hoja real de Excel
// ("Medellín" del libro "Presupuesto Colombia 5.0.xlsx"). Son las 5
// categorías e ítems típicos; se pueden agregar o quitar líneas libremente
// por evento, ya que el presupuesto real varía bastante de un evento a otro.

export const PRESUPUESTO_CATEGORIAS = [
  "Proveedores",
  "Honorarios",
  "Alimentación y Hotel",
  "Transporte",
  "Varios",
] as const;

export const PRESUPUESTO_TEMPLATE: Record<string, string[]> = {
  Proveedores: [
    "Servicio producción manillas y parte técnica",
    "Infraestructura Tecnológica + seguridad",
    "Computadores",
    "Escarapelas",
    "Impresora",
  ],
  Honorarios: [
    "Honorarios Productor",
    "Comisión del Comercial (Cierre del negocio)",
    "Honorarios personal Staff (acompañamiento evento)",
    "Honorarios Auxiliares de logística para pre-acreditación",
    "Honorarios auxiliares logística para el evento",
  ],
  "Alimentación y Hotel": [
    "Almuerzos logística para visita pre-operativa (incluido supervisores)",
    "Refrigerios logística para visita pre-operativa (incluido supervisores)",
    "Almuerzos para logística durante evento (incluido supervisores)",
    "Refrigerios para logística durante evento (incluido supervisores)",
    "Hotel supervisores",
    "Desayunos (Staff principal)",
    "Almuerzo (Staff Principal)",
    "Cenas (Staff principal)",
  ],
  Transporte: [
    "Transportes ciudad Origen",
    "Transportes Ciudad de destino",
    "Transporte equipos",
    "Tiquetes Terrestres",
    "Tiquetes Aéreos",
  ],
  Varios: [
    "Recarga de Datos para Smartphones",
    "Camisetas para Staff (supervisores, acompañantes)",
    "Lavado de chalecos",
    "Compra de Agua",
    "Compra de bloqueador Solar",
    "Actividad de cierre (cena, almuerzo)",
    "Capacitaciones (manejo plataforma, operación logística, manejo entrega manillas, guianza)",
  ],
};
