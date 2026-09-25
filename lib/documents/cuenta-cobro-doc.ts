import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, ImageRun } from "docx";
import type { CuentaCobro } from "@/lib/types";
import { numeroALetras } from "@/lib/numero-a-letras";

const EMPRESA_NOMBRE = "DEYRA S.A.S";
const EMPRESA_NIT = "901.860.557-8";

function formatCOPNumber(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-CO")}`;
}

function line(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { after: 160 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
  });
}

function buildCuentaPage(cuenta: CuentaCobro, eventName: string, isFirst: boolean): Paragraph[] {
  const valorLetras = numeroALetras(cuenta.valor);
  const paragraphs: Paragraph[] = [];

  if (!isFirst) {
    paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  }

  paragraphs.push(
    line(`Ciudad: ${cuenta.ciudad_evento ?? ""}`),
    line(`Fecha: ${new Date().toLocaleDateString("es-CO")}`),
    line("CUENTA DE COBRO", { bold: true, align: AlignmentType.CENTER, size: 28 }),
    line(EMPRESA_NOMBRE, { bold: true, align: AlignmentType.CENTER }),
    line(`Nit: ${EMPRESA_NIT}`, { align: AlignmentType.CENTER }),
    line(""),
    line("DEBE A:", { bold: true }),
    line(cuenta.nombre_completo, { align: AlignmentType.CENTER }),
    line(""),
    line(`Identificado con C.C. ${cuenta.cedula} de ${cuenta.ciudad_expedicion_cedula ?? "____"}.`),
    line(""),
    line("LA SUMA DE:", { bold: true }),
    line(`${valorLetras} (${formatCOPNumber(cuenta.valor)}).`, { align: AlignmentType.CENTER }),
    line(""),
    line(`Lo anterior por concepto de ${cuenta.concepto} del evento ${eventName}${cuenta.ciudad_evento ? ` - ${cuenta.ciudad_evento}` : ""}.`),
    line(""),
    line("La suma mencionada por favor pagar por transferencia bancaria al portador."),
    line(""),
    line("Datos de la cuenta bancaria", { bold: true }),
    line(`Nombre del banco: ${cuenta.banco ?? "____"}`),
    line(`Tipo de cuenta: ${cuenta.tipo_cuenta ?? "____"}`),
    line(`Número de cuenta: ${cuenta.numero_cuenta ?? "____"}`),
    line(`Nombre del portador: ${cuenta.nombre_completo}`),
    line(`Número de cédula: ${cuenta.cedula}`),
    line("")
  );

  if (cuenta.firma_imagen) {
    const base64 = cuenta.firma_imagen.replace(/^data:image\/png;base64,/, "");
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: Buffer.from(base64, "base64"),
            transformation: { width: 220, height: 80 },
            type: "png",
          }),
        ],
      }),
      line(`Firmado por: ${cuenta.firma_nombre ?? cuenta.nombre_completo}`)
    );
  } else {
    paragraphs.push(line("Firma: ______________________________"));
  }

  paragraphs.push(line(`CC: ${cuenta.cedula}`));

  return paragraphs;
}

export async function buildCuentasCobroDocx(
  cuentas: CuentaCobro[],
  eventName: string
): Promise<Buffer> {
  const children = cuentas.flatMap((cuenta, i) => buildCuentaPage(cuenta, eventName, i === 0));

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
