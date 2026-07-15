import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/store/store.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/store/cart-store";

export const Route = createFileRoute("/_authenticated/store/orders")({
  component: AdminOrdersPage,
});

const STATUSES = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];

function AdminOrdersPage() {
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrderStatus);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "orders"],
    queryFn: () => list({}),
  });

  const change = async (id: string, status: string) => {
    try {
      await update({ data: { id, status } });
      toast.success("Status atualizado");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black">Pedidos</h1>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} pedidos recebidos</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Todos os pedidos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Total</th>
                    <th className="p-2 text-left">Pagamento</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-accent/30">
                      <td className="p-2 font-mono text-xs">{o.order_number}</td>
                      <td className="p-2">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                      </td>
                      <td className="p-2 font-bold">{formatBRL(Number(o.total))}</td>
                      <td className="p-2">{o.payment_status}</td>
                      <td className="p-2">
                        <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data && data.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum pedido ainda.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
