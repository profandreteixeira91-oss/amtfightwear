import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--dojo-border)] bg-white/60 p-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[color:var(--dojo-surface-3)] text-muted-foreground">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <div className="text-lg font-semibold tracking-tight text-foreground">{title}</div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
