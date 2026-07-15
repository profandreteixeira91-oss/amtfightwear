import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListStoreProducts, adminUpdateStoreProduct } from "@/lib/store/store.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/store/cart-store";
import { ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store/products")({
  component: AdminProductsPage,
});

const PAGE_SIZE = 20;

type EditState = Record<string, { price?: string; stock?: string }>;

function AdminProductsPage() {
  const list = useServerFn(adminListStoreProducts);
  const update = useServerFn(adminUpdateStoreProduct);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "products"],
    queryFn: () => list({}),
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPricePct, setBulkPricePct] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data ?? [];
    if (!q) return rows;
    return rows.filter((p) => p.name.toLowerCase().includes(q) || (p.slug ?? "").toLowerCase().includes(q));
  }, [data, search]);

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
      refetch();
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
    refetch();
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
    refetch();
  };

  const dirtyCount = Object.keys(edits).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Produtos da loja</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} produtos {search && `(filtrados de ${data?.length ?? 0})`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64"
          />
          <Link to="/store/import"><Button variant="outline">Importar catálogo</Button></Link>
        </div>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-sm font-semibold min-w-[9rem]">
              Edição em massa
              <div className="text-xs font-normal text-muted-foreground">
                {selected.size} selecionado(s)
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Novo preço (R$)</label>
              <Input value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="ex: 199,90" className="w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Ajuste % (ex: 10 ou -5)</label>
              <Input value={bulkPricePct} onChange={(e) => setBulkPricePct(e.target.value)} placeholder="%" className="w-24" />
            </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Novo estoque</label>
                <Input value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="ex: 10" className="w-24" />
              </div>
              <Button onClick={applyBulk} disabled={saving}>Aplicar em massa</Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Preço absoluto tem prioridade sobre ajuste %.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
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
                              try { await patchOne(p.id, { status: v ? "active" : "inactive" }); toast.success("Atualizado"); refetch(); }
                              catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                            }}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Switch
                            checked={p.featured ?? false}
                            onCheckedChange={async (v) => {
                              try { await patchOne(p.id, { featured: v }); toast.success("Atualizado"); refetch(); }
                              catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
                            }}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {dirty && (
                              <Button size="sm" variant="secondary" onClick={() => saveRow(p.id)} disabled={saving}>
                                Salvar
                              </Button>
                            )}
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
                  {search ? "Nenhum resultado para a busca." : (<>Nenhum produto ainda. <Link to="/store/import" className="text-primary hover:underline">Importar do site AMT</Link></>)}
                </div>
              )}

              {filtered.length > 0 && (
                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
