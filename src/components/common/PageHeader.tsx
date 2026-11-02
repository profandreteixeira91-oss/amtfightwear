import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold text-primary">{eyebrow}</div>}
        <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground sm:truncate sm:text-[1.75rem]">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}
