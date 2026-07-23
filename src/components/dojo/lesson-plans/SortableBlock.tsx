import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export function SortableRow({ id, children }: { id: string; children: (handleProps: { listeners: ReturnType<typeof useSortable>["listeners"]; attributes: ReturnType<typeof useSortable>["attributes"] }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}

export function DragHandle({ listeners, attributes }: { listeners?: Record<string, unknown>; attributes?: Record<string, unknown> }) {
  return (
    <button
      type="button"
      className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      {...(listeners ?? {})}
      {...(attributes ?? {})}
      aria-label="Arrastar"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
