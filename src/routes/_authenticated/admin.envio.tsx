import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getShippingSettings, updateShippingSettings } from "@/lib/store/shipping.functions";
import { adminListPackageProducts, type PackageProduct } from "@/lib/store/packages.functions";
import { adminListStoreCategories } from "@/lib/store/store.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, Save, Package } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";


export const Route = createFileRoute("/_authenticated/admin/envio")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      queryOptions({ queryKey: ["store", "shipping-settings"], queryFn: () => getShippingSettings() }),
    ),
  component: ShippingSettingsPage,
});

function ShippingSettingsPage() {
  const qc = useQueryClient();
  const update = useServerFn(updateShippingSettings);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["store", "shipping-settings"], queryFn: () => getShippingSettings() }),
  );
  const [form, setForm] = useState({
    env: (data?.env ?? "production") as "sandbox" | "production",
    origin_zip: data?.origin_zip ?? "57940000",
    default_weight_kg: Number(data?.default_weight_kg ?? 0.5),
    default_length_cm: Number(data?.default_length_cm ?? 20),
    default_width_cm: Number(data?.default_width_cm ?? 15),
    default_height_cm: Number(data?.default_height_cm ?? 5),
    default_insurance_value: Number(data?.default_insurance_value ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);


  useEffect(() => {
    if (data) {
      setForm({
        env: data.env as "sandbox" | "production",
        origin_zip: data.origin_zip,
        default_weight_kg: Number(data.default_weight_kg),
        default_length_cm: Number(data.default_length_cm),
        default_width_cm: Number(data.default_width_cm),
        default_height_cm: Number(data.default_height_cm),
        default_insurance_value: Number(data.default_insurance_value),
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: form });
      await qc.invalidateQueries({ queryKey: ["store", "shipping-settings"] });
      toast.success("Configurações salvas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      narrow
      title={
        <span className="inline-flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> Envio — Melhor Envio
        </span>
      }
      description="Configure origem, dimensões padrão e ambiente da integração com o Melhor Envio."
    >

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>
            Ambiente ativo: <strong className="text-foreground">{form.env}</strong>. Token configurado como secret{" "}
            <code className="rounded bg-muted px-1">MELHOR_ENVIO_TOKEN</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ambiente</Label>
              <select
                value={form.env}
                onChange={(e) => setForm((f) => ({ ...f, env: e.target.value as "sandbox" | "production" }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="production">Produção</option>
                <option value="sandbox">Sandbox (testes)</option>
              </select>
            </div>
            <div>
              <Label>CEP de origem</Label>
              <Input
                value={form.origin_zip}
                onChange={(e) => setForm((f) => ({ ...f, origin_zip: e.target.value }))}
                placeholder="57940000"
              />
            </div>
          </div>

          {/* Seleção de produto por categoria/subcategoria: aplica as medidas reais */}
          <ProductDimensionPicker
            selectedId={productId}
            onSelect={(p) => {
              setProductId(p.id);
              setForm((f) => ({
                ...f,
                default_weight_kg: p.weight_grams != null ? Number((p.weight_grams / 1000).toFixed(3)) : f.default_weight_kg,
                default_length_cm: p.length_cm ?? f.default_length_cm,
                default_width_cm: p.width_cm ?? f.default_width_cm,
                default_height_cm: p.height_cm ?? f.default_height_cm,
              }));
              toast.success(`Dimensões de "${p.name}" aplicadas`);
            }}
          />

          <div>
            <div className="mb-1 text-sm font-bold">Dimensões e peso padrão</div>
            <p className="mb-3 text-xs text-muted-foreground">
              Aplicados a produtos que não têm medidas próprias cadastradas. Peso em kg, dimensões em cm.
            </p>
            <div className="grid gap-3 sm:grid-cols-5">
              <NumField label="Peso (kg)" value={form.default_weight_kg} onChange={(v) => setForm((f) => ({ ...f, default_weight_kg: v }))} step={0.1} />
              <NumField label="Comp. (cm)" value={form.default_length_cm} onChange={(v) => setForm((f) => ({ ...f, default_length_cm: v }))} />
              <NumField label="Larg. (cm)" value={form.default_width_cm} onChange={(v) => setForm((f) => ({ ...f, default_width_cm: v }))} />
              <NumField label="Alt. (cm)" value={form.default_height_cm} onChange={(v) => setForm((f) => ({ ...f, default_height_cm: v }))} />
              <NumField label="Seguro (R$)" value={form.default_insurance_value} onChange={(v) => setForm((f) => ({ ...f, default_insurance_value: v }))} step={1} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de cotação</CardTitle>
          <CardDescription>
            Simule um envio para conferir se o token e as configurações estão funcionando.
            {productId ? " Usa o produto selecionado acima." : " Usa um pacote fictício (1 item)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestQuoteBlock productId={productId} />
        </CardContent>
      </Card>

    </PageShell>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const ALL = "__all__";

function ProductDimensionPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (p: PackageProduct) => void;
}) {
  const loadProducts = useServerFn(adminListPackageProducts);
  const loadCats = useServerFn(adminListStoreCategories);
  const products = useQuery({ queryKey: ["admin", "store", "packages"], queryFn: () => loadProducts() });
  const categories = useQuery({ queryKey: ["admin", "store", "categories"], queryFn: () => loadCats() });

  const [catId, setCatId] = useState<string>(ALL);
  const [subId, setSubId] = useState<string>(ALL);

  const cats = categories.data ?? [];
  const parents = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, typeof cats>();
    for (const c of cats) {
      if (!c.parent_id) continue;
      const arr = m.get(c.parent_id) ?? [];
      arr.push(c);
      m.set(c.parent_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return m;
  }, [cats]);

  const descendantIds = useMemo(
    () => (rootId: string) => {
      const out = new Set<string>();
      const stack = [rootId];
      while (stack.length) {
        const cur = stack.pop()!;
        if (out.has(cur)) continue;
        out.add(cur);
        for (const kid of childrenByParent.get(cur) ?? []) stack.push(kid.id);
      }
      return out;
    },
    [childrenByParent],
  );

  const subs = useMemo(() => {
    const out: { id: string; name: string; depth: number }[] = [];
    const walk = (parentId: string, depth: number) => {
      for (const c of childrenByParent.get(parentId) ?? []) {
        out.push({ id: c.id, name: c.name, depth });
        walk(c.id, depth + 1);
      }
    };
    if (catId === ALL) {
      for (const p of parents) walk(p.id, 0);
    } else {
      walk(catId, 0);
    }
    return out;
  }, [childrenByParent, parents, catId]);

  const options = useMemo(() => {
    const list = products.data ?? [];
    const scope = subId !== ALL ? descendantIds(subId) : catId !== ALL ? descendantIds(catId) : null;
    return list.filter((p) => (scope ? scope.has(p.category_id ?? "") : true));
  }, [products.data, catId, subId, descendantIds]);

  const selected = options.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Package className="h-4 w-4 text-primary" /> Usar medidas de um produto
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Filtre por categoria e subcategoria e escolha um produto — as dimensões abaixo são preenchidas automaticamente.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select
            value={catId}
            onValueChange={(v) => {
              setCatId(v);
              setSubId(ALL);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as categorias</SelectItem>
              {parents.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Subcategoria</Label>
          <Select value={subId} onValueChange={setSubId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as subcategorias</SelectItem>
              {subs.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {`${"— ".repeat(s.depth)}${s.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Produto ({options.length})</Label>
          <Select
            value={selectedId ?? ""}
            onValueChange={(v) => {
              const p = options.find((o) => o.id === v);
              if (p) onSelect(p);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={products.isLoading ? "Carregando..." : "Selecione um produto"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` · ${p.sku}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {selected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">
            Peso {selected.weight_grams != null ? `${(selected.weight_grams / 1000).toFixed(3)} kg` : "—"}
          </Badge>
          <Badge variant="secondary">C {selected.length_cm ?? "—"}</Badge>
          <Badge variant="secondary">L {selected.width_cm ?? "—"}</Badge>
          <Badge variant="secondary">A {selected.height_cm ?? "—"}</Badge>
          {selected.weight_grams == null || selected.length_cm == null ? (
            <span className="text-muted-foreground">Produto sem medidas completas — cadastre em Produtos › Pacotes.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TestQuoteBlock({ productId }: { productId: string | null }) {
  const testItems = useMemo(
    () => [{ product_id: productId ?? "00000000-0000-0000-0000-000000000000", quantity: 1 }],
    [productId],
  );
  return <ShippingCalculator items={testItems} compact />;

}
