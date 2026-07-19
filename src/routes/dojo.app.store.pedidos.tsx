import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListOrders } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dojo/app/store/pedidos")({ component: OrdersPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusMap: Record<string, { label: string; variant: any }> = {
  pending: { label: "Aguardando pagamento", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  in_production: { label: "Em produção", variant: "secondary" },
  produced: { label: "Produção finalizada", variant: "secondary" },
  shipped: { label: "Enviado", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

function OrdersPage() {
  const fn = useServerFn(dsListOrders);
  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "orders"], queryFn: () => fn() });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!data?.length) return <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</Card>;

  return (
    <div className="space-y-2">
      {data.map((o: any) => {
        const s = statusMap[o.status] ?? { label: o.status, variant: "outline" };
        return (
          <Link key={o.id} to="/dojo/app/store/pedidos/$id" params={{ id: o.id }}>
            <Card className="flex items-center justify-between p-4 transition hover:bg-muted/40">
              <div>
                <div className="font-semibold">{o.order_number}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")} · {o.items?.length ?? 0} item(ns)
                </div>
                <Badge variant={s.variant} className="mt-1">{s.label}</Badge>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{brl(Number(o.total))}</div>
                {Number(o.savings) > 0 && <div className="text-xs text-emerald-600">−{brl(Number(o.savings))}</div>}
                {o.is_wholesale && <div className="text-[10px] text-primary">Atacado</div>}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
