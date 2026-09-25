"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const inputClass =
  "h-8 rounded-md border border-neutral-300 px-2 text-xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

function ChecklistGroupBlock({
  group,
  items,
  proposalId,
}: {
  group: ActivityChecklistGroup;
  items: ActivityChecklistItem[];
  proposalId: string;
}) {
  const [newText, setNewText] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();
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
              onChange={(e) =>
                startTransition(async () => {
                  await toggleChecklistItem(item.id, proposalId, e.target.checked);
                  router.refresh();
                })
              }
              className="h-3.5 w-3.5"
            />
            <span className={item.completado ? "text-neutral-400 line-through" : ""}>{item.texto}</span>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await deleteChecklistItem(item.id, proposalId);
                  router.refresh();
                })
              }
              className="ml-auto text-neutral-300 hover:text-red-600"
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
          startTransition(async () => {
            await addChecklistItem(group.id, proposalId, newText.trim(), items.length);
            setNewText("");
            router.refresh();
          });
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
  proposalId,
}: {
  activity: ProposalActivity;
  groups: ActivityChecklistGroup[];
  itemsByGroup: Record<string, ActivityChecklistItem[]>;
  proposalId: string;
}) {
  const [open, setOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const totalItems = groups.reduce((s, g) => s + (itemsByGroup[g.id]?.length ?? 0), 0);
  const doneItems = groups.reduce(
    (s, g) => s + (itemsByGroup[g.id]?.filter((i) => i.completado).length ?? 0),
    0
  );
  const momento = activity.momento ? MOMENTO_LABEL[activity.momento] : null;

  return (
    <div className="border-t border-neutral-100 py-2">
      <div className="flex items-center gap-2">
        {groups.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-4 text-xs text-neutral-400"
          >
            {open ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span
          className={`flex-1 text-sm ${
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
          defaultValue={activity.responsable ?? ""}
          onBlur={(e) =>
            startTransition(async () => {
              await updateActivity(activity.id, proposalId, { responsable: e.target.value || null });
              router.refresh();
            })
          }
          className={`${inputClass} w-28`}
        />
        <input
          type="date"
          defaultValue={activity.fecha_limite ?? ""}
          onBlur={(e) =>
            startTransition(async () => {
              await updateActivity(activity.id, proposalId, { fecha_limite: e.target.value || null });
              router.refresh();
            })
          }
          className={inputClass}
        />
        <button
          type="button"
          title={activity.estado === "completada" ? "Marcar como pendiente" : "Marcar como completada"}
          onClick={() =>
            startTransition(async () => {
              const nextEstado: ActivityEstado =
                activity.estado === "completada" ? "pendiente" : "completada";
              await updateActivity(activity.id, proposalId, { estado: nextEstado });
              router.refresh();
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
              proposalId={proposalId}
            />
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newGroupName.trim()) return;
              startTransition(async () => {
                await addChecklistGroup(activity.id, proposalId, newGroupName.trim(), groups.length);
                setNewGroupName("");
                router.refresh();
              });
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

export function ActividadesEditor({ proposalId, activities, groups, items }: Props) {
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
              className="flex w-full items-center gap-3 p-5"
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
                    proposalId={proposalId}
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
