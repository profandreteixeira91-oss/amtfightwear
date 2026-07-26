import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Wand2, Trash2 } from "lucide-react";
import { listCreatives, deleteCreative } from "@/lib/ads/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/anuncios/criativos")({
  head: () => ({ meta: [{ title: "Banco de Criativos — Tráfego Pago IA" }] }),
  component: CreativesPage,
});

function CreativesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCreatives);
  const del = useServerFn(deleteCreative);
  const { data, isLoading } = useQuery({
    queryKey: ["ads", "creatives"],
    queryFn: () => list(),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Criativo removido");
      qc.invalidateQueries({ queryKey: ["ads", "creatives"] });
    },
  });

  return (
    <>
      <PageHeader eyebrow="Tráfego Pago IA" title="Banco de Criativos" description="Imagens e artes geradas pela IA para reutilizar em novas campanhas." />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Wand2} title="Nenhum criativo ainda" description="Gere criativos em Nova Campanha IA." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-md border">
              {c.image_url && <img src={c.image_url} alt={c.prompt ?? "criativo"} className="aspect-square w-full object-cover" />}
              <div className="flex items-center justify-between p-2 text-xs">
                <span className="truncate text-muted-foreground">{c.format}</span>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
