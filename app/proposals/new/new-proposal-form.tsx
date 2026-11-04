"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { BorradorEvento } from "@/lib/ai/extraccion";
import { createProposal, type NewProposalState } from "./actions";
import { extraerDeNotas } from "./extraer-actions";

const initialState: NewProposalState = { error: null };

const inputClass =
  "h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
const labelClass = "text-sm font-medium text-neutral-700";

const CAMPOS_INICIALES = {
  client_name: "",
  client_company: "",
  client_cargo: "",
  event_name: "",
  lugar: "",
  modality: "presencial",
  city: "",
  dias: "1",
  aforo: "",
  aforo_virtual: "",
  event_start_date: "",
  event_end_date: "",
};
type Campo = keyof typeof CAMPOS_INICIALES;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Creando..." : "Crear propuesta y continuar al Diagnóstico"}
    </button>
  );
}

export function NewProposalForm() {
  const [state, formAction] = useFormState(createProposal, initialState);
  const [valores, setValores] = useState(CAMPOS_INICIALES);
  // Campos que llenó NOVA y el asesor aún no ha tocado.
  const [porClaude, setPorClaude] = useState<Set<Campo>>(new Set());
  const [notas, setNotas] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pensando, startPensar] = useTransition();

  function cambiar(campo: Campo, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (porClaude.has(campo)) {
      const sig = new Set(porClaude);
      sig.delete(campo);
      setPorClaude(sig);
    }
  }

  function completarConClaude() {
    setMensaje(null);
    startPensar(async () => {
      const r = await extraerDeNotas(notas);
      if (r.error) {
        setMensaje({ tipo: "error", texto: r.error });
        return;
      }
      const b: BorradorEvento = r.borrador;
      const nuevos = new Set<Campo>();
      const sig = { ...valores };
      (Object.keys(b) as Campo[]).forEach((k) => {
        const v = b[k];
        if (v === undefined) return;
        sig[k] = String(v);
        nuevos.add(k);
      });
      if (nuevos.size === 0) {
        setMensaje({ tipo: "error", texto: "No encontré datos claros en las notas. Llena los campos a mano." });
        return;
      }
      setValores(sig);
      setPorClaude(nuevos);
      setMensaje({
        tipo: "ok",
        texto: `Completé ${nuevos.size} ${nuevos.size === 1 ? "campo" : "campos"}. Quedaron resaltados en verde; corrige lo que haga falta.`,
      });
    });
  }

  const marca = (c: Campo) =>
    porClaude.has(c) ? <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Lo llenó NOVA</span> : null;
  const ring = (c: Campo) => (porClaude.has(c) ? " border-green-500 bg-green-50" : "");

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Cuéntale a NOVA del evento</h2>
          <p className="text-sm text-neutral-500">
            Escribe o pega las notas de la reunión. NOVA llena los datos que encuentre y tú los confirmas; no se guarda nada hasta que
            crees la propuesta. Si prefieres, llena los campos a mano.
          </p>
        </div>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={5}
          maxLength={6000}
          spellCheck
          lang="es"
          placeholder="Ej. Habló Marta Ruiz, directora de Expo Café. Congreso de caficultores en Armenia, 14 y 15 de marzo, unas 1.200 personas…"
          aria-label="Notas del evento"
          className="w-full rounded-md border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={completarConClaude} disabled={pensando || !notas.trim()} className="btn btn-primary">
            {pensando ? "Leyendo las notas…" : "Completar con NOVA"}
          </button>
          {mensaje && (
            <p role={mensaje.tipo === "error" ? "alert" : "status"} className={`text-sm ${mensaje.tipo === "error" ? "text-red-600" : "text-green-700"}`}>
              {mensaje.texto}
            </p>
          )}
        </div>
      </section>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Cliente</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="client_name">
              Nombre del contacto{marca("client_name")}
            </label>
            <input id="client_name" name="client_name" required spellCheck lang="es" value={valores.client_name} onChange={(e) => cambiar("client_name", e.target.value)} className={inputClass + ring("client_name")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="client_company">
              Empresa{marca("client_company")}
            </label>
            <input id="client_company" name="client_company" spellCheck lang="es" value={valores.client_company} onChange={(e) => cambiar("client_company", e.target.value)} className={inputClass + ring("client_company")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="client_cargo">
              Cargo del contacto{marca("client_cargo")}
            </label>
            <input id="client_cargo" name="client_cargo" spellCheck lang="es" value={valores.client_cargo} onChange={(e) => cambiar("client_cargo", e.target.value)} className={inputClass + ring("client_cargo")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Evento</legend>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="event_name">
            Nombre del evento{marca("event_name")}
          </label>
          <input id="event_name" name="event_name" required spellCheck lang="es" value={valores.event_name} onChange={(e) => cambiar("event_name", e.target.value)} className={inputClass + ring("event_name")} />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="lugar">
            Lugar{marca("lugar")}
          </label>
          <input id="lugar" name="lugar" placeholder="Ej. Centro de Convenciones..." spellCheck lang="es" value={valores.lugar} onChange={(e) => cambiar("lugar", e.target.value)} className={inputClass + ring("lugar")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="modality">
              Modalidad{marca("modality")}
            </label>
            <select id="modality" name="modality" required value={valores.modality} onChange={(e) => cambiar("modality", e.target.value)} className={inputClass + ring("modality")}>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrido">Híbrido</option>
              <option value="mundo_virtual">Mundo virtual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="city">
              Ciudad{marca("city")}
            </label>
            <input id="city" name="city" spellCheck lang="es" value={valores.city} onChange={(e) => cambiar("city", e.target.value)} className={inputClass + ring("city")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="dias">
              Días de operación del evento{marca("dias")}
            </label>
            <input id="dias" name="dias" type="number" min={0} step="0.5" value={valores.dias} onChange={(e) => cambiar("dias", e.target.value)} className={inputClass + ring("dias")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="aforo">
              Aforo presencial{marca("aforo")}
            </label>
            <input id="aforo" name="aforo" type="number" min={0} value={valores.aforo} onChange={(e) => cambiar("aforo", e.target.value)} className={inputClass + ring("aforo")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="aforo_virtual">
              Aforo virtual{marca("aforo_virtual")}
            </label>
            <input id="aforo_virtual" name="aforo_virtual" type="number" min={0} value={valores.aforo_virtual} onChange={(e) => cambiar("aforo_virtual", e.target.value)} className={inputClass + ring("aforo_virtual")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="event_start_date">
              Fecha inicio{marca("event_start_date")}
            </label>
            <input id="event_start_date" name="event_start_date" type="date" value={valores.event_start_date} onChange={(e) => cambiar("event_start_date", e.target.value)} className={inputClass + ring("event_start_date")} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="event_end_date">
              Fecha fin{marca("event_end_date")}
            </label>
            <input id="event_end_date" name="event_end_date" type="date" value={valores.event_end_date} onChange={(e) => cambiar("event_end_date", e.target.value)} className={inputClass + ring("event_end_date")} />
          </div>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
