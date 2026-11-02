import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  label: string;
  value: string | number;
  delta?: number | null;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  index?: number;
};

export function StatCard({ label, value, delta, hint, icon: Icon, loading, index = 0 }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="min-w-0"
    >
      <Card className="relative min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none transition-colors hover:border-neutral-300">
        <CardContent className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 break-words text-[13px] font-medium leading-snug text-muted-foreground">
              {label}
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-foreground">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <div className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
          )}
          {typeof delta === "number" && !loading && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-destructive"
              }`}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </div>
          )}
          {hint && !loading && <div className="mt-1 break-words text-xs text-muted-foreground">{hint}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
