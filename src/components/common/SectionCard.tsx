import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function SectionCard({ title, description, action, children, className, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`min-w-0 ${className ?? ""}`}
    >
      <Card className="min-w-0 overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-2 space-y-0 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold tracking-tight break-words">{title}</CardTitle>
            {description && <p className="mt-1 text-xs text-muted-foreground break-words">{description}</p>}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
        <CardContent className="min-w-0 pt-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
