import type { ReactNode } from "react";

type DojoPageShellProps = {
  /**
   * Descrição/subtítulo opcional (o título já é exibido pelo header sticky do layout).
   */
  description?: ReactNode;
  /** Ações no canto direito (botões primários da página). */
  actions?: ReactNode;
  /** Título opcional exibido dentro da página. Só use quando o header sticky não cobrir. */
  title?: ReactNode;
  children: ReactNode;
  /** Largura máxima menor para páginas de formulário. */
  narrow?: boolean;
};

/**
 * Container padrão do AMT Dojo Manager.
 *
 * O layout `/dojo/app` já renderiza um header sticky com título/subtítulo por rota,
 * então este shell foca em padronizar container, gap e ações — sem duplicar o H1.
 *
 * Uso:
 *   <DojoPageShell description="Detalhe" actions={<Button>Novo</Button>}>
 *     <Card>...</Card>
 *   </DojoPageShell>
 */
export function DojoPageShell({
  title,
  description,
  actions,
  children,
  narrow,
}: DojoPageShellProps) {
  const maxW = narrow ? "max-w-4xl" : "max-w-7xl";
  const showBar = Boolean(title || description || actions);
  return (
    <div className={`mx-auto flex w-full ${maxW} flex-col gap-6 md:gap-7`}>
      {showBar && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display break-words text-xl font-bold tracking-tight md:text-2xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
