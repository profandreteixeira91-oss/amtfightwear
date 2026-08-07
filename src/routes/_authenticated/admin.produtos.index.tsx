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
import { getFiscalSuggestion } from "@/lib/fiscal/automation.functions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/store/cart-store";
import { ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, Pencil, Trash2, Plus, Search, Filter, MoreHorizontal, Package, AlertCircle, LayoutGrid, Receipt, Settings2, BarChart3, Info } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  component: AdminProductsPage,
});

const PAGE_SIZE = 20;
const PRODUCT_STALE_TIME = 1000 * 60 * 15;
const PRODUCT_GC_TIME = 1000 * 60 * 30;

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

  // Pré-carrega os dados completos do produto (detalhes + variações) assim que
  // o usuário passa o mouse/foco no botão de editar, para que o diálogo abra
  // já com os dados em cache em vez de esperar o round-trip do servidor.
  const getProductPrefetch = useServerFn(adminGetStoreProduct);
  const prefetchProduct = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "store", "product", id],
      queryFn: () => getProductPrefetch({ data: { id } }),
      staleTime: PRODUCT_STALE_TIME,
      gcTime: PRODUCT_GC_TIME,
    });
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
    const rows = (data as any) ?? [];
    return rows.filter((p: any) => {
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
      for (const p of (pageRows as any[])) {
        if (v) n.add(p.id);
        else n.delete(p.id);
      }
      return n;
    });
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((p: any) => selected.has(p.id));

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
    const rows = ((data as any[]) ?? []).filter((p) => selected.has(p.id));
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
              <Search className="h-4 w-4" />
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
              <Link to="/admin/fiscal" search={{}}><Button variant="ghost" size="sm" className="text-xs h-8 text-primary">Painel Fiscal</Button></Link>
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
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set(filtered.map((p: any) => p.id)))} disabled={filtered.length === 0} className="text-xs">
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

      <TooltipProvider>
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="px-6 py-4 bg-muted/20 border-b border-border/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Listagem de Produtos</CardTitle>
                  <p className="text-xs text-muted-foreground">Gerenciamento detalhado de estoque e preços</p>
                </div>
              </div>
              
              {dirtyCount > 0 && (
                <Button size="sm" onClick={saveAllDirty} disabled={saving} className="bg-primary hover:bg-primary/90 shadow-sm">
                  <Save className="mr-2 h-4 w-4" /> Salvar {dirtyCount} alteração(ões)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                <p className="text-sm font-medium">Carregando catálogo...</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      <th className="p-4 w-10">
                        <Checkbox checked={allPageSelected} onCheckedChange={(v) => toggleAllPage(!!v)} />
                      </th>
                      <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] min-w-[200px]">Produto</th>
                      <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[160px]">Preço Base</th>
                      <th className="p-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[100px]">Estoque</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[80px]">Status</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[80px]">Destaque</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[160px]">Atacado & Descontos</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-[140px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {pageRows.map((p: any) => {
                      const e = edits[p.id];
                      const priceVal = e?.price ?? String(p.price);
                      const stockVal = e?.stock ?? String(p.stock);
                      const dirty = !!e && ((e.price !== undefined && e.price !== String(p.price)) || (e.stock !== undefined && e.stock !== String(p.stock)));
                      
                      return (
                        <tr key={p.id} className={`group hover:bg-muted/40 transition-colors ${dirty ? "bg-primary/5" : ""}`}>
                          <td className="p-4">
                            <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggleRow(p.id, !!v)} />
                          </td>
                          <td className="p-4 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {p.image_url ? (
                                  <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border/40 shadow-sm" />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border/40">
                                    <Package className="h-6 w-6 text-muted-foreground/40" />
                                  </div>
                                )}
                                {dirty && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" title="Alteração pendente" />}
                              </div>
                              <div className="min-w-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="font-bold text-neutral-900 truncate max-w-[180px] sm:max-w-[240px] cursor-help">{p.name}</div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {p.name}
                                  </TooltipContent>
                                </Tooltip>
                                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter truncate max-w-[150px]">{p.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5 w-[140px]">
                              <div className="relative group/input">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">R$</span>
                                <Input
                                  value={priceVal}
                                  onChange={(ev) => setEdit(p.id, "price", ev.target.value)}
                                  className="h-8 pl-7 text-xs font-mono bg-muted/30 focus:bg-background border-border/40 w-full"
                                />
                              </div>
                              <div className="text-[10px] text-muted-foreground pl-1 font-medium italic opacity-70 truncate">Anterior: {formatBRL(Number(p.price))}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Input
                              value={stockVal}
                              onChange={(ev) => setEdit(p.id, "stock", ev.target.value)}
                              className={`h-8 text-xs font-mono bg-muted/30 focus:bg-background border-border/40 ${Number(stockVal) < 5 ? "text-destructive font-bold" : ""}`}
                            />
                            {Number(stockVal) < 5 && Number(stockVal) > 0 && (
                              <div className="text-[9px] text-destructive font-semibold mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Estoque Baixo
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Switch
                              checked={p.status === "active"}
                              onCheckedChange={async (v) => {
                                try { await patchOne(p.id, { status: v ? "active" : "inactive" }); toast.success("Status atualizado"); refresh(); }
                                catch (err) { toast.error("Erro ao atualizar status"); }
                              }}
                              className="mx-auto scale-90"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Switch
                              checked={p.featured ?? false}
                              onCheckedChange={async (v) => {
                                try { await patchOne(p.id, { featured: v }); toast.success("Destaque atualizado"); refresh(); }
                                catch (err) { toast.error("Erro ao atualizar destaque"); }
                              }}
                              className="mx-auto scale-90"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-3 bg-muted/20 px-2 py-1 rounded-md border border-border/40 w-full justify-center">
                                <Switch
                                  checked={(p as any).wholesale_enabled ?? false}
                                  onCheckedChange={async (v) => {
                                    try { await patchOne(p.id, { wholesale_enabled: v }); toast.success("Configuração de atacado salva"); refresh(); }
                                    catch (err) { toast.error("Erro"); }
                                  }}
                                  className="scale-75"
                                />
                                <div className="relative w-16 group/disc">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={90}
                                    placeholder="25"
                                    defaultValue={(p as any).wholesale_discount_percent ?? ""}
                                    onBlur={async (ev) => {
                                      const raw = ev.target.value.trim();
                                      const next = raw === "" ? null : Number(raw.replace(",", "."));
                                      if (next !== null && (next < 0 || next > 90)) return toast.error("Desconto 0-90%");
                                      try { await patchOne(p.id, { wholesale_discount_percent: next }); toast.success("Desconto atualizado"); refresh(); }
                                      catch (err) { toast.error("Erro"); }
                                    }}
                                    className="h-7 text-[10px] pr-4 bg-background border-border/40"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-bold">%</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {dirty && (
                                <Button size="icon" variant="secondary" onClick={() => saveRow(p.id)} disabled={saving} className="h-8 w-8 rounded-full shadow-sm" title="Salvar Linha">
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onMouseEnter={() => prefetchProduct(p.id)}
                                onFocus={() => prefetchProduct(p.id)}
                                onClick={() => { prefetchProduct(p.id); setEditingId(p.id); }}
                                className="h-8 w-8 rounded-full"
                                title="Editar Detalhes"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                    onClick={async () => {
                                      if (!confirm(`Excluir o produto "${p.name}"?`)) return;
                                      try {
                                        setSaving(true);
                                        await deleteProduct({ data: { id: p.id } });
                                        toast.success("Excluído");
                                        refresh();
                                      } catch (err) { toast.error("Erro ao excluir"); }
                                      finally { setSaving(false); }
                                    }}
                                    disabled={saving}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir permanentemente</TooltipContent>
                              </Tooltip>

                              {p.slug && (
                                <a href={`/loja/produto/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10 text-primary transition-colors" title="Ver no site">
                                  <ExternalLink className="h-3.5 w-3.5" />
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
                  <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                    <div className="bg-muted rounded-full p-6 mb-4">
                      <Search className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 mb-1">Nenhum produto encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                      {search ? "Tente ajustar seus filtros de busca ou categoria." : "Seu catálogo está vazio. Comece adicionando seu primeiro produto ou importando dados."}
                    </p>
                    {search ? (
                      <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategoryFilter(""); }}>Limpar Filtros</Button>
                    ) : (
                      <Button size="sm" onClick={() => setCreatingProduct(true)}>Adicionar Primeiro Produto</Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
          
          <div className="px-6 py-4 border-t border-border/40 bg-muted/10">
            {filtered.length > 0 && (
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            )}
          </div>
        </Card>
      </TooltipProvider>

      {editingId && (
        <ProductEditDialog
          productId={editingId}
          seed={(filtered as any[]).find((p) => p.id === editingId)}
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

function ProductEditDialog({ productId, seed, onClose, onSaved }: { productId: string; seed?: any; onClose: () => void; onSaved: () => void }) {
  const getProduct = useServerFn(adminGetStoreProduct);
  const updateProduct = useServerFn(adminUpdateStoreProduct);
  const saveVariants = useServerFn(adminSaveVariants);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "store", "product", productId],
    queryFn: () => getProduct({ data: { id: productId } }),
    staleTime: PRODUCT_STALE_TIME,
    gcTime: PRODUCT_GC_TIME,
  });

  // Semeia o formulário com o registro já carregado na listagem, para que o
  // diálogo apareça preenchido de imediato enquanto os dados completos chegam.
  const [name, setName] = useState(seed?.name ?? "");
  const [slug, setSlug] = useState(seed?.slug ?? "");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(seed?.price != null ? String(seed.price) : "");
  const [compareAt, setCompareAt] = useState(seed?.compare_at_price != null ? String(seed.compare_at_price) : "");
  const [stock, setStock] = useState(seed?.stock != null ? String(seed.stock) : "");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [ncm, setNcm] = useState(seed?.ncm ?? "");
  const [cest, setCest] = useState(seed?.cest ?? "");
  const [origem, setOrigem] = useState(seed?.origem ?? "");
  const [cfop, setCfop] = useState(seed?.cfop ?? "");
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
    // Impede salvar com o formulário apenas semeado pela listagem: campos como
    // descrição/GTIN ainda não chegaram e seriam gravados vazios.
    if (isLoading || !data?.product) return toast.error("Aguarde o carregamento completo do produto");
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col h-[85vh]">
          <DialogHeader className="p-6 pb-2 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Editar Produto</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Configure detalhes, preços, variações e dados fiscais.</p>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b border-border/40 bg-muted/10">
              <TabsList className="h-12 bg-transparent p-0 gap-6">
                <TabsTrigger value="geral" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase">
                  <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Geral
                </TabsTrigger>
                <TabsTrigger value="preco" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase">
                  <BarChart3 className="h-3.5 w-3.5 mr-2" /> Preço & Estoque
                </TabsTrigger>
                <TabsTrigger value="variacoes" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase">
                  <Package className="h-3.5 w-3.5 mr-2" /> Variações
                </TabsTrigger>
                <TabsTrigger value="fiscal" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase">
                  <Receipt className="h-3.5 w-3.5 mr-2" /> Fiscal
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {(isLoading || !data?.product) && !seed ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                    <p className="text-sm">Carregando dados do produto...</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="geral" className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Produto</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 focus:bg-background border-border/40" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Amigável (Slug)</Label>
                            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-muted/30 focus:bg-background border-border/40 font-mono text-xs" />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Curta</Label>
                            <Textarea 
                              value={shortDesc} 
                              onChange={(e) => setShortDesc(e.target.value)} 
                              rows={2} 
                              placeholder="Resumo para listagens..."
                              className="bg-muted/30 focus:bg-background border-border/40 text-sm resize-none" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Detalhada</Label>
                            <Textarea 
                              value={description} 
                              onChange={(e) => setDescription(e.target.value)} 
                              rows={5} 
                              placeholder="Informações técnicas, material, etc..."
                              className="bg-muted/30 focus:bg-background border-border/40 text-sm" 
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preco" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço de Venda (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço Original / "De" (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                            <Input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="0,00" className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estoque Geral</Label>
                          <Input value={stock} onChange={(e) => setStock(e.target.value)} className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-primary">Dica de Gestão</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Se o produto possuir variações (tamanhos/cores), o estoque e o preço de cada variação serão usados preferencialmente sobre os valores gerais definidos acima.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="variacoes" className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold">Gerenciar Variações</h3>
                          <p className="text-[11px] text-muted-foreground">Tamanhos, cores e SKUs específicos.</p>
                        </div>
                        <Button size="sm" onClick={addVariant} className="shadow-sm">
                          <Plus className="h-3.5 w-3.5 mr-2" /> Nova Variação
                        </Button>
                      </div>

                      {isLoading || !data?.product ? (
                        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                          <p className="text-sm">Carregando variações...</p>
                        </div>
                      ) : variants.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-2xl bg-muted/20">
                          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">Este produto não possui variações.</p>
                          <Button variant="link" size="sm" onClick={addVariant} className="mt-2">Adicionar a primeira</Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {variants.map((v, i) => (
                            <div key={v.id ?? `new-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-xl border border-border/40 bg-muted/10 group relative">
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tamanho</Label>
                                <Input className="h-8 text-xs bg-background" value={v.size ?? ""} onChange={(e) => updateVariant(i, { size: e.target.value })} placeholder="ex: A2" />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cor</Label>
                                <Input className="h-8 text-xs bg-background" value={v.color ?? ""} onChange={(e) => updateVariant(i, { color: e.target.value })} placeholder="ex: Branco" />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">SKU</Label>
                                <Input className="h-8 text-[10px] font-mono bg-background uppercase" value={v.sku ?? ""} onChange={(e) => updateVariant(i, { sku: e.target.value })} placeholder="AMT-KIM-A2W" />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preço (R$)</Label>
                                <Input className="h-8 text-xs font-mono bg-background" value={v.price != null ? String(v.price) : ""} onChange={(e) => updateVariant(i, { price: parseNum(e.target.value) })} placeholder="Herda" />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estoque</Label>
                                <Input className="h-8 text-xs font-mono bg-background" value={String(v.stock)} onChange={(e) => { const n = Number(e.target.value); updateVariant(i, { stock: Number.isFinite(n) ? n : 0 }); }} />
                              </div>
                              <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2 pb-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ativa</Label>
                                <Switch checked={v.active} onCheckedChange={(a) => updateVariant(i, { active: a })} className="scale-75" />
                              </div>
                              <div className="md:col-span-1 flex items-center justify-end pb-1">
                                <Button size="icon" variant="ghost" onClick={() => removeVariant(i)} className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="fiscal" className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border border-border/40">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Parâmetros Fiscais</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Esses dados são essenciais para a emissão correta de NF-e e cálculo de impostos.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">NCM (8 dígitos)</Label>
                          <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="62171000" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CEST (7 dígitos)</Label>
                          <Input value={cest} onChange={(e) => setCest(e.target.value)} placeholder="28.038.00" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem da Mercadoria</Label>
                          <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="0 - Nacional" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CFOP Padrão</Label>
                          <Input value={cfop} onChange={(e) => setCfop(e.target.value)} placeholder="5102" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unidade Comercial</Label>
                          <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="UN" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">GTIN / EAN-13</Label>
                          <Input value={gtin} onChange={(e) => setGtin(e.target.value)} placeholder="Código de barras" className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
                        </div>
                      </div>
                    </TabsContent>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t border-border/40 bg-muted/20">
              <div className="flex items-center justify-between w-full">
                <Button variant="ghost" onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSave} disabled={saving || isLoading} className="min-w-[140px] shadow-lg shadow-primary/20">
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </Tabs>
        </div>
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
  const getSuggestion = useServerFn(getFiscalSuggestion);
  const { data: cats } = useQuery({ queryKey: ["admin", "store", "categories"], queryFn: () => listCats({}) });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [shortDesc, setShortDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fiscalData, setFiscalData] = useState<any>({});
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
          ncm: fiscalData.ncm || null,
          cest: fiscalData.cest || null,
          cfop_internal: fiscalData.cfop_internal || null,
          cfop_interstate: fiscalData.cfop_interstate || null,
          unit_commercial: fiscalData.unit_commercial || 'UN',
          unit_taxable: fiscalData.unit_taxable || 'UN',
        },
      });
      toast.success("Produto criado com automação fiscal");
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const onCategoryChange = async (cid: string) => {
    setCategoryId(cid);
    if (!cid) return;
    try {
      const suggestion = await getSuggestion({ data: { category_id: cid } });
      if (suggestion) {
        setFiscalData(suggestion);
        toast.info("Sugestão fiscal aplicada para esta categoria", {
          description: `NCM: ${(suggestion as any).ncm} | CFOP: ${(suggestion as any).cfop_internal}`,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar sugestão fiscal", err);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Novo Produto</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Adicione um novo item ao seu catálogo.</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Produto *</Label>
                <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder="ex: Kimono AMT Pro" className="bg-muted/30 focus:bg-background border-border/40" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slug (URL) *</Label>
                <Input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="ex: kimono-amt-pro"
                  className="bg-muted/30 focus:bg-background border-border/40 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="199,90" className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estoque Inicial</Label>
                <Input value={stock} onChange={(e) => setStock(e.target.value)} className="bg-muted/30 focus:bg-background border-border/40 font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <select
                className="w-full h-10 rounded-md border border-border/40 bg-muted/30 px-3 text-sm focus:bg-background transition-all outline-none"
                value={categoryId}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="">— Selecione uma categoria —</option>
                {(cats ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL da Imagem</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="bg-muted/30 focus:bg-background border-border/40 text-xs" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Breve Descrição</Label>
              <Textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} placeholder="Resumo do produto..." className="bg-muted/30 focus:bg-background border-border/40 text-sm resize-none" />
            </div>

            {fiscalData.ncm && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                  <Receipt className="h-3.5 w-3.5" /> Automação Fiscal Ativa
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-blue-600/70 font-bold">NCM Sugerido</Label>
                    <Input 
                      value={fiscalData.ncm || ""} 
                      onChange={(e) => setFiscalData({...fiscalData, ncm: e.target.value})}
                      className="h-8 text-xs bg-white/50 border-blue-200" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-blue-600/70 font-bold">CFOP Interno</Label>
                    <Input 
                      value={fiscalData.cfop_internal || ""} 
                      onChange={(e) => setFiscalData({...fiscalData, cfop_internal: e.target.value})}
                      className="h-8 text-xs bg-white/50 border-blue-200" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[140px] shadow-lg shadow-primary/20">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Criar Produto
                </>
              )}
            </Button>
          </div>
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col h-[85vh]">
          <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Gestão de Categorias</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Organize seu catálogo e configure dados fiscais padrão.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex min-h-0">
            {/* Sidebar: Lista de Categorias */}
            <div className="w-1/3 border-r border-border/40 bg-muted/5 flex flex-col">
              <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categorias</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDraft(emptyCatDraft())} title="Nova Categoria">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {isLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Carregando...</div>
                  ) : (data ?? []).length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">Nenhuma categoria.</div>
                  ) : (
                    (data ?? []).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => startEdit(c)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${
                          draft.id === c.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{c.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 
                            className={`h-3.5 w-3.5 ${draft.id === c.id ? "text-primary-foreground/70" : "text-destructive hover:text-destructive"}`}
                            onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main: Formulário de Edição */}
            <div className="flex-1 flex flex-col bg-background">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                        <Info className="h-4 w-4 text-primary" />
                        Informações Gerais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Categoria *</Label>
                          <Input value={draft.name} onChange={(e) => handleName(e.target.value)} className="bg-muted/30 focus:bg-background h-9" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Slug (URL)</Label>
                          <Input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} className="bg-muted/30 focus:bg-background h-9 font-mono text-xs" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</Label>
                          <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={2} className="bg-muted/30 focus:bg-background text-sm resize-none" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL da Imagem</Label>
                          <Input value={draft.image_url} onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} placeholder="https://..." className="bg-muted/30 focus:bg-background h-9 text-xs" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ordem</Label>
                            <Input type="number" value={String(draft.sort_order)} onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))} className="bg-muted/30 focus:bg-background h-9" />
                          </div>
                          <div className="flex flex-col justify-end pb-1.5 space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
                             <div className="flex items-center gap-2">
                                <Switch checked={draft.active} onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))} className="scale-90" />
                                <span className="text-xs font-medium">{draft.active ? "Ativa" : "Inativa"}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/40">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          Dados Fiscais Padrão
                        </h3>
                        {editing && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={applyToProducts} disabled={applying} className="h-8 text-[10px] font-bold uppercase tracking-tight">
                                  {applying ? "Aplicando..." : "Propagar para Produtos"}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Aplica NCM, CEST e outros dados desta categoria em todos os produtos vinculados a ela.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">NCM</Label>
                          <Input value={draft.ncm} onChange={(e) => setDraft((d) => ({ ...d, ncm: e.target.value }))} className="bg-muted/30 h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">CEST</Label>
                          <Input value={draft.cest} onChange={(e) => setDraft((d) => ({ ...d, cest: e.target.value }))} className="bg-muted/30 h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Origem</Label>
                          <Input value={draft.origem} onChange={(e) => setDraft((d) => ({ ...d, origem: e.target.value }))} className="bg-muted/30 h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">CFOP</Label>
                          <Input value={draft.cfop} onChange={(e) => setDraft((d) => ({ ...d, cfop: e.target.value }))} className="bg-muted/30 h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Unidade</Label>
                          <Input value={draft.unidade} onChange={(e) => setDraft((d) => ({ ...d, unidade: e.target.value }))} className="bg-muted/30 h-8 text-xs font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onClose} disabled={saving}>Fechar</Button>
                <Button onClick={save} disabled={saving} className="min-w-[120px] shadow-lg shadow-primary/20">
                  {saving ? "Salvando..." : (editing ? "Atualizar Categoria" : "Criar Categoria")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

