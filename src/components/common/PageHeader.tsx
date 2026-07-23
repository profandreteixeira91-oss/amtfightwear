import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="relative mb-6 flex flex-col gap-4 border-b border-border/60 pb-5 sm:mb-8 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
        <h1 className="break-words bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:truncate sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
