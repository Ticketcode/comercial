// Convierte un número entero a su representación en letras en español,
// para el texto legal "El valor del contrato es por valor de ... pesos".
// Soporta hasta miles de millones, suficiente para valores de contrato.

const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE",
  "DIECIOCHO", "DIECINUEVE", "VEINTE",
];
const DECENAS = [
  "", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function tresDigitos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let out = c > 0 ? CENTENAS[c] : "";
  if (resto > 0) {
    if (out) out += " ";
    if (resto <= 20) {
      out += UNIDADES[resto];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d === 2) {
        out += u > 0 ? `${DECENAS[d]}${UNIDADES[u].toLowerCase() === "un" ? "UN" : UNIDADES[u]}` : "VEINTE";
      } else {
        out += DECENAS[d] + (u > 0 ? ` Y ${UNIDADES[u]}` : "");
      }
    }
  }
  return out.trim();
}

export function numeroALetras(valor: number): string {
  const n = Math.round(Math.abs(valor));
  if (n === 0) return "CERO PESOS";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "UN MILLÓN" : `${tresDigitosMiles(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "MIL" : `${tresDigitosMiles(miles)} MIL`);
  }
  if (resto > 0) {
    partes.push(tresDigitos(resto));
  }

  return `${partes.join(" ").trim()} PESOS M/CTE`;
}

function tresDigitosMiles(n: number): string {
  // Para el bloque de miles/millones, "un" antepuesto a miles no se dice
  // ("mil" no "un mil"), pero para millones antepuestos a cientos sí.
  return tresDigitos(n);
}
