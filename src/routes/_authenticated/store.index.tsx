import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Package, ShoppingCart, Download, ExternalLink, Ruler, Calculator, Users, Eye, LineChart } from "lucide-react";
import { adminGetVisitorStats } from "@/lib/store/customers.functions";

export const Route = createFileRoute("/_authenticated/store/")({
  component: StoreDashboard,
});

function StoreDashboard() {
  const fetchStats = useServerFn(adminGetVisitorStats);
  const { data, isLoading } = useQuery({
    queryKey: ["store", "visitor-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 60_000,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Loja Virtual AMT</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento do e-commerce nativo</p>
        </div>
        <a href="/loja" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <ExternalLink className="h-4 w-4" /> Ver storefront
        </a>
      </div>

      {/* Visitantes */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Visitantes do site</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <VisitorCard label="Hoje (24h)" pv={data?.pageviews.day} uniq={data?.visitors.day} loading={isLoading} />
          <VisitorCard label="Últimos 7 dias" pv={data?.pageviews.week} uniq={data?.visitors.week} loading={isLoading} />
          <VisitorCard label="Últimos 30 dias" pv={data?.pageviews.month} uniq={data?.visitors.month} loading={isLoading} />
        </div>
        {data?.series && data.series.length > 0 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <LineChart className="h-4 w-4 text-primary" /> Evolução diária (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBars series={data.series} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NavCard to="/store/products" icon={Package} title="Produtos" desc="Catálogo, preços, estoque" />
        <NavCard to="/store/orders" icon={ShoppingCart} title="Pedidos" desc="Vendas e status" />
        <NavCard to="/store/customers" icon={Users} title="Clientes" desc="Cadastros e histórico de compras" />
        <NavCard to="/store/sizes" icon={Ruler} title="Tabela de tamanhos" desc="Presets por categoria" />
        <NavCard to="/store/wholesale" icon={Store} title="Atacado" desc="Desconto, mínimo e produtos" />
        <NavCard to="/store/faixa-calc" icon={Calculator} title="Custo de faixas" desc="Calculadora de produção" />
        <NavCard to="/store/import" icon={Download} title="Importar catálogo" desc="Sincronizar site AMT" />
      </div>
    </div>
  );
}

function VisitorCard({ label, pv, uniq, loading }: { label: string; pv?: number; uniq?: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <>
            <div className="mt-2 text-3xl font-bold">{(uniq ?? 0).toLocaleString("pt-BR")}</div>
            <div className="text-xs text-muted-foreground">
              visitantes únicos · {(pv ?? 0).toLocaleString("pt-BR")} páginas vistas
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBars({ series }: { series: { date: string; pv: number; uniq: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.uniq));
  return (
    <div className="flex h-32 items-end gap-1">
      {series.map((s) => (
        <div key={s.date} className="group relative flex-1">
          <div
            className="w-full rounded-sm bg-primary/70 transition-colors hover:bg-primary"
            style={{ height: `${(s.uniq / max) * 100}%` }}
            title={`${s.date}: ${s.uniq} visitantes / ${s.pv} páginas`}
          />
        </div>
      ))}
    </div>
  );
}

function NavCard({ to, icon: Icon, title, desc }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
      <Icon className="h-6 w-6 text-primary" />
      <div className="mt-3 font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
