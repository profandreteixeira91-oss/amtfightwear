import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  adminListStoreProducts,
  adminUpdateStoreProduct,
  adminGetStoreProduct,
  adminSaveVariants,
  adminCreateStoreProduct,
  adminDeleteStoreProduct,
  adminListStoreCategories,
  adminUpsertStoreCategory,
  adminDeleteStoreCategory,
  adminApplyCategoryFiscalToProducts,
} from "@/lib/store/store.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/store/cart-store";
import { ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, Pencil, Trash2, Plus } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  component: AdminProductsPage,
});

const PAGE_SIZE = 20;

type EditState = Record<string, { price?: string; stock?: string }>;

function AdminProductsPage() {
  const list = useServerFn(adminListStoreProducts);
  const update = useServerFn(adminUpdateStoreProduct);
  const deleteProduct = useServerFn(adminDeleteStoreProduct);
  const listCatsTop = useServerFn(adminListStoreCategories);
  const queryClient = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "products"],
    queryFn: () => list({}),
  });
  const { data: catsAll } = useQuery({
    queryKey: ["admin", "store", "categories"],
    queryFn: () => listCatsTop({}),
  });


  // Invalida caches do storefront público para que alterações no /store
  // (preço, estoque, status, destaque, atacado, exclusão) reflitam
  // imediatamente em /loja, /loja/categoria, /loja/produto e /loja/atacado.
  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["store"] });
  };

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPricePct, setBulkPricePct] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);

  // Conjunto de category_ids que devem passar no filtro (categoria + descendentes)
  const allowedCategoryIds = useMemo(() => {
    if (!categoryFilter) return null;
    const cats = catsAll ?? [];
    const childrenByParent = new Map<string, string[]>();
    for (const c of cats) {
      if (!c.parent_id) continue;
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c.id);
      childrenByParent.set(c.parent_id, arr);
    }
    const acc = new Set<string>([categoryFilter]);
    const stack = [categoryFilter];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const child of childrenByParent.get(cur) ?? []) {
        if (!acc.has(child)) {
          acc.add(child);
          stack.push(child);
        }
      }
    }
    return acc;
  }, [categoryFilter, catsAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data ?? [];
    return rows.filter((p) => {
      if (allowedCategoryIds && !(p.category_id && allowedCategoryIds.has(p.category_id))) return false;
      if (!q) return true;
      const tokens = q.split(/\s+/).filter(Boolean);
      const hay = `${p.name} ${p.slug ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [data, search, allowedCategoryIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const setEdit = (id: string, field: "price" | "stock", value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const toggleRow = (id: string, v: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const toggleAllPage = (v: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const p of pageRows) {
        if (v) n.add(p.id);
        else n.delete(p.id);
      }
      return n;
    });
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));

  const patchOne = async (id: string, patch: Record<string, unknown>) => {
    await update({ data: { id, patch } });
  };

  const saveRow = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    const patch: Record<string, unknown> = {};
    if (e.price !== undefined && e.price !== "") {
      const n = Number(e.price.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return toast.error("Preço inválido");
      patch.price = n;
    }
    if (e.stock !== undefined && e.stock !== "") {
      const n = Number(e.stock);
      if (!Number.isInteger(n) || n < 0) return toast.error("Estoque inválido");
      patch.stock = n;
    }
    if (Object.keys(patch).length === 0) return;
    try {
      setSaving(true);
      await patchOne(id, patch);
      setEdits((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      toast.success("Salvo");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveAllDirty = async () => {
    const ids = Object.keys(edits);
    if (ids.length === 0) return;
    setSaving(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const e = edits[id];
        const patch: Record<string, unknown> = {};
        if (e.price !== undefined && e.price !== "") {
          const n = Number(e.price.replace(",", "."));
          if (Number.isFinite(n) && n >= 0) patch.price = n;
        }
        if (e.stock !== undefined && e.stock !== "") {
          const n = Number(e.stock);
          if (Number.isInteger(n) && n >= 0) patch.stock = n;
        }
        if (Object.keys(patch).length > 0) {
          await patchOne(id, patch);
          ok++;
        }
      } catch {
        fail++;
      }
    }
    setSaving(false);
    setEdits({});
    toast.success(`${ok} atualizado(s)${fail ? `, ${fail} falha(s)` : ""}`);
    refresh();
  };

  const applyBulk = async () => {
    if (selected.size === 0) return toast.error("Selecione produtos");
    const rows = (data ?? []).filter((p) => selected.has(p.id));
    const priceAbs = bulkPrice.trim() ? Number(bulkPrice.replace(",", ".")) : null;
    const pricePct = bulkPricePct.trim() ? Number(bulkPricePct.replace(",", ".")) : null;
    const stockAbs = bulkStock.trim() ? Number(bulkStock) : null;

    if (priceAbs !== null && (!Number.isFinite(priceAbs) || priceAbs < 0)) return toast.error("Preço inválido");
    if (pricePct !== null && !Number.isFinite(pricePct)) return toast.error("% inválido");
    if (stockAbs !== null && (!Number.isInteger(stockAbs) || stockAbs < 0)) return toast.error("Estoque inválido");
    if (priceAbs === null && pricePct === null && stockAbs === null) return toast.error("Informe um valor");

    setSaving(true);
    let ok = 0, fail = 0;
    for (const p of rows) {
      try {
        const patch: Record<string, unknown> = {};
        if (priceAbs !== null) patch.price = priceAbs;
        else if (pricePct !== null) patch.price = Number((Number(p.price) * (1 + pricePct / 100)).toFixed(2));
        if (stockAbs !== null) patch.stock = stockAbs;
        await patchOne(p.id, patch);
        ok++;
      } catch {
        fail++;
      }
    }
    setSaving(false);
    setBulkPrice(""); setBulkStock(""); setBulkPricePct("");
    setSelected(new Set());
    toast.success(`${ok} atualizado(s)${fail ? `, ${fail} falha(s)` : ""}`);
    refresh();
  };

  const dirtyCount = Object.keys(edits).length;

  return (
    <PageShell
      title="Catálogo de Produtos"
      description={`${filtered.length} itens encontrados`}
      actions={
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-muted/50 border-border/40 focus:bg-background transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Plus className="h-4 w-4 rotate-45" /> {/* Magnifying glass placeholder or search icon if available */}
            </div>
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="h-10 w-full sm:w-48 rounded-md border border-border/40 bg-muted/50 px-3 text-sm focus:bg-background transition-all outline-none"
          >
            <option value="">Todas as categorias</option>
            {(() => {
              const cats = catsAll ?? [];
              const byParent = new Map<string | null, typeof cats>();
              for (const c of cats) {
                const k = c.parent_id ?? null;
                const arr = byParent.get(k) ?? [];
                arr.push(c);
                byParent.set(k, arr);
              }
              const out: React.ReactNode[] = [];
              const walk = (parent: string | null, depth: number) => {
                for (const c of byParent.get(parent) ?? []) {
                  out.push(
                    <option key={c.id} value={c.id}>
                      {`${"— ".repeat(depth)}${c.name}`}
                    </option>,
                  );
                  walk(c.id, depth + 1);
                }
              };
              walk(null, 0);
              return out;
            })()}
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setCreatingProduct(true)} size="default" className="flex-1 sm:flex-none shadow-sm shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>
            <Button variant="outline" size="default" onClick={() => setManagingCategories(true)} className="flex-1 sm:flex-none bg-background/50">
              <Plus className="h-4 w-4 mr-2" /> Categorias
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-2">
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Stats or Highlights could go here if needed, keeping it clean for now */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full border border-border/40 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {data?.length ?? 0} Produtos Totais
               </div>
               {categoryFilter && (
                 <Button variant="link" size="sm" onClick={() => setCategoryFilter("")} className="h-auto p-0 text-muted-foreground hover:text-primary">
                   Limpar Filtro
                 </Button>
               )}
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/admin/produtos/importar"><Button variant="ghost" size="sm" className="text-xs h-8">Importar</Button></Link>
              <Link to="/admin/atacado"><Button variant="ghost" size="sm" className="text-xs h-8">Regras Atacado</Button></Link>
              <Link to="/admin/fiscal"><Button variant="ghost" size="sm" className="text-xs h-8 text-primary">Painel Fiscal</Button></Link>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border/40 bg-muted/30 backdrop-blur-sm overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/40 bg-background/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Ações em Massa
                  {selected.size > 0 && (
                    <Badge variant="secondary" className="font-mono text-[10px]">{selected.size} selecionado(s)</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Selecione itens na tabela para aplicar alterações rápidas.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set(filtered.map((p) => p.id)))} disabled={filtered.length === 0} className="text-xs">
                  Selecionar Tudo
                </Button>
                {selected.size > 0 && (
                  <>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="text-xs"
                      onClick={async () => {
                        if (!confirm(`Excluir ${selected.size} produto(s)?`)) return;
                        setSaving(true);
                        for (const id of Array.from(selected)) await deleteProduct({ data: { id } });
                        setSaving(false);
                        setSelected(new Set());
                        toast.success("Excluídos com sucesso");
                        refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-xs">Limpar</Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Novo Preço</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <Input value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="0,00" className="pl-8 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Ajuste Percentual</Label>
              <div className="relative">
                <Input value={bulkPricePct} onChange={(e) => setBulkPricePct(e.target.value)} placeholder="ex: 10 ou -5" className="h-9 text-sm pr-7" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Novo Estoque</Label>
              <Input value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
            <Button onClick={applyBulk} disabled={saving || selected.size === 0} className="h-9 shadow-sm">
              {saving ? "Aplicando..." : "Aplicar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <CardTitle>Catálogo</CardTitle>
          {dirtyCount > 0 && (
            <Button size="sm" onClick={saveAllDirty} disabled={saving}>
              <Save className="mr-1 h-3 w-3" /> Salvar {dirtyCount} alteração(ões)
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase">
                  <tr>
                    <th className="p-2 w-8">
                      <Checkbox checked={allPageSelected} onCheckedChange={(v) => toggleAllPage(!!v)} />
                    </th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left w-32">Preço</th>
                    <th className="p-2 text-left w-24">Estoque</th>
                    <th className="p-2 text-center w-20">Ativo</th>
                    <th className="p-2 text-center w-24">Destaque</th>
                    <th className="p-2 text-center w-40">Atacado / Desc.</th>
                    <th className="p-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => {
                    const e = edits[p.id];
                    const priceVal = e?.price ?? String(p.price);
                    const stockVal = e?.stock ?? String(p.stock);
                    const dirty = !!e && ((e.price !== undefined && e.price !== String(p.price)) || (e.stock !== undefined && e.stock !== String(p.stock)));
                    return (
                      <tr key={p.id} className={`border-b hover:bg-accent/30 ${dirty ? "bg-amber-500/5" : ""}`}>
                        <td className="p-2">
                          <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggleRow(p.id, !!v)} />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            value={priceVal}
                            onChange={(ev) => setEdit(p.id, "price", ev.target.value)}
                            className="h-8 w-28"
                          />
                          <div className="text-[10px] text-muted-foreground mt-0.5">{formatBRL(Number(p.price))}</div>
                        </td>
                        <td className="p-2">
                          <Input
                            value={stockVal}
                            onChange={(ev) => setEdit(p.id, "stock", ev.target.value)}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Switch
                            checked={p.status === "active"}
                            onCheckedChange={async (v) => {
                              try { await patchOne(p.id, { status: v ? "active" : "inactive" }); toast.success("Atualizado"); refresh(); }
                              catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                            }}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Switch
                            checked={p.featured ?? false}
                            onCheckedChange={async (v) => {
                              try { await patchOne(p.id, { featured: v }); toast.success("Atualizado"); refresh(); }
                              catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={(p as { wholesale_enabled?: boolean }).wholesale_enabled ?? false}
                              onCheckedChange={async (v) => {
                                try { await patchOne(p.id, { wholesale_enabled: v }); toast.success(v ? "Habilitado no atacado" : "Desabilitado do atacado"); refresh(); }
                                catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                              }}
                            />
                            <Input
                              type="number"
                              min={0}
                              max={90}
                              step="0.5"
                              placeholder="padrão"
                              defaultValue={(p as { wholesale_discount_percent?: number | null }).wholesale_discount_percent ?? ""}
                              onBlur={async (ev) => {
                                const raw = ev.target.value.trim();
                                const next = raw === "" ? null : Number(raw.replace(",", "."));
                                const current = (p as { wholesale_discount_percent?: number | null }).wholesale_discount_percent ?? null;
                                if (next === current) return;
                                if (next !== null && (!Number.isFinite(next) || next < 0 || next > 90)) return toast.error("Desconto 0-90%");
                                try { await patchOne(p.id, { wholesale_discount_percent: next }); toast.success("Desconto atualizado"); refresh(); }
                                catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                              }}
                              className="h-8 w-20 text-xs"
                              title="Desconto de atacado deste produto (%). Vazio = usa o padrão global."
                            />
                            <span className="text-[10px] text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {dirty && (
                              <Button size="sm" variant="secondary" onClick={() => saveRow(p.id)} disabled={saving}>
                                Salvar
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!confirm(`Excluir o produto "${p.name}"? Esta ação não pode ser desfeita.`)) return;
                                try {
                                  setSaving(true);
                                  await deleteProduct({ data: { id: p.id } });
                                  toast.success("Produto excluído");
                                  setSelected((prev) => { const n = new Set(prev); n.delete(p.id); return n; });
                                  refresh();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Erro ao excluir");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            {p.slug && (
                              <a href={`/loja/produto/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "Nenhum resultado para a busca." : (<>Nenhum produto ainda. <Link to="/admin/produtos/importar" className="text-primary hover:underline">Importar do site AMT</Link></>)}
                </div>
              )}

              {filtered.length > 0 && (
                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editingId && (
        <ProductEditDialog
          productId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => { setEditingId(null); refresh(); }}
        />
      )}

      {creatingProduct && (
        <ProductCreateDialog
          onClose={() => setCreatingProduct(false)}
          onCreated={(id) => {
            setCreatingProduct(false);
            refresh();
            setEditingId(id);
          }}
        />
      )}

      {managingCategories && (
        <CategoriesDialog onClose={() => setManagingCategories(false)} />
      )}
    </PageShell>
  );
}

