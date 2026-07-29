import * as React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingDown, TrendingUp, Inbox, AlertTriangle } from "lucide-react";

/**
 * Design System da Central Administrativa AMT.
 *
 * Componentes puramente visuais e reutilizáveis — nenhuma regra de negócio.
 * Usados para padronizar cabeçalhos, cards, KPIs, toolbars e estados de tela
 * em todos os módulos de /admin.
 */

/* --------------------------------- Layout -------------------------------- */

export function AdminPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>
      <div className="admin-fade-in space-y-6 lg:space-y-8">{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("admin-card", className)}>
      {title || actions ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/70 px-5 py-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/* ----------------------------------- KPI ---------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  href,
  tone = "neutral",
  loading,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-destructive/10 text-destructive",
  };

  const body = (
    <div className={cn("admin-card admin-card--hover h-full p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {typeof delta === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              delta >= 0
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="truncate">{hint}</span> : null}
        {href ? <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" /> : null}
      </div>
    </div>
  );

  return href ? (
    <Link to={href} className="block focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
  );
}

/* --------------------------------- Toolbar -------------------------------- */

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "admin-card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Badge --------------------------------- */

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-sky-500/10 text-sky-600 ring-sky-500/20",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Estados -------------------------------- */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="admin-empty-orb grid h-16 w-16 place-items-center rounded-2xl">
        <Icon className="h-7 w-7 text-primary" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null
      }
    />
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="admin-card space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}
