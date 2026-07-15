import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Package, ShoppingCart, Download, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store/")({
  component: StoreDashboard,
});

function StoreDashboard() {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NavCard to="/store/products" icon={Package} title="Produtos" desc="Catálogo, preços, estoque" />
        <NavCard to="/store/orders" icon={ShoppingCart} title="Pedidos" desc="Vendas e status" />
        <NavCard to="/store/import" icon={Download} title="Importar catálogo" desc="Sincronizar site AMT" />
        <NavCard to="/store" icon={Store} title="Painel" desc="Visão geral" />
      </div>

      <Card>
        <CardHeader><CardTitle>Próximas fases</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
            <div><strong>Fase 2 — Melhor Envio:</strong> cálculo de frete, etiqueta, rastreamento.</div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
            <div><strong>Fase 3 — Pagamento:</strong> Mercado Pago / Pagar.me com PIX, cartão e boleto.</div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
            <div><strong>Fase 4 — Growth:</strong> cupons, e-mail transacional, SEO por produto, indicações.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NavCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
      <Icon className="h-6 w-6 text-primary" />
      <div className="mt-3 font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
