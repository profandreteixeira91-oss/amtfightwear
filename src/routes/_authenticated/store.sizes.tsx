import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listSizePresets, upsertSizePreset, deleteSizePreset, syncAllSizePresets, type SizePreset } from "@/lib/store/sizes.functions";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/store/sizes")({
  component: SizesPage,
});

type Draft = {
  id?: string;
  category_key: string;
  category_label: string;
  sizes: string[];
  sort_order: number;
};

const empty: Draft = { category_key: "", category_label: "", sizes: [], sort_order: 0 };

function SizesPage() {
  const load = useServerFn(listSizePresets);
  const save = useServerFn(upsertSizePreset);
  const del = useServerFn(deleteSizePreset);
  const syncAll = useServerFn(syncAllSizePresets);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "size-presets"],
    queryFn: () => load(),
  });

  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const start = (p?: SizePreset) => {
    setEditing(
      p
        ? { id: p.id, category_key: p.category_key, category_label: p.category_label, sizes: [...p.sizes], sort_order: p.sort_order }
        : { ...empty, sort_order: (data?.length ?? 0) + 1 },
    );
  };

  const onSave = async () => {
    if (!editing) return;
    if (!editing.category_key.trim() || !editing.category_label.trim()) return toast.error("Preencha chave e nome da categoria");
    if (editing.sizes.length === 0) return toast.error("Adicione ao menos um tamanho");
    try {
      setSaving(true);
      const res = await save({ data: editing });
      if (res && "syncedProducts" in res && (res as { syncedProducts: number }).syncedProducts > 0) {
        const r = res as { syncedProducts: number; addedVariants: number; removedVariants: number };
        toast.success(
          `Categoria salva · ${r.syncedProducts} faixa(s) sincronizada(s) (+${r.addedVariants} / -${r.removedVariants} variantes)`,
        );
      } else {
        toast.success("Categoria salva");
      }
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Excluir esta categoria de tamanhos?")) return;
    try {
      await del({ data: { id } });
      toast.success("Removida");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  return (
    <PageShell
      eyebrow={
        <Link to="/store" className="inline-flex items-center hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Loja
        </Link>
      }
      title="Tabela de tamanhos"
      description="Presets fixos por categoria (kimono, faixa etc.). Usados para gerar variantes de produto."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={syncing} onClick={async () => {
            try {
              setSyncing(true);
              const r = await syncAll({});
              toast.success(
                `Sincronizado · ${r.syncedProducts} produto(s) (+${r.addedVariants} / -${r.removedVariants} variantes)`,
              );
              refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Falha ao sincronizar");
            } finally {
              setSyncing(false);
            }
          }}>
            <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sincronizar produtos
          </Button>
          <Button onClick={() => start()}>
            <Plus className="mr-1 h-4 w-4" /> Nova categoria
          </Button>
        </div>
      }
    >

      <p className="text-xs text-muted-foreground">
        As chaves reconhecidas para sincronização automática são <code>faixa</code>, <code>kimono</code>, <code>camiseta</code> e <code>rashguard</code>.
        Ao salvar ou clicar em <b>Sincronizar produtos</b>, os tamanhos das variantes são alinhados aos presets (preço, estoque e SKU são preservados quando o tamanho continua no preset).
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Chave</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tamanhos</TableHead>
                  <TableHead className="w-20 text-right">Ordem</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.category_key}</TableCell>
                    <TableCell className="font-semibold">{p.category_label}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.sizes.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{p.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => start(p)}>Editar</Button>
                      <Button size="icon" variant="ghost" className="ml-1" onClick={() => onDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing.id ? "Editar categoria" : "Nova categoria"}</CardTitle>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Chave</Label>
                <Input
                  value={editing.category_key}
                  onChange={(e) => setEditing({ ...editing, category_key: e.target.value })}
                  placeholder="kimono"
                  disabled={!!editing.id}
                />
                <p className="text-[11px] text-muted-foreground">Somente letras, números, - e _.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editing.category_label}
                  onChange={(e) => setEditing({ ...editing, category_label: e.target.value })}
                  placeholder="Kimono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <SizesEditor
              sizes={editing.sizes}
              onChange={(sizes) => setEditing({ ...editing, sizes })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={onSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

function SizesEditor({ sizes, onChange }: { sizes: string[]; onChange: (s: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (sizes.includes(v)) return;
    onChange([...sizes, v]);
    setInput("");
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sizes.length) return;
    const next = [...sizes];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>Tamanhos</Label>
      <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-14">
        {sizes.length === 0 && <span className="text-xs text-muted-foreground">Nenhum tamanho ainda.</span>}
        {sizes.map((s, i) => (
          <div key={s} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)} disabled={i === 0}>←</button>
            <span className="font-semibold">{s}</span>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)} disabled={i === sizes.length - 1}>→</button>
            <button type="button" className="text-destructive hover:text-destructive/80 ml-1" onClick={() => onChange(sizes.filter((_, k) => k !== i))}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ex.: A2, M3, GG..."
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
