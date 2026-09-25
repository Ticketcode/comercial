import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCuentasCobroDocx } from "@/lib/documents/cuenta-cobro-doc";
import type { CuentaCobro } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: cuentas }] = await Promise.all([
    supabase.from("proposals").select("event_name").eq("id", id).single(),
    supabase.from("cuentas_cobro").select("*").eq("proposal_id", id).order("sort_order"),
  ]);

  if (!proposal || !cuentas || cuentas.length === 0) {
    return NextResponse.json({ error: "No hay cuentas de cobro para este evento." }, { status: 404 });
  }

  const buffer = await buildCuentasCobroDocx(cuentas as CuentaCobro[], proposal.event_name);

  const filename = `Cuentas de cobro - ${proposal.event_name}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="cuentas-cobro.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
