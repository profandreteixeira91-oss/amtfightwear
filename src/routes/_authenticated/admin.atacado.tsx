import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getWholesaleSettings, adminSaveWholesaleSettings, adminListStoreProducts, adminBulkSetWholesaleEnabled } from "@/lib/store/store.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Save } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/admin/atacado")({
  component: WholesaleSettingsPage,
});

function WholesaleSettingsPage() {
  const load = useServerFn(getWholesaleSettings);
  const save = useServerFn(adminSaveWholesaleSettings);
  const listProducts = useServerFn(adminListStoreProducts);

  const { data: settings, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "wholesale-settings"],
    queryFn: () => load(),
  });
  const { data: products } = useQuery({
    queryKey: ["admin", "store", "products", "wholesale-summary"],
    queryFn: () => listProducts({}),
  });

  const [enabled, setEnabled] = useState(true);
  const [pct, setPct] = useState("25");
  const [minQty, setMinQty] = useState("10");
  const [conditions, setConditions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setPct(String(settings.default_discount_percent));
    setMinQty(String(settings.min_qty_per_subcategory));
    setConditions(settings.conditions);
  }, [settings]);

  const wholesaleCount = (products ?? []).filter((p: any) => (p as { wholesale_enabled?: boolean }).wholesale_enabled).length;

  const onSave = async () => {
    const pctNum = Number(pct.replace(",", "."));
    const minNum = Number(minQty);
    if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 90) return toast.error("Desconto padrão deve ficar entre 0% e 90%");
    if (!Number.isInteger(minNum) || minNum < 1) return toast.error("Quantidade mínima deve ser inteiro ≥ 1");
    if (conditions.length > 2000) return toast.error("Condições excedem 2000 caracteres");
    try {
      setSaving(true);
      await save({ data: { enabled, default_discount_percent: pctNum, min_qty_per_subcategory: minNum, conditions } });
      toast.success("Configurações de atacado salvas");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      narrow
      eyebrow={
        <Link to="/admin/produtos" className="inline-flex items-center hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Produtos
        </Link>
      }
      title="Atacado"
      description="Configurações globais e produtos habilitados para venda no atacado."
      actions={
        <Button onClick={onSave} disabled={saving || isLoading}>
          <Save className="mr-1 h-4 w-4" /> Salvar
        </Button>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Regras gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-semibold">Vendas no atacado habilitadas</div>
              <div className="text-xs text-muted-foreground">
                Quando desligado, a página /loja/atacado bloqueia novos pedidos.
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pct">Desconto padrão (%)</Label>
              <Input id="pct" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Aplicado a produtos sem desconto próprio. Entre 0 e 90.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minqty">Mínimo por subcategoria</Label>
              <Input id="minqty" type="number" min={1} value={minQty} onChange={(e) => setMinQty(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Quantidade mínima de peças por subcategoria em cada pedido.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cond">Condições exibidas ao cliente</Label>
            <Textarea
              id="cond"
              rows={4}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              maxLength={2000}
              placeholder="Ex.: Mínimo de 10 unidades por subcategoria. Etiqueta personalizada grátis. Prazo de produção..."
            />
            <p className="text-xs text-muted-foreground">
              Este texto aparece na página do atacado, no cabeçalho de condições.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos no atacado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>{wholesaleCount}</strong> produto(s) atualmente vendidos no atacado.
          </p>
          <div className="flex flex-wrap gap-2">
            <BulkToggleButton mode="enable" onDone={() => refetch()} />
            <BulkToggleButton mode="disable" onDone={() => refetch()} />
          </div>
          <p className="text-muted-foreground">
            Habilite ou desabilite produtos individualmente pela coluna <em>Atacado / Desc.</em> em{" "}
            <Link to="/admin/produtos" className="text-primary hover:underline">Produtos da loja</Link>.
            O campo de percentual ao lado da chave define um desconto específico para o produto — deixe vazio para usar o padrão global.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function BulkToggleButton({ mode, onDone }: { mode: "enable" | "disable"; onDone: () => void }) {
  const bulk = useServerFn(adminBulkSetWholesaleEnabled);
  const [busy, setBusy] = useState(false);
  const enable = mode === "enable";
  const label = enable ? "Habilitar todos os produtos no atacado" : "Desabilitar todos";
  const confirmMsg = enable
    ? "Habilitar TODOS os produtos para venda no atacado?"
    : "Desabilitar o atacado em TODOS os produtos?";
  const onClick = async () => {
    if (!window.confirm(confirmMsg)) return;
    try {
      setBusy(true);
      const res = await bulk({ data: { enabled: enable } });
      toast.success(`${res.updated} produto(s) atualizado(s)`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant={enable ? "default" : "outline"} size="sm" onClick={onClick} disabled={busy}>
      {label}
    </Button>
  );
}
