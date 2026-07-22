import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export function InsightCard({
  kind,
  title,
  message,
}: {
  kind: "success" | "warning" | "info";
  title: string;
  message: string;
}) {
  const styles =
    kind === "success"
      ? { icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" }
      : kind === "warning"
      ? { icon: AlertTriangle, cls: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300" }
      : { icon: Info, cls: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300" };
  const Icon = styles.icon;
  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${styles.cls}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs opacity-90">{message}</div>
      </div>
    </div>
  );
}
