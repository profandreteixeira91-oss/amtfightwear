import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { amListCreatives } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/criativos")({
  component: CreativesPage,
});

function CreativesPage() {
  const { accountId, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListCreatives);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "creatives", accountId, refreshKey],
    queryFn: () => list({ data: { ...(accountId ? { accountId } : {}) } }),
    retry: false,
  });

  const q = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.id.includes(q) || c.type.toLowerCase().includes(q),
      ),
    [data, q],
  );

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 break-words text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <Badge variant="outline">{rows.length} criativo(s)</Badge>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="py-16 text-center">
            <ImageOff className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold">Nenhum criativo encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Criativos aparecem aqui após serem usados em anúncios da conta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {rows.map((c) => (
            <Card key={c.id} className="min-w-0 overflow-hidden border-border/60 bg-card/60">
              {c.thumbnail ? (
                <img
                  src={c.thumbnail}
                  alt={c.name}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center bg-muted/40">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="min-w-0 p-3">
                <p className="truncate text-sm font-semibold" title={c.name}>
                  {c.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {c.title ?? c.body ?? "sem texto"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {c.type}
                  </Badge>
                  {c.cta && (
                    <Badge variant="outline" className="text-[10px]">
                      {c.cta}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
