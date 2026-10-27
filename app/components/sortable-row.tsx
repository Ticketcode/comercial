"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Se deriva del propio hook (en vez de anotar el tipo "Function" a mano) porque
// SyntheticListenerMap de dnd-kit no es compatible con una firma de función explícita.
type SortableListeners = ReturnType<typeof useSortable>["listeners"];

export interface SortableHandleProps {
  attributes: DraggableAttributes;
  listeners: SortableListeners;
}

/** Fila de tabla arrastrable (dnd-kit) — el handle se pasa al render-prop para que solo ese
 * botón inicie el arrastre y los demás controles de la fila (inputs, selects) sigan normales. */
export function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: SortableHandleProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
    background: isDragging ? "var(--surface, #fff)" : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-t border-neutral-100">
      {children({ attributes, listeners })}
    </tr>
  );
}

export function DragHandle({ attributes, listeners, label }: SortableHandleProps & { label: string }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="icon-btn cursor-grab touch-none active:cursor-grabbing"
      title="Arrastrar para reordenar"
      aria-label={label}
    >
      ⠿
    </button>
  );
}
