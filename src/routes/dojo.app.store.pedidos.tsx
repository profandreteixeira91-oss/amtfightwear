import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListOrders } from "@/lib/dojo/store/store.functions";
import { EmptyState } from "@/components/dojo/store/EmptyState";
import { ArrowRight, ClipboardList, Package } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/pedidos")({
  component: OrdersPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusStyle: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Aguardando pagamento",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  paid: {
    label: "Pago",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  in_production: {
    label: "Em produção",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  produced: {
    label: "Produção finalizada",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  shipped: {
    label: "Enviado",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  delivered: {
    label: "Entregue",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function OrdersPage() {
  const fn = useServerFn(dsListOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "orders"],
    queryFn: () => fn(),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Histórico
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Meus pedidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe status, rastreio e detalhes das suas compras na AMT Store.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="Você ainda não fez pedidos"
          description="Assim que finalizar uma compra, ela aparecerá aqui com todos os detalhes."
          action={
            <Link
              to="/dojo/app/store"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
            >
              Ir para a loja
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((o: any) => {
            const s = statusStyle[o.status] ?? {
              label: o.status,
              className: "bg-muted text-foreground border-[color:var(--dojo-border)]",
            };
            return (
              <li key={o.id}>
                <Link
                  to="/dojo/app/store/pedidos/$id"
                  params={{ id: o.id }}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[color:var(--dojo-border)] bg-white p-4 shadow-[var(--dojo-shadow-xs)] transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--dojo-shadow-md)] sm:flex sm:flex-wrap sm:justify-between sm:gap-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground/[0.04] text-foreground">
                      <Package className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold tracking-tight text-foreground">
                        {o.order_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("pt-BR")} ·{" "}
                        {o.items?.length ?? 0} item(ns)
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.className}`}
                        >
                          {s.label}
                        </span>
                        {o.is_wholesale && (
                          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-background">
                            Atacado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                        {brl(Number(o.total))}
                      </div>
                      {Number(o.savings) > 0 && (
                        <div className="text-xs font-medium text-emerald-600">
                          −{brl(Number(o.savings))}
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                      strokeWidth={1.75}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
