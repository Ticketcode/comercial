"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canAccessProduccion } from "@/lib/data/profile";
import type { ViaticoEstado } from "@/lib/types";

export interface SaveStaffRow {
  id: string;
  full_name: string;
  cargo: string | null;
  cedula: string | null;
  telefono: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  sort_order: number;
}

export interface SaveGiroRow {
  id: string;
  staff_id: string;
  rubro: string | null;
  concepto: string | null;
  cantidad: number;
  valor_unitario: number;
  monto: number;
  estado: ViaticoEstado;
  fecha_giro: string | null;
  notas: string | null;
  sort_order: number;
}

export interface SaveProduccionPayload {
  proposalId: string;
  staff: { existing: SaveStaffRow[]; new: SaveStaffRow[]; deletedIds: string[] };
  giros: { existing: SaveGiroRow[]; new: SaveGiroRow[]; deletedIds: string[] };
}

export async function saveProduccion(payload: SaveProduccionPayload) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!canAccessProduccion(profile)) {
    return { error: "No autorizado." };
  }

  if (payload.staff.deletedIds.length > 0) {
    const { error } = await supabase.from("event_staff").delete().in("id", payload.staff.deletedIds);
    if (error) return { error: error.message };
  }
  if (payload.giros.deletedIds.length > 0) {
    const { error } = await supabase.from("viatico_giros").delete().in("id", payload.giros.deletedIds);
    if (error) return { error: error.message };
  }

  const staffResults = await Promise.all(
    payload.staff.existing.map((s) =>
      supabase
        .from("event_staff")
        .update({
          full_name: s.full_name,
          cargo: s.cargo,
          cedula: s.cedula,
          telefono: s.telefono,
          banco: s.banco,
          tipo_cuenta: s.tipo_cuenta,
          numero_cuenta: s.numero_cuenta,
          sort_order: s.sort_order,
        })
        .eq("id", s.id)
    )
  );
  const staffFailed = staffResults.find((r) => r.error);
  if (staffFailed?.error) return { error: staffFailed.error.message };

  // El personal nuevo se inserta primero para resolver los staff_id
  // "temporales" del cliente a ids reales antes de insertar los giros que
  // los referencian.
  const tempIdToRealId = new Map<string, string>();
  if (payload.staff.new.length > 0) {
    const { data, error } = await supabase
      .from("event_staff")
      .insert(
        payload.staff.new.map((s) => ({
          proposal_id: payload.proposalId,
          full_name: s.full_name,
          cargo: s.cargo,
          cedula: s.cedula,
          telefono: s.telefono,
          banco: s.banco,
          tipo_cuenta: s.tipo_cuenta,
          numero_cuenta: s.numero_cuenta,
          sort_order: s.sort_order,
        }))
      )
      .select("id");
    if (error) return { error: error.message };
    data?.forEach((row, i) => tempIdToRealId.set(payload.staff.new[i].id, row.id));
  }

  function resolveStaffId(staffId: string) {
    return tempIdToRealId.get(staffId) ?? staffId;
  }

  const giroResults = await Promise.all(
    payload.giros.existing.map((g) =>
      supabase
        .from("viatico_giros")
        .update({
          staff_id: resolveStaffId(g.staff_id),
          rubro: g.rubro,
          concepto: g.concepto,
          cantidad: g.cantidad,
          valor_unitario: g.valor_unitario,
          monto: g.monto,
          estado: g.estado,
          fecha_giro: g.fecha_giro || null,
          notas: g.notas,
          sort_order: g.sort_order,
        })
        .eq("id", g.id)
    )
  );
  const giroFailed = giroResults.find((r) => r.error);
  if (giroFailed?.error) return { error: giroFailed.error.message };

  if (payload.giros.new.length > 0) {
    const { error } = await supabase.from("viatico_giros").insert(
      payload.giros.new.map((g) => ({
        proposal_id: payload.proposalId,
        staff_id: resolveStaffId(g.staff_id),
        rubro: g.rubro,
        concepto: g.concepto,
        cantidad: g.cantidad,
        valor_unitario: g.valor_unitario,
        monto: g.monto,
        estado: g.estado,
        fecha_giro: g.fecha_giro || null,
        notas: g.notas,
        sort_order: g.sort_order,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/produccion/${payload.proposalId}/viaticos`);
  return { error: null };
}
