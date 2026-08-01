import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Crosshair } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { num, shortDate } from "@/components/ads-manager/helpers";
import { amListPixels } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/pixel")({
  component: PixelPage,
});

function PixelPage() {
  const { accountId, refreshKey } = useAdsManager();
  const list = useServerFn(amListPixels);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "pixels", accountId, refreshKey],
    queryFn: () => list({ data: { ...(accountId ? { accountId } : {}) } }),
    retry: false,
  });

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

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardContent className="py-16 text-center">
          <Crosshair className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold">Nenhum pixel encontrado nesta conta</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {data.map((p) => (
        <Card key={p.id} className="min-w-0 border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="truncate">{p.name}</span>
              <Badge
                variant="outline"
                className={
                  p.available
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }
              >
                {p.available ? "Ativo" : "Indisponível"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3 text-sm">
            <p className="break-all font-mono text-[11px] text-muted-foreground">{p.id}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Último evento</p>
                <p className="font-semibold">{shortDate(p.lastFired)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-semibold">{shortDate(p.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Eventos
              </p>
              {p.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem eventos recentes reportados.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {p.events.map((e) => (
                    <Badge key={e.event} variant="outline" className="text-[10px]">
                      {e.event} · {num(e.count)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
