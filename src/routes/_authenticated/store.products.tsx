import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListStoreProducts, adminUpdateStoreProduct } from "@/lib/store/store.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/store/cart-store";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store/products")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const list = useServerFn(adminListStoreProducts);
  const update = useServerFn(adminUpdateStoreProduct);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "products"],
    queryFn: () => list({}),
  });

  const toggle = async (id: string, patch: Record<string, boolean>) => {
    try {
      await update({ data: { id, patch } });
      toast.success("Atualizado");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Produtos da loja</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} produtos cadastrados</p>
        </div>
        <Link to="/store/import"><Button variant="outline">Importar catálogo</Button></Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Catálogo</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Preço</th>
                    <th className="p-2 text-left">Estoque</th>
                    <th className="p-2 text-center">Ativo</th>
                    <th className="p-2 text-center">Destaque</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-accent/30">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">{formatBRL(Number(p.price))}</td>
                      <td className="p-2">{p.stock}</td>
                      <td className="p-2 text-center">
                        <Switch checked={p.status === "active"} onCheckedChange={(v) => toggle(p.id, { status: v ? "active" : "inactive" } as any)} />
                      </td>
                      <td className="p-2 text-center">
                        <Switch checked={p.featured ?? false} onCheckedChange={(v) => toggle(p.id, { featured: v })} />
                      </td>
                      <td className="p-2 text-right">
                        {p.slug && (
                          <a href={`/loja/produto/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data && data.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum produto ainda. <Link to="/store/import" className="text-primary hover:underline">Importar do site AMT</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
