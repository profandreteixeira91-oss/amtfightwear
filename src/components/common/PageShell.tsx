import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/PageHeader";

type PageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  /** Aplica largura máxima menor para páginas de formulário. */
  narrow?: boolean;
};

/**
 * Container padrão para páginas do painel administrativo.
 *
 * - Margens e largura máxima vêm do AdminShell; `narrow` limita formulários a `max-w-4xl`.
 * - Gap padronizado (24px entre seções).
 * - Cabeçalho unificado via `PageHeader`.
 *
 * Uso:
 *   <PageShell title="Pedidos" description="Gerencie vendas">
 *     <Card>...</Card>
 *   </PageShell>
 */
export function PageShell({
  title,
  description,
  actions,
  eyebrow,
  children,
  narrow,
}: PageShellProps) {
  return (
    <div className={narrow ? "mx-auto flex w-full max-w-4xl flex-col gap-6" : "flex w-full flex-col gap-6"}>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        eyebrow={eyebrow}
      />
      {children}
    </div>
  );
}
