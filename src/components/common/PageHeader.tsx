import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="relative mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border/60 pb-5 sm:mb-8">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-4 top-0 hidden h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary/30 sm:block"
      />
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {eyebrow}
          </div>
        )}
        <h1 className="truncate bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
