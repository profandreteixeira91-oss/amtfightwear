import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Box, ChevronLeft, Layers, Pencil, RefreshCw, Save, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/common/PageShell";
import {
  adminListPackageProducts,
  adminSavePackageDimensions,
  adminBulkApplyPackageDimensions,
  type PackageProduct,
} from "@/lib/store/packages.functions";
import { adminListStoreCategories } from "@/lib/store/store.functions";

export const Route = createFileRoute("/_authenticated/admin/produtos/pacotes")({
  component: PackagesPage,
  head: () => ({
    meta: [
      { title: "Pacotes e dimensões dos produtos | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Edite peso, largura, altura e comprimento dos pacotes dos produtos AMT Fight Wear, base do cálculo de frete, com edição individual e em massa.",
      },
      { property: "og:title", content: "Pacotes e dimensões dos produtos | AMT Fight Wear" },
      {
        property: "og:description",
        content: "Gestão em massa das dimensões de embalagem usadas no cálculo de frete.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Draft = {
  weight_grams: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
};

const ALL = "__all__";

const toDraft = (p: PackageProduct): Draft => ({
  weight_grams: p.weight_grams != null ? String(p.weight_grams) : "",
  length_cm: p.length_cm != null ? String(p.length_cm) : "",
  width_cm: p.width_cm != null ? String(p.width_cm) : "",
  height_cm: p.height_cm != null ? String(p.height_cm) : "",
});

const num = (v: string): number | null => {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function PackagesPage() {
  const load = useServerFn(adminListPackageProducts);
  const loadCats = useServerFn(adminListStoreCategories);
  const saveRows = useServerFn(adminSavePackageDimensions);
  const bulkApply = useServerFn(adminBulkApplyPackageDimensions);

  const products = useQuery({ queryKey: ["admin", "store", "packages"], queryFn: () => load() });
  const categories = useQuery({ queryKey: ["admin", "store", "categories"], queryFn: () => loadCats() });

  const [term, setTerm] = useState("");
  const [catId, setCatId] = useState<string>(ALL);
  const [subId, setSubId] = useState<string>(ALL);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulk, setBulk] = useState<Draft>({ weight_grams: "", length_cm: "", width_cm: "", height_cm: "" });
  const [bulkOnlyEmpty, setBulkOnlyEmpty] = useState(false);
  const [saving, setSaving] = useState(false);

  const cats = categories.data ?? [];
  const parents = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const subs = useMemo(() => cats.filter((c) => c.parent_id && (catId === ALL || c.parent_id === catId)), [cats, catId]);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const list = products.data ?? [];
    const t = term.trim().toLowerCase();
    const subIds = new Set(cats.filter((c) => c.parent_id === catId).map((c) => c.id));
    return list.filter((p) => {
      if (subId !== ALL && p.category_id !== subId) return false;
      if (subId === ALL && catId !== ALL && p.category_id !== catId && !subIds.has(p.category_id ?? "")) return false;
      if (onlyMissing && p.weight_grams != null && p.length_cm != null && p.width_cm != null && p.height_cm != null) return false;
      if (!t) return true;
      return `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(t);
    });
  }, [products.data, term, catId, subId, onlyMissing, cats]);

  const selectedIds = rows.filter((r) => selected[r.id]).map((r) => r.id);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const draftOf = (p: PackageProduct) => drafts[p.id] ?? toDraft(p);
  const setField = (id: string, p: PackageProduct, key: keyof Draft, value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? toDraft(p)), [key]: value } }));

  const saveOne = async (p: PackageProduct) => {
    const d = draftOf(p);
    try {
      setSaving(true);
      await saveRows({
        data: {
          rows: [
            {
              id: p.id,
              weight_grams: d.weight_grams.trim() ? Math.round(num(d.weight_grams) ?? 0) : null,
              length_cm: num(d.length_cm),
              width_cm: num(d.width_cm),
              height_cm: num(d.height_cm),
            },
          ],
        },
      });
      toast.success("Pacote atualizado");
      setEditingId(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      await products.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveAllEdited = async () => {
    const list = Object.entries(drafts);
    if (list.length === 0) return toast.error("Nenhuma alteração pendente");
    try {
      setSaving(true);
      await saveRows({
        data: {
          rows: list.map(([id, d]) => ({
            id,
            weight_grams: d.weight_grams.trim() ? Math.round(num(d.weight_grams) ?? 0) : null,
            length_cm: num(d.length_cm),
            width_cm: num(d.width_cm),
            height_cm: num(d.height_cm),
          })),
        },
      });
      toast.success(`${list.length} produto(s) salvos`);
      setDrafts({});
      setEditingId(null);
      await products.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar em massa");
    } finally {
      setSaving(false);
    }
  };

  const applyBulk = async () => {
    if (selectedIds.length === 0) return toast.error("Selecione ao menos um produto");
    const values: Record<string, number | null> = {};
    if (bulk.weight_grams.trim()) values.weight_grams = Math.round(num(bulk.weight_grams) ?? 0);
    if (bulk.length_cm.trim()) values.length_cm = num(bulk.length_cm);
    if (bulk.width_cm.trim()) values.width_cm = num(bulk.width_cm);
    if (bulk.height_cm.trim()) values.height_cm = num(bulk.height_cm);
    if (Object.keys(values).length === 0) return toast.error("Informe ao menos um valor para aplicar");
    try {
      setSaving(true);
      const res = await bulkApply({ data: { ids: selectedIds, values, onlyEmpty: bulkOnlyEmpty } });
      toast.success(`${res.updated} produto(s) atualizados`);
      setSelected({});
      await products.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar em massa");
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = Object.keys(drafts).length;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/admin/produtos" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> Produtos
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Box className="h-6 w-6 text-primary" /> Pacotes
            </h1>
            <p className="text-sm text-muted-foreground">
              Dimensões de embalagem usadas como base para o cálculo de frete.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => products.refetch()} disabled={products.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${products.isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button size="sm" onClick={saveAllEdited} disabled={saving || pendingCount === 0}>
              <Save className="mr-2 h-4 w-4" /> Salvar {pendingCount > 0 ? `(${pendingCount})` : ""}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Nome ou SKU" value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select
                value={catId}
                onValueChange={(v) => {
                  setCatId(v);
                  setSubId(ALL);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as categorias</SelectItem>
                  {parents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subcategoria</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as subcategorias</SelectItem>
                  {subs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 md:col-span-4">
              <Checkbox id="only-missing" checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(Boolean(v))} />
              <Label htmlFor="only-missing" className="text-xs font-normal">Mostrar apenas produtos com dimensões incompletas</Label>
              <Badge variant="secondary" className="ml-auto">{rows.length} produto(s)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Editor em massa */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" /> Editor em massa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs">Peso (g)</Label>
                <Input inputMode="decimal" placeholder="ex: 800" value={bulk.weight_grams} onChange={(e) => setBulk({ ...bulk, weight_grams: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Comprimento (cm)</Label>
                <Input inputMode="decimal" placeholder="ex: 30" value={bulk.length_cm} onChange={(e) => setBulk({ ...bulk, length_cm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Largura (cm)</Label>
                <Input inputMode="decimal" placeholder="ex: 25" value={bulk.width_cm} onChange={(e) => setBulk({ ...bulk, width_cm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Altura (cm)</Label>
                <Input inputMode="decimal" placeholder="ex: 10" value={bulk.height_cm} onChange={(e) => setBulk({ ...bulk, height_cm: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="only-empty" checked={bulkOnlyEmpty} onCheckedChange={(v) => setBulkOnlyEmpty(Boolean(v))} />
                <Label htmlFor="only-empty" className="text-xs font-normal">Aplicar somente onde estiver vazio</Label>
              </div>
              <Badge variant="outline">{selectedIds.length} selecionado(s)</Badge>
              <Button size="sm" className="ml-auto" onClick={applyBulk} disabled={saving || selectedIds.length === 0}>
                <Save className="mr-2 h-4 w-4" /> Aplicar aos selecionados
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Campos vazios são ignorados na aplicação em massa.</p>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Produtos</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={(v) => {
                  const on = Boolean(v);
                  const next: Record<string, boolean> = {};
                  if (on) rows.forEach((r) => (next[r.id] = true));
                  setSelected(next);
                }}
              />
              <Label htmlFor="select-all" className="text-xs font-normal">Selecionar todos</Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {products.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando produtos...</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</p>
            ) : (
              rows.map((p) => {
                const d = draftOf(p);
                const isEditing = editingId === p.id;
                const dirty = Boolean(drafts[p.id]);
                return (
                  <div key={p.id} className={`rounded-lg border p-3 ${dirty ? "border-primary/50 bg-primary/5" : "bg-card"}`}>
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <Checkbox
                        checked={Boolean(selected[p.id])}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: Boolean(v) }))}
                      />
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <Box className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.sku ? `${p.sku} · ` : ""}{catName(p.category_id)}
                        </p>
                      </div>

                      {!isEditing && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge variant="secondary">{d.weight_grams || "—"} g</Badge>
                          <Badge variant="secondary">C {d.length_cm || "—"}</Badge>
                          <Badge variant="secondary">L {d.width_cm || "—"}</Badge>
                          <Badge variant="secondary">A {d.height_cm || "—"}</Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={() => saveOne(p)} disabled={saving}>
                              <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[p.id];
                                  return next;
                                });
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                          </Button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label className="text-xs">Peso (g)</Label>
                          <Input inputMode="decimal" value={d.weight_grams} onChange={(e) => setField(p.id, p, "weight_grams", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Comprimento (cm)</Label>
                          <Input inputMode="decimal" value={d.length_cm} onChange={(e) => setField(p.id, p, "length_cm", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Largura (cm)</Label>
                          <Input inputMode="decimal" value={d.width_cm} onChange={(e) => setField(p.id, p, "width_cm", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Altura (cm)</Label>
                          <Input inputMode="decimal" value={d.height_cm} onChange={(e) => setField(p.id, p, "height_cm", e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
