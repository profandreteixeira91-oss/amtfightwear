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
 * - Largura máxima consistente (`max-w-7xl`, `max-w-4xl` quando `narrow`).
 * - Padding e gap padronizados (24-28px entre seções).
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
    <div
      className={
        narrow
          ? "mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:gap-7 md:px-6 md:py-8"
          : "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-7 md:px-6 md:py-8"
      }
    >
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
