import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListFavoriteLists, dsCreateFavoriteList, dsToggleFavorite } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/store/favoritos")({ component: FavoritesPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FavoritesPage() {
  const listFn = useServerFn(dsListFavoriteLists);
  const createFn = useServerFn(dsCreateFavoriteList);
  const toggleFn = useServerFn(dsToggleFavorite);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "favs"], queryFn: () => listFn() });
  const [name, setName] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-store", "favs"] });
  const create = useMutation({
    mutationFn: () => createFn({ data: { name: name.trim() } }),
    onSuccess: () => { toast.success("Lista criada"); setName(""); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const rm = useMutation({
    mutationFn: (v: { product_id: string; list_id: string | null }) => toggleFn({ data: v }),
    onSuccess: refresh,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const lists = data?.lists ?? [];
  const favs = data?.favorites ?? [];
  const grouped: Record<string, any[]> = { _default: [] };
  lists.forEach((l: any) => (grouped[l.id] = []));
  favs.forEach((f: any) => {
    const key = f.list_id ?? "_default";
    (grouped[key] = grouped[key] ?? []).push(f);
  });

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="text-sm font-semibold">Nova lista</div>
        <div className="mt-2 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reposição, Uniformes, Faixas…" />
          <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Criar</Button>
        </div>
      </Card>

      <Section title="Sem lista" items={grouped._default} onRemove={(p) => rm.mutate({ product_id: p.id, list_id: null })} />
      {lists.map((l: any) => (
        <Section key={l.id} title={l.name} items={grouped[l.id] ?? []} onRemove={(p) => rm.mutate({ product_id: p.id, list_id: l.id })} />
      ))}
    </div>
  );
}

function Section({ title, items, onRemove }: { title: string; items: any[]; onRemove: (p: any) => void }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title} <span className="text-xs text-muted-foreground">({items.length})</span></h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((f) => (
          <Card key={f.id} className="overflow-hidden">
            <Link to="/dojo/app/store/produtos/$slug" params={{ slug: f.product?.slug ?? "" }}>
              <div className="aspect-square bg-muted overflow-hidden">
                {f.product?.image_url ? <img src={f.product.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
            </Link>
            <div className="p-2">
              <div className="truncate text-xs font-medium">{f.product?.name}</div>
              <div className="text-sm font-bold">{brl(Number(f.product?.price ?? 0))}</div>
              <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-xs" onClick={() => onRemove(f.product)}>
                <Heart className="mr-1 h-3 w-3 fill-current" /> Remover
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
