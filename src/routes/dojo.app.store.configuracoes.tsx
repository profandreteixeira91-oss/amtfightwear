import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetSettings, dsUpdateSettings, dsRunSync, dsListSyncLogs } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/store/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetSettings);
  const updFn = useServerFn(dsUpdateSettings);
  const syncFn = useServerFn(dsRunSync);
  const logsFn = useServerFn(dsListSyncLogs);

  const { data: settings } = useQuery({ queryKey: ["dojo-store", "settings"], queryFn: () => getFn() });
  const { data: logs } = useQuery({ queryKey: ["dojo-store", "sync-logs"], queryFn: () => logsFn() });

  const [minQty, setMinQty] = useState(6);
  const [minValue, setMinValue] = useState(1000);
  useEffect(() => {
    if (settings) {
      setMinQty(settings.wholesale_min_qty_per_product ?? 6);
      setMinValue(Number(settings.wholesale_min_order_value ?? 1000));
    }
  }, [settings]);

  const upd = useMutation({
    mutationFn: () => updFn({ data: { wholesale_min_qty_per_product: minQty, wholesale_min_order_value: minValue } }),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["dojo-store", "settings"] }); },
  });
  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => { toast.success(`Sincronizado: ${r.products} produtos, ${r.categories} categorias`); qc.invalidateQueries({ queryKey: ["dojo-store", "sync-logs"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const last = logs?.[0];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Regras de atacado</h2>
        <p className="text-xs text-muted-foreground">
          Quando a academia atingir a quantidade mínima <b>por produto</b>, o sistema aplica automaticamente o preço de atacado (sem cupom).
        </p>
        <div>
          <Label>Quantidade mínima por produto</Label>
          <Input type="number" min={1} value={minQty} onChange={(e) => setMinQty(Number(e.target.value))} />
        </div>
        <div>
          <Label>Valor mínimo do pedido (referência)</Label>
          <Input type="number" min={0} step="0.01" value={minValue} onChange={(e) => setMinValue(Number(e.target.value))} />
        </div>
        <Button onClick={() => upd.mutate()} disabled={upd.isPending}>Salvar</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sincronização do catálogo</h2>
          <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
        </div>
        {last ? (
          <div className="rounded-md bg-muted p-3 text-xs">
            <div>Última sync: <b>{new Date(last.started_at).toLocaleString("pt-BR")}</b></div>
            <div>Status: <b>{last.status}</b></div>
            <div>Produtos: {last.products_count ?? 0} · Categorias: {last.categories_count ?? 0}</div>
            {last.error && <div className="text-destructive">Erro: {last.error}</div>}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Nenhuma sincronização executada ainda.</div>
        )}
        <div className="text-[11px] text-muted-foreground">
          A sincronização atualmente lê direto do catálogo oficial. A arquitetura já está preparada para integrar via API HTTP se a loja for migrada.
        </div>
        {(logs ?? []).length > 1 && (
          <div className="pt-2 text-xs">
            <div className="mb-1 font-medium">Histórico</div>
            <ul className="space-y-1">
              {logs!.slice(1, 10).map((l: any) => (
                <li key={l.id} className="flex justify-between text-muted-foreground">
                  <span>{new Date(l.started_at).toLocaleString("pt-BR")}</span>
                  <span>{l.status} · {l.products_count ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
