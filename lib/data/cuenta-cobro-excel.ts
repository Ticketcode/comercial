import * as xlsx from "xlsx";

export interface ParsedCuentaCobroRow {
  nombre_completo: string;
  cedula: string;
  ciudad_expedicion_cedula: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  concepto: string;
  valor: number;
  ciudad_evento: string | null;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Encuentra el índice de columna cuyo encabezado matchea mejor las palabras clave. */
function findColumn(headers: string[], mustInclude: string[], mustExclude: string[] = []): number {
  return headers.findIndex((h) => {
    const n = normalizar(h);
    return mustInclude.every((k) => n.includes(k)) && !mustExclude.some((k) => n.includes(k));
  });
}

export function parseCuentasCobroExcel(buffer: ArrayBuffer): {
  rows: ParsedCuentaCobroRow[];
  errors: string[];
} {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];

  if (raw.length < 2) {
    return { rows: [], errors: ["El archivo no tiene filas de datos."] };
  }

  const headers = raw[0].map((h) => String(h ?? ""));
  const ciudadExpedicionIdx = findColumn(headers, ["ciudad", "exped"]);
  const ciudadEventoIdx =
    findColumn(headers, ["ciudad", "evento"]) >= 0
      ? findColumn(headers, ["ciudad", "evento"])
      : findColumn(headers, ["ciudad"], ["exped"]);
  const col = {
    nombre: findColumn(headers, ["nombre"], ["banco", "cuenta", "portador"]),
    cedula: findColumn(headers, ["cedula"], ["ciudad"]),
    ciudadExpedicion: ciudadExpedicionIdx,
    banco: findColumn(headers, ["banco"]),
    tipoCuenta: findColumn(headers, ["tipo", "cuenta"]),
    numeroCuenta: findColumn(headers, ["numero", "cuenta"], ["tipo"]),
    concepto: findColumn(headers, ["concepto"]),
    valor: findColumn(headers, ["valor"]),
    ciudadEvento: ciudadEventoIdx,
  };

  const errors: string[] = [];
  if (col.nombre === -1) errors.push('No se encontró una columna de "Nombre".');
  if (col.cedula === -1) errors.push('No se encontró una columna de "Cédula".');
  if (col.valor === -1) errors.push('No se encontró una columna de "Valor".');
  if (col.concepto === -1) errors.push('No se encontró una columna de "Concepto".');
  if (errors.length > 0) return { rows: [], errors };

  const rows: ParsedCuentaCobroRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every((c) => c === null || c === "")) continue;
    const nombre = row[col.nombre];
    const cedula = row[col.cedula];
    if (!nombre || !cedula) continue;

    rows.push({
      nombre_completo: String(nombre).trim(),
      cedula: String(cedula).trim(),
      ciudad_expedicion_cedula: col.ciudadExpedicion >= 0 && row[col.ciudadExpedicion] ? String(row[col.ciudadExpedicion]).trim() : null,
      banco: col.banco >= 0 && row[col.banco] ? String(row[col.banco]).trim() : null,
      tipo_cuenta: col.tipoCuenta >= 0 && row[col.tipoCuenta] ? String(row[col.tipoCuenta]).trim() : null,
      numero_cuenta: col.numeroCuenta >= 0 && row[col.numeroCuenta] ? String(row[col.numeroCuenta]).trim() : null,
      concepto: col.concepto >= 0 && row[col.concepto] ? String(row[col.concepto]).trim() : "",
      valor: col.valor >= 0 && typeof row[col.valor] === "number" ? (row[col.valor] as number) : Number(row[col.valor]) || 0,
      ciudad_evento: col.ciudadEvento >= 0 && row[col.ciudadEvento] ? String(row[col.ciudadEvento]).trim() : null,
    });
  }

  if (rows.length === 0) errors.push("No se encontraron filas válidas (con nombre y cédula).");

  return { rows, errors };
}
