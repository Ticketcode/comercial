"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { friendlyError } from "@/lib/errors";
import type {
  ActivityChecklistGroup,
  ActivityChecklistItem,
  ActivityEstado,
  ProposalActivity,
} from "@/lib/types";
import { ACTIVITY_CATEGORIES } from "@/lib/data/production-activity-template";
import {
  addChecklistGroup,
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  updateActivity,
} from "./actions";

interface Props {
  proposalId: string;
  activities: ProposalActivity[];
  groups: ActivityChecklistGroup[];
  items: ActivityChecklistItem[];
}

const MOMENTO_LABEL: Record<string, { label: string; className: string }> = {
  antes_evento: { label: "antes del evento", className: "bg-neutral-800 text-white" },
  durante_evento: { label: "durante el evento", className: "bg-pink-600 text-white" },
  despues_evento: { label: "después del evento", className: "bg-red-700 text-white" },
};

interface Handlers {
  onToggleItem: (id: string, completado: boolean) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (groupId: string, texto: string, sortOrder: number) => void;
  onAddGroup: (activityId: string, nombre: string, sortOrder: number) => void;
  onPatchActivity: (
    id: string,
    patch: { estado?: ActivityEstado; fecha_limite?: string | null; responsable?: string | null }
  ) => void;
}

const inputClass =
  "h-8 rounded-md border border-neutral-300 px-2 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

function ChecklistGroupBlock({
  group,
  items,
  handlers,
}: {
  group: ActivityChecklistGroup;
  items: ActivityChecklistItem[];
  handlers: Handlers;
}) {
  const [newText, setNewText] = useState("");
  const done = items.filter((i) => i.completado).length;

  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
      <p className="text-xs font-semibold text-neutral-700">
        {group.nombre} <span className="font-normal text-neutral-400">({done}/{items.length})</span>
      </p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={item.completado}
              onChange={(e) => handlers.onToggleItem(item.id, e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className={item.completado ? "text-neutral-400 line-through" : ""}>{item.texto}</span>
            <button
              type="button"
              onClick={() => handlers.onDeleteItem(item.id)}
              aria-label={`Quitar "${item.texto}"`}
              className="ml-auto rounded p-1 text-neutral-500 hover:text-red-600"
            >
              ✕
            </button>
          </label>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newText.trim()) return;
          handlers.onAddItem(group.id, newText.trim(), items.length);
          setNewText("");
        }}
        className="mt-2 flex gap-1"
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="+ Añadir elemento"
          className={`${inputClass} flex-1`}
        />
      </form>
    </div>
  );
}

