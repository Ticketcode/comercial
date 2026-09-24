import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalCostItem } from "@/lib/types";
import { buildLogisticsRates } from "@/lib/pricing/logistics";
import { applyCommercialDiscount, computeTarifarioSummary } from "@/lib/pricing/summary";
import { getValidServiceCostItems } from "@/lib/data/service-items";
import { numeroALetras } from "@/lib/numero-a-letras";
import { fechaLarga, fechaFirmaLarga } from "@/lib/fecha-es";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: fields },
    { data: costItems },
    { data: rateRows },
    { data: honorariosProductorScale },
    { data: milestones },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_contract_fields").select("*").eq("proposal_id", id).maybeSingle(),
    supabase.from("proposal_cost_items").select("*").eq("proposal_id", id),
    supabase.from("logistics_rate_items").select("name, city, default_unit_cost"),
    supabase
      .from("price_scale_items")
      .select("tier_min, tier_max, unit_value")
      .eq("scale_group", "honorarios_productor")
      .order("sort_order"),
    supabase.from("proposal_payment_milestones").select("*").eq("proposal_id", id).order("sort_order"),
  ]);

  if (!proposal) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });
  }

  const logisticsRates = buildLogisticsRates(rateRows ?? []);

  const { items: validCostItems } = await getValidServiceCostItems(
    supabase,
    (costItems ?? []) as ProposalCostItem[]
  );
  const tarifarioSummary = computeTarifarioSummary(
    proposal as Proposal,
    logisticsRates,
    validCostItems,
    honorariosProductorScale ?? []
  );

  const globalPct = Number(proposal.acuerdo_comercial_pct_global ?? 0);
  const discount = applyCommercialDiscount(tarifarioSummary.valorPropuestaFinal, globalPct);
  const valorTotal = Math.round(discount.valorConDescuento + discount.ivaFinal);

  const formaPagoTexto = (milestones ?? [])
    .map((m) => `${Number(m.pct)}% — ${m.label}`)
    .join("\n");

  const f = fields ?? {};

  const data = {
    contrato_numero: f.contrato_numero || "____",
    contrato_fecha_texto: fechaLarga(f.contrato_fecha ?? null),
    contratante_representante_legal: f.contratante_representante_legal || "____",
    contratante_cedula: f.contratante_cedula || "____",
    contratante_cedula_ciudad: f.contratante_cedula_ciudad || "____",
    contratante_direccion_ciudad: f.contratante_direccion_ciudad || "____",
    contratante_empresa: f.contratante_nombre || "____",
    contratante_nit: f.contratante_nit || "____",
    contratante_ciudad: f.contratante_ciudad || "____",
    contratante_direccion: f.contratante_direccion || "____",
    evento_nombre: proposal.event_name,
    objeto_particular:
      f.objeto_particular ||
      "El alcance detallado del servicio corresponde a lo definido en la propuesta comercial aprobada (componentes básicos, servicios personalizados, logística 360 y acuerdo comercial).",
    tiempo_servicio_inicio_texto: fechaLarga(f.tiempo_servicio_inicio ?? null),
    tiempo_servicio_fin_texto: fechaLarga(f.tiempo_servicio_fin ?? null),
    plazo_inicio_texto: fechaLarga(f.plazo_inicio ?? null),
    plazo_fin_texto: fechaLarga(f.plazo_fin ?? null),
    valor_contrato_letras: numeroALetras(valorTotal),
    valor_contrato_numero: valorTotal.toLocaleString("es-CO"),
    forma_pago_texto: formaPagoTexto || "____",
    ciudad_firma: f.ciudad_firma || "Bogotá D.C.",
    fecha_firma_texto: fechaFirmaLarga(f.fecha_firma ?? null),
  };

  const templatePath = path.resolve(process.cwd(), "templates", "contrato-template.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  const buffer: Buffer = doc.getZip().generate({ type: "nodebuffer" });

  const filename = `Contrato - ${proposal.event_name}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="contrato.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
