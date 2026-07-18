import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function VideoStat({
  icon: Icon,
  label,
  value,
  hint,
  tint,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tint?: "primary" | "success" | "warning" | "muted";
  index?: number;
}) {
  const tone =
    tint === "success"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
      : tint === "warning"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : tint === "primary"
          ? "bg-primary/10 text-primary ring-primary/20"
          : "bg-muted text-muted-foreground ring-border";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="dojo-card group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-2xl font-bold leading-none tracking-tight">{value ?? "—"}</div>
        {hint && <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </motion.div>
  );
}
