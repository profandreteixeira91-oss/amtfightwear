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
      <Card className="group relative min-w-0 overflow-hidden border-border/60 bg-card/60 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 break-words text-[11px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
              {label}
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <div className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</div>
          )}
          {typeof delta === "number" && !loading && (
            <div
              className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                positive ? "text-emerald-500" : "text-destructive"
              }`}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </div>
          )}
          {hint && !loading && (
            <div className="mt-1 break-words text-xs text-muted-foreground">{hint}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
