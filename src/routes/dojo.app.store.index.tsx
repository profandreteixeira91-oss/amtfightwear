import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsDashboardKpis } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Clock, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/")({ component: StoreDashboard });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StoreDashboard() {
  const fn = useServerFn(dsDashboardKpis);
  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "kpis"], queryFn: () => fn() });

  const kpi = data?.kpis;
  const cards = [
    { label: "Pedidos realizados", value: kpi?.total_orders ?? 0, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { label: "Em andamento", value: kpi?.in_progress ?? 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Entregues", value: kpi?.delivered ?? 0, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "Gasto no mês", value: brl(kpi?.month_spend ?? 0), icon: DollarSign, color: "bg-purple-50 text-purple-600" },
  ];

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <div className={`inline-grid h-9 w-9 place-items-center rounded-lg ${c.color}`}><Icon className="h-4 w-4" /></div>
              <div className="mt-2 text-xs text-muted-foreground">{c.label}</div>
              <div className="text-lg font-bold">{c.value}</div>
            </Card>
          );
        })}
      </div>

      {!!data?.promos?.length && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">🔥 Promoções</h2>
            <Link to="/dojo/app/store/produtos" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <ProductGrid products={data.promos} />
        </section>
      )}

      {!!data?.featured?.length && (
        <section>
          <h2 className="mb-2 text-base font-semibold">⭐ Em destaque</h2>
          <ProductGrid products={data.featured} />
        </section>
      )}

      {!!data?.latest?.length && (
        <section>
          <h2 className="mb-2 text-base font-semibold">🆕 Lançamentos</h2>
          <ProductGrid products={data.latest} />
        </section>
      )}

      {!!data?.top_products?.length && (
        <section>
          <h2 className="mb-2 text-base font-semibold">📊 Mais comprados pela sua academia</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {data.top_products.map((t: any) => (
              <Card key={t.product_id} className="p-3">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {t.image_url ? <img src={t.image_url} alt={t.product_name} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="mt-2 truncate text-xs font-medium">{t.product_name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />{t.qty} un.</div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!!data?.recent_orders?.length && (
        <section>
          <h2 className="mb-2 text-base font-semibold">Últimos pedidos</h2>
          <Card className="divide-y">
            {data.recent_orders.map((o: any) => (
              <Link key={o.id} to="/dojo/app/store/pedidos/$id" params={{ id: o.id }} className="flex items-center justify-between p-3 hover:bg-muted/40">
                <div>
                  <div className="text-sm font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{brl(Number(o.total))}</div>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function ProductGrid({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {products.map((p) => (
        <Link key={p.id} to="/dojo/app/store/produtos/$slug" params={{ slug: p.slug }}>
          <Card className="overflow-hidden transition hover:shadow-md">
            <div className="aspect-square bg-muted overflow-hidden">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-2">
              <div className="truncate text-xs font-medium">{p.name}</div>
              <div className="flex items-baseline gap-1.5">
                {p.compare_at_price && p.compare_at_price > p.price ? (
                  <span className="text-[10px] text-muted-foreground line-through">{brl(Number(p.compare_at_price))}</span>
                ) : null}
                <span className="text-sm font-bold">{brl(Number(p.price))}</span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
