"use client";

import { useEffect, useState, useTransition } from "react";
import type { CatalogItem, LogisticsRateItem, PriceScaleItem } from "@/lib/types";
import { saveCatalog } from "./actions";

const SCALE_GROUP_LABELS: Record<PriceScaleItem["scale_group"], string> = {
  honorarios_productor: "Honorarios Productor (por aforo)",
  escarapelas_colaminada: "Escarapelas — Colaminada full color una cara (por cantidad)",
  escarapelas_tinta_16mm: "Escarapelas — con impresión una tinta 16mm (por cantidad)",
  manillas_full_color: "Manillas — impresión full color (por cantidad)",
};

function tierLabel(item: PriceScaleItem, isAforo: boolean) {
  const unit = isAforo ? "asistentes" : "unidades";
  if (item.tier_max === null) return `Desde ${item.tier_min} ${unit}`;
  return `${item.tier_min} a ${item.tier_max} ${unit}`;
}

const cellInput =
  "h-9 w-40 rounded-md border border-neutral-300 px-2 text-right text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

function formatEsCO(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

function parseEsCO(text: string): number {
  // "20.000" -> quita puntos de miles; "3,47" -> coma decimal a punto.
  const normalized = text.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : n;
}

/** Input con separador de miles (20.000) mientras se edita en pesos reales. */
function ThousandsInput({
  valuePesos,
  onChangePesos,
}: {
  valuePesos: number;
  onChangePesos: (pesos: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatEsCO(valuePesos));

  useEffect(() => {
    if (!focused) setText(formatEsCO(valuePesos));
  }, [valuePesos, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value);
        onChangePesos(parseEsCO(e.target.value));
      }}
      onBlur={() => {
        setFocused(false);
        setText(formatEsCO(valuePesos));
      }}
      className={cellInput}
    />
  );
}

export function CatalogEditor({
  logisticsItems,
  serviceItems,
  priceScaleItems,
}: {
  logisticsItems: LogisticsRateItem[];
  serviceItems: CatalogItem[];
  priceScaleItems: PriceScaleItem[];
}) {
  const [logisticsPrices, setLogisticsPrices] = useState<Record<string, number>>(
    () => Object.fromEntries(logisticsItems.map((i) => [i.id, Number(i.default_unit_cost)]))
  );
  const [servicePrices, setServicePrices] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        serviceItems.map((i) => [i.id, Number(i.default_unit_price ?? 0)])
      )
  );
  const [scaleValues, setScaleValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(priceScaleItems.map((i) => [i.id, Number(i.unit_value)]))
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const scaleGroups = Array.from(new Set(priceScaleItems.map((i) => i.scale_group)));

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCatalog({
        logisticsItems: logisticsItems.map((i) => ({
          id: i.id,
          default_unit_cost: logisticsPrices[i.id],
        })),
        serviceItems: serviceItems.map((i) => ({
          id: i.id,
          default_unit_price: servicePrices[i.id],
        })),
        priceScaleItems: priceScaleItems.map((i) => ({
          id: i.id,
          unit_value: scaleValues[i.id],
        })),
      });
      setMessage(result.error ? `Error: ${result.error}` : "Guardado.");
    });
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Rubros Logística</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Rubro</th>
              <th className="w-40 px-4 py-2 text-right">Valor unitario</th>
            </tr>
          </thead>
          <tbody>
            {logisticsItems.map((item) => (
              <tr key={item.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 text-neutral-800">
                  {item.name}
                  {item.city && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      {item.city}
                    </span>
                  )}
                  {!item.city && item.notes === "Tarifa fuera de Bogotá" && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      Otras ciudades
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <ThousandsInput
                    valuePesos={logisticsPrices[item.id]}
                    onChangePesos={(pesos) =>
                      setLogisticsPrices((prev) => ({ ...prev, [item.id]: pesos }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">
            2. Servicios personalizados de la plataforma
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-10 px-4 py-2">#</th>
              <th className="px-2 py-2">Descripción</th>
              <th className="w-40 px-4 py-2 text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {serviceItems.map((item, idx) => (
              <tr key={item.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 text-neutral-400">{idx + 1}</td>
                <td className="px-2 py-2 text-neutral-800">{item.name}</td>
                <td className="px-4 py-2 text-right">
                  <ThousandsInput
                    valuePesos={servicePrices[item.id]}
                    onChangePesos={(pesos) =>
                      setServicePrices((prev) => ({ ...prev, [item.id]: pesos }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {scaleGroups.map((group) => {
        const items = priceScaleItems
          .filter((i) => i.scale_group === group)
          .sort((a, b) => a.sort_order - b.sort_order);
        const isAforo = group === "honorarios_productor";
        return (
          <section key={group} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">{SCALE_GROUP_LABELS[group]}</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Tramo</th>
                  <th className="w-40 px-4 py-2 text-right">
                    {isAforo ? "Valor" : "Precio por unidad"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 text-neutral-800">{tierLabel(item, isAforo)}</td>
                    <td className="px-4 py-2 text-right">
                      <ThousandsInput
                        valuePesos={scaleValues[item.id]}
                        onChangePesos={(pesos) =>
                          setScaleValues((prev) => ({ ...prev, [item.id]: pesos }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar catálogo"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.startsWith("Error") ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