type VariantDraft = {
  id?: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  weight_grams: number | null;
  sort_order: number;
  active: boolean;
};

function ProductEditDialog({ productId, onClose, onSaved }: { productId: string; onClose: () => void; onSaved: () => void }) {
  const getProduct = useServerFn(adminGetStoreProduct);
  const updateProduct = useServerFn(adminUpdateStoreProduct);
  const saveVariants = useServerFn(adminSaveVariants);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "store", "product", productId],
    queryFn: () => getProduct({ data: { id: productId } }),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [stock, setStock] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [origem, setOrigem] = useState("");
  const [cfop, setCfop] = useState("");
  const [unidade, setUnidade] = useState("");
  const [gtin, setGtin] = useState("");

  useEffect(() => {
    if (!data?.product) return;
    const p = data.product;
    setName(p.name ?? "");
    setSlug(p.slug ?? "");
    setShortDesc(p.short_description ?? "");
    setDescription(p.description ?? "");
    setPrice(String(p.price ?? ""));
    setCompareAt(p.compare_at_price != null ? String(p.compare_at_price) : "");
    setStock(String(p.stock ?? 0));
    setNcm((p as { ncm?: string | null }).ncm ?? "");
    setCest((p as { cest?: string | null }).cest ?? "");
    setOrigem((p as { origem?: string | null }).origem ?? "");
    setCfop((p as { cfop?: string | null }).cfop ?? "");
    setUnidade((p as { unidade?: string | null }).unidade ?? "");
    setGtin((p as { gtin?: string | null }).gtin ?? "");
    setVariants(
      (data.variants ?? []).map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        option_label: v.option_label,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock: v.stock,
        weight_grams: v.weight_grams,
        sort_order: v.sort_order,
        active: v.active,
      })),
    );
    setDeletedIds([]);
  }, [data]);

  const updateVariant = (i: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: null, color: null, option_label: null, sku: null, price: null, compare_at_price: null, stock: 0, weight_grams: null, sort_order: prev.length, active: true },
    ]);
  };

  const removeVariant = (i: number) => {
    setVariants((prev) => {
      const v = prev[i];
      if (v.id) setDeletedIds((d) => [...d, v.id!]);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const parseNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = async () => {
    const priceNum = parseNum(price);
    const stockNum = Number(stock);
    if (priceNum === null || priceNum < 0) return toast.error("Preço inválido");
    if (!Number.isInteger(stockNum) || stockNum < 0) return toast.error("Estoque inválido");
    if (!name.trim()) return toast.error("Nome obrigatório");

    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        short_description: shortDesc || null,
        description: description || null,
        price: priceNum,
        compare_at_price: parseNum(compareAt),
        stock: stockNum,
        ncm: ncm.trim() || null,
        cest: cest.trim() || null,
        origem: origem.trim() || null,
        cfop: cfop.trim() || null,
        unidade: unidade.trim() || null,
        gtin: gtin.trim() || null,
      };
      await updateProduct({ data: { id: productId, patch } });

      const cleanedVariants = variants.map((v, idx) => ({
        id: v.id,
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        option_label: v.option_label?.trim() || null,
        sku: v.sku?.trim() || null,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock: Number.isInteger(v.stock) ? v.stock : 0,
        weight_grams: v.weight_grams,
        sort_order: idx,
        active: v.active,
      }));
      await saveVariants({ data: { product_id: productId, variants: cleanedVariants, deleted_ids: deletedIds } });

      toast.success("Produto atualizado");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
        </DialogHeader>

        {isLoading || !data?.product ? (
          <div className="text-sm text-muted-foreground py-6">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <Label>Preço "de" (R$)</Label>
                <Input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="opcional" />
              </div>
              <div>
                <Label>Estoque</Label>
                <Input value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Descrição curta</Label>
              <Textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Descrição completa</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
            </div>

            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="font-semibold text-sm">Dados fiscais</div>
              <p className="text-xs text-muted-foreground">
                Usados na emissão de notas fiscais. Herdados da categoria por padrão; edite aqui para sobrescrever apenas neste produto.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">NCM</Label>
                  <Input className="h-8" value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Ex: 62171000" />
                </div>
                <div>
                  <Label className="text-xs">CEST</Label>
                  <Input className="h-8" value={cest} onChange={(e) => setCest(e.target.value)} placeholder="Ex: 28.038.00" />
                </div>
                <div>
                  <Label className="text-xs">Origem</Label>
                  <Input className="h-8" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="0 - Nacional" />
                </div>
                <div>
                  <Label className="text-xs">CFOP</Label>
                  <Input className="h-8" value={cfop} onChange={(e) => setCfop(e.target.value)} placeholder="Ex: 5102" />
                </div>
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Input className="h-8" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="UN, PC, KG..." />
                </div>
                <div>
                  <Label className="text-xs">GTIN / EAN</Label>
                  <Input className="h-8" value={gtin} onChange={(e) => setGtin(e.target.value)} placeholder="Código de barras" />
                </div>
              </div>
            </div>


            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Variações ({variants.length})</Label>
                <Button size="sm" variant="outline" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar variação
                </Button>
              </div>
              {variants.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma variação cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={v.id ?? `new-${i}`} className="grid grid-cols-12 gap-2 items-end border rounded p-2 bg-muted/30">
                      <div className="col-span-2">
                        <Label className="text-xs">Tamanho</Label>
                        <Input className="h-8" value={v.size ?? ""} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Cor</Label>
                        <Input className="h-8" value={v.color ?? ""} onChange={(e) => updateVariant(i, { color: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">SKU</Label>
                        <Input className="h-8" value={v.sku ?? ""} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Preço</Label>
                        <Input
                          className="h-8"
                          value={v.price != null ? String(v.price) : ""}
                          onChange={(e) => updateVariant(i, { price: parseNum(e.target.value) })}
                          placeholder="herda"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Estoque</Label>
                        <Input
                          className="h-8"
                          value={String(v.stock)}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            updateVariant(i, { stock: Number.isFinite(n) ? n : 0 });
                          }}
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center pb-1">
                        <Switch checked={v.active} onCheckedChange={(a) => updateVariant(i, { active: a })} />
                      </div>
                      <div className="col-span-1 flex items-center justify-end pb-1">
                        <Button size="icon" variant="ghost" onClick={() => removeVariant(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || isLoading}>
            <Save className="h-3 w-3 mr-1" /> {saving ? "Salvando..." : "Salvar tudo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages = useMemo(() => {
    const set = new Set<number>();
    set.add(1); set.add(totalPages);
    for (let i = page - 2; i <= page + 2; i++) if (i >= 1 && i <= totalPages) set.add(i);
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <Button size="icon" variant="ghost" onClick={() => onChange(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const gap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap && <span className="px-1 text-muted-foreground">…</span>}
            <Button
              size="sm"
              variant={p === page ? "default" : "ghost"}
              onClick={() => onChange(p)}
              className="min-w-8 h-8 px-2"
            >
              {p}
            </Button>
          </span>
        );
      })}
      <Button size="icon" variant="ghost" onClick={() => onChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={() => onChange(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ProductCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useServerFn(adminCreateStoreProduct);
  const listCats = useServerFn(adminListStoreCategories);
  const { data: cats } = useQuery({ queryKey: ["admin", "store", "categories"], queryFn: () => listCats({}) });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [shortDesc, setShortDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleName = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const s = slug.trim() || slugify(name);
    const p = Number(price.replace(",", "."));
    if (!Number.isFinite(p) || p < 0) return toast.error("Preço inválido");
    const st = Number(stock);
    if (!Number.isInteger(st) || st < 0) return toast.error("Estoque inválido");
    setSaving(true);
    try {
      const { id } = await create({
        data: {
          name: name.trim(),
          slug: s,
          price: p,
          stock: st,
          category_id: categoryId || null,
          short_description: shortDesc || null,
          image_url: imageUrl || null,
          status: "active",
          featured: false,
        },
      });
      toast.success("Produto criado");
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => handleName(e.target.value)} />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="ex: kimono-branco"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$) *</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="199,90" />
            </div>
            <div>
              <Label>Estoque</Label>
              <Input value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— sem categoria —</option>
              {(cats ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>URL da imagem</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Descrição curta</Label>
            <Textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Plus className="h-3 w-3 mr-1" /> {saving ? "Criando..." : "Criar produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CatDraft = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  active: boolean;
  ncm: string;
  cest: string;
  origem: string;
  cfop: string;
  unidade: string;
};

function emptyCatDraft(): CatDraft {
  return { slug: "", name: "", description: "", image_url: "", sort_order: 0, active: true, ncm: "", cest: "", origem: "", cfop: "", unidade: "" };
}

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const listCats = useServerFn(adminListStoreCategories);
  const upsert = useServerFn(adminUpsertStoreCategory);
  const del = useServerFn(adminDeleteStoreCategory);
  const applyFiscal = useServerFn(adminApplyCategoryFiscalToProducts);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "categories"],
    queryFn: () => listCats({}),
  });

  const [draft, setDraft] = useState<CatDraft>(emptyCatDraft());
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const editing = !!draft.id;

  const startEdit = (c: NonNullable<typeof data>[number]) => {
    setDraft({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? 0,
      active: c.active,
      ncm: c.ncm ?? "",
      cest: c.cest ?? "",
      origem: c.origem ?? "",
      cfop: c.cfop ?? "",
      unidade: c.unidade ?? "",
    });
  };

  const handleName = (v: string) => {
    setDraft((d) => ({ ...d, name: v, slug: d.id ? d.slug : (d.slug || slugify(v)) }));
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Nome obrigatório");
    const s = draft.slug.trim() || slugify(draft.name);
    setSaving(true);
    try {
      await upsert({
        data: {
          id: draft.id,
          slug: s,
          name: draft.name.trim(),
          description: draft.description || null,
          image_url: draft.image_url || null,
          sort_order: Number(draft.sort_order) || 0,
          active: draft.active,
          ncm: draft.ncm.trim() || null,
          cest: draft.cest.trim() || null,
          origem: draft.origem.trim() || null,
          cfop: draft.cfop.trim() || null,
          unidade: draft.unidade.trim() || null,
        },
      });
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      setDraft(emptyCatDraft());
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir categoria? Produtos vinculados ficarão sem categoria.")) return;
    try {
      await del({ data: { id } });
      toast.success("Categoria excluída");
      if (draft.id === id) setDraft(emptyCatDraft());
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const applyToProducts = async () => {
    if (!draft.id) return;
    if (!confirm("Aplicar os dados fiscais desta categoria em TODOS os produtos vinculados? Isso sobrescreve NCM, CEST, Origem, CFOP e Unidade nos produtos.")) return;
    setApplying(true);
    try {
      const res = await applyFiscal({
        data: {
          category_id: draft.id,
          fields: ["ncm", "cest", "origem", "cfop", "unidade"],
        },
      });
      toast.success(`Aplicado em ${res.updated} produto(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 border-r md:pr-4">
            <div className="font-semibold text-sm">
              {editing ? "Editar categoria" : "Nova categoria"}
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={draft.name} onChange={(e) => handleName(e.target.value)} />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>URL da imagem</Label>
              <Input value={draft.image_url} onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={String(draft.sort_order)}
                  onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
                <span className="text-sm">Ativa</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="font-semibold text-sm">Dados fiscais (padrão da categoria)</div>
              <p className="text-xs text-muted-foreground">
                Preencha para usar como padrão em produtos desta categoria. Use "Aplicar em todos os produtos" para sobrescrever os produtos existentes.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">NCM</Label>
                  <Input className="h-8" value={draft.ncm} onChange={(e) => setDraft((d) => ({ ...d, ncm: e.target.value }))} placeholder="Ex: 62171000" />
                </div>
                <div>
                  <Label className="text-xs">CEST</Label>
                  <Input className="h-8" value={draft.cest} onChange={(e) => setDraft((d) => ({ ...d, cest: e.target.value }))} placeholder="Ex: 28.038.00" />
                </div>
                <div>
                  <Label className="text-xs">Origem</Label>
                  <Input className="h-8" value={draft.origem} onChange={(e) => setDraft((d) => ({ ...d, origem: e.target.value }))} placeholder="0 - Nacional" />
                </div>
                <div>
                  <Label className="text-xs">CFOP</Label>
                  <Input className="h-8" value={draft.cfop} onChange={(e) => setDraft((d) => ({ ...d, cfop: e.target.value }))} placeholder="Ex: 5102" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Unidade</Label>
                  <Input className="h-8" value={draft.unidade} onChange={(e) => setDraft((d) => ({ ...d, unidade: e.target.value }))} placeholder="UN, PC, KG..." />
                </div>
              </div>
              {editing && (
                <Button variant="outline" size="sm" onClick={applyToProducts} disabled={applying} className="w-full">
                  {applying ? "Aplicando..." : "Aplicar em todos os produtos"}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="flex-1">
                <Save className="h-3 w-3 mr-1" />
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar categoria"}
              </Button>
              {editing && (
                <Button variant="ghost" onClick={() => setDraft(emptyCatDraft())}>Cancelar</Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-sm">Categorias existentes</div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : (data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma categoria ainda.</div>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {(data ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 border rounded p-2 text-sm">
                    {c.image_url && <img src={c.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        /{c.slug} · ordem {c.sort_order} {!c.active && "· inativa"}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

