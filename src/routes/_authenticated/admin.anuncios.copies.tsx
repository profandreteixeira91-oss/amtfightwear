import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trash2, MessageSquare, Copy as CopyIcon } from "lucide-react";
import { listCopies, toggleCopyFavorite, deleteCopy } from "@/lib/ads/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/anuncios/copies")({
  head: () => ({ meta: [{ title: "Biblioteca de Copies — Tráfego Pago IA" }] }),
  component: CopiesPage,
});

function CopiesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCopies);
  const fav = useServerFn(toggleCopyFavorite);
  const del = useServerFn(deleteCopy);

  const { data, isLoading } = useQuery({
    queryKey: ["ads", "copies"],
    queryFn: () => list(),
  });

  const favMut = useMutation({
    mutationFn: (p: { id: string; value: boolean }) => fav({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads", "copies"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Copy removida");
      qc.invalidateQueries({ queryKey: ["ads", "copies"] });
    },
  });

  return (
    <>
      <PageHeader eyebrow="Tráfego Pago IA" title="Biblioteca de Copies" description="Todas as copies geradas pela IA. Favorite as melhores." />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nenhuma copy ainda" description="Gere copies em Nova Campanha IA." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <Badge>Nota {c.quality_score ? Number(c.quality_score).toFixed(1) : "—"}/10</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => favMut.mutate({ id: c.id, value: !c.is_favorite })}>
                    <Star className={`h-4 w-4 ${c.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${c.headline}\n\n${c.primary_text}`); toast.success("Copiada"); }}>
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="font-semibold">{c.headline}</div>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.primary_text}</p>
              {c.cta && <div className="mt-2 text-xs"><span className="font-semibold">CTA:</span> {c.cta}</div>}
              <div className="mt-2 flex flex-wrap gap-1">
                {(c.triggers ?? []).map((t: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
