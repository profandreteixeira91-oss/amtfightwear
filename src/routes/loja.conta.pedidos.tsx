import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders } from "@/lib/store/customer-profile.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { orderStatusLabel, paymentStatusLabel, orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/store/order-status";
import { Loader2, User, Package, ChevronRight } from "lucide-react";

type Order = Awaited<ReturnType<typeof listMyOrders>>[number];

export const Route = createFileRoute("/loja/conta/pedidos")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }),
    );
  },
  head: () => ({
    meta: [
      { title: "Meus pedidos — AMT Fight Wear" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrdersPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Página não encontrada</div>,
});



function OrdersPage() {
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery(
    queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }),
  );
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { redirect: "/loja/conta/pedidos" }, replace: true });
        return;
      }
      setChecking(false);
      setLoading(true);
      try {
        const list = await listMyOrders();
        setOrders(list);
      } finally {
        setLoading(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <StoreShell categories={categories}>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Meus pedidos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe suas compras</p>
          </div>
          <nav className="flex gap-2">
            <Link
              to="/loja/conta"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent"
            >
              <User className="h-4 w-4" /> Meus dados
            </Link>
            <Link
              to="/loja/conta/pedidos"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background"
            >
              <Package className="h-4 w-4" /> Meus pedidos
            </Link>
          </nav>
        </div>

        {loading ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">Você ainda não tem pedidos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Explore a loja e faça sua primeira compra.</p>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Ir para a loja
            </Link>
          </div>
        ) : (
          <>
            {/* Cards no mobile */}
            <ul className="space-y-3 md:hidden">
              {orders.map((o) => (
                <li key={o.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-base font-bold tabular-nums">{o.order_number}</div>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold tabular-nums">{formatBRL(Number(o.total))}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${orderStatusBadgeClass(o.status)}`}>
                      {orderStatusLabel[o.status] ?? o.status}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusBadgeClass(o.payment_status)}`}>
                      {paymentStatusLabel[o.payment_status] ?? o.payment_status}
                    </span>
                  </div>
                  <Link
                    to="/loja/pedido/$id"
                    params={{ id: o.id }}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tabela no desktop */}
            <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-[var(--store-shadow-sm)] md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-accent/40">
                      <td className="px-4 py-3 font-semibold tabular-nums">{o.order_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusBadgeClass(o.status)}`}>
                          {orderStatusLabel[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(o.payment_status)}`}>
                          {paymentStatusLabel[o.payment_status] ?? o.payment_status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-black tabular-nums">{formatBRL(Number(o.total))}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/loja/pedido/$id"
                          params={{ id: o.id }}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Detalhes <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </StoreShell>
  );
}
