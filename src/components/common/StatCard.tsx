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
    >
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
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
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