function ActivityRow({
  activity,
  groups,
  itemsByGroup,
  handlers,
}: {
  activity: ProposalActivity;
  groups: ActivityChecklistGroup[];
  itemsByGroup: Record<string, ActivityChecklistItem[]>;
  handlers: Handlers;
}) {
  const [open, setOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const totalItems = groups.reduce((s, g) => s + (itemsByGroup[g.id]?.length ?? 0), 0);
  const doneItems = groups.reduce(
    (s, g) => s + (itemsByGroup[g.id]?.filter((i) => i.completado).length ?? 0),
    0
  );
  const momento = activity.momento ? MOMENTO_LABEL[activity.momento] : null;

  return (
    <div className="border-t border-neutral-100 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {groups.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? "Ocultar" : "Ver"} el checklist de ${activity.nombre}`}
            className="w-4 text-xs text-neutral-500"
          >
            {open ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span
          className={`min-w-[10rem] flex-1 text-sm ${
            activity.estado === "completada" ? "text-neutral-400 line-through" : "text-neutral-800"
          }`}
        >
          {activity.nombre}
          {totalItems > 0 && (
            <span className="ml-2 text-xs text-neutral-400">
              {doneItems}/{totalItems}
            </span>
          )}
        </span>
        {momento && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${momento.className}`}>
            {momento.label}
          </span>
        )}
        <input
          type="text"
          placeholder="Responsable"
          aria-label={`Responsable de ${activity.nombre}`}
          defaultValue={activity.responsable ?? ""}
          onBlur={(e) => {
            const value = e.target.value || null;
            if (value !== (activity.responsable ?? null)) {
              handlers.onPatchActivity(activity.id, { responsable: value });
            }
          }}
          className={`${inputClass} w-28`}
        />
        <input
          type="date"
          aria-label={`Fecha límite de ${activity.nombre}`}
          defaultValue={activity.fecha_limite ?? ""}
          onBlur={(e) => {
            const value = e.target.value || null;
            if (value !== (activity.fecha_limite ?? null)) {
              handlers.onPatchActivity(activity.id, { fecha_limite: value });
            }
          }}
          className={inputClass}
        />
        <button
          type="button"
          title={activity.estado === "completada" ? "Marcar como pendiente" : "Marcar como completada"}
          aria-pressed={activity.estado === "completada"}
          aria-label={`${activity.nombre}: completada`}
          onClick={() =>
            handlers.onPatchActivity(activity.id, {
              estado: activity.estado === "completada" ? "pendiente" : "completada",
            })
          }
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
            activity.estado === "completada"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-neutral-300 text-transparent hover:border-neutral-400"
          }`}
        >
          ✓
        </button>
      </div>

      {open && (
        <div className="ml-6 mt-2 space-y-2">
          {groups.map((g) => (
            <ChecklistGroupBlock
              key={g.id}
              group={g}
              items={itemsByGroup[g.id] ?? []}
              handlers={handlers}
            />
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newGroupName.trim()) return;
              handlers.onAddGroup(activity.id, newGroupName.trim(), groups.length);
              setNewGroupName("");
            }}
          >
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="+ Añadir grupo de checklist"
              className={`${inputClass} w-64`}
            />
          </form>
        </div>
      )}
    </div>
  );
}

export function ActividadesEditor({
  proposalId,
  activities: activitiesProp,
  groups: groupsProp,
  items: itemsProp,
}: Props) {
  // Estado local: los cambios se ven al instante y se guardan por detrás.
  const [activities, setActivities] = useState(activitiesProp);
  const [groups, setGroups] = useState(groupsProp);
  const [items, setItems] = useState(itemsProp);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(0);

  // Cuando llegan datos frescos del servidor y no hay guardados en curso, se adoptan.
  useEffect(() => {
    if (pending.current > 0) return;
    setActivities(activitiesProp);
    setGroups(groupsProp);
    setItems(itemsProp);
  }, [activitiesProp, groupsProp, itemsProp]);

  function save(action: () => Promise<{ error: string | null }>) {
    pending.current += 1;
    action()
      .then((r) => {
        if (r.error) throw new Error(r.error);
      })
      .catch((e: unknown) => {
        setError(
          `No se pudo guardar el último cambio: ${friendlyError(e)} Se restauró la pantalla; revisa que todo esté como esperas.`
        );
        setActivities(activitiesProp);
        setGroups(groupsProp);
        setItems(itemsProp);
      })
      .finally(() => {
        pending.current -= 1;
      });
  }

  const handlers: Handlers = {
    onToggleItem(id, completado) {
      setError(null);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completado } : i)));
      save(() => toggleChecklistItem(id, proposalId, completado));
    },
    onDeleteItem(id) {
      setError(null);
      setItems((prev) => prev.filter((i) => i.id !== id));
      save(() => deleteChecklistItem(id, proposalId));
    },
    onAddItem(groupId, texto, sortOrder) {
      setError(null);
      setItems((prev) => [
        ...prev,
        { id: `tmp-${Date.now()}`, group_id: groupId, texto, completado: false, sort_order: sortOrder },
      ]);
      save(() => addChecklistItem(groupId, proposalId, texto, sortOrder));
    },
    onAddGroup(activityId, nombre, sortOrder) {
      setError(null);
      setGroups((prev) => [
        ...prev,
        { id: `tmp-${Date.now()}`, activity_id: activityId, nombre, sort_order: sortOrder },
      ]);
      save(() => addChecklistGroup(activityId, proposalId, nombre, sortOrder));
    },
    onPatchActivity(id, patch) {
      setError(null);
      setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      save(() => updateActivity(id, proposalId, patch));
    },
  };

  const itemsByGroup = useMemo(() => {
    const map: Record<string, ActivityChecklistItem[]> = {};
    for (const item of items) {
      (map[item.group_id] ??= []).push(item);
    }
    return map;
  }, [items]);

  const groupsByActivity = useMemo(() => {
    const map: Record<string, ActivityChecklistGroup[]> = {};
    for (const g of groups) {
      (map[g.activity_id] ??= []).push(g);
    }
    return map;
  }, [groups]);

  const activitiesByCategoria = useMemo(() => {
    const map: Record<string, ProposalActivity[]> = {};
    for (const a of activities) {
      (map[a.categoria] ??= []).push(a);
    }
    return map;
  }, [activities]);

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  function toggleCategory(key: string) {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {ACTIVITY_CATEGORIES.map((cat) => {
        const catActivities = activitiesByCategoria[cat.key] ?? [];
        if (catActivities.length === 0) return null;
        const done = catActivities.filter((a) => a.estado === "completada").length;
        const open = !!openCategories[cat.key];
        return (
          <section key={cat.key} className="rounded-xl border border-neutral-200 bg-white">
            <button
              type="button"
              onClick={() => toggleCategory(cat.key)}
              aria-expanded={open}
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left sm:p-5"
            >
              <span className="text-xs text-neutral-400">{open ? "▼" : "▶"}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${cat.colorClass}`}>
                {cat.label}
              </span>
              <span className="text-xs text-neutral-400">
                {done}/{catActivities.length} completadas
              </span>
            </button>
            {open && (
              <div className="px-5 pb-5">
                {catActivities.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    groups={groupsByActivity[a.id] ?? []}
                    itemsByGroup={itemsByGroup}
                    handlers={handlers}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
