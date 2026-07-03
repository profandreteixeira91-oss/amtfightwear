import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Pause, Sparkles, RefreshCw, Wand2, Trophy } from "lucide-react";
import {
  listWinners,
  listScaleHistory,
  runScaleNow,
  suggestFromWinners,
  backfillWinnerEmbeddings,
} from "@/lib/ads/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ads/scale")({
  head: () => ({ meta: [{ title: "Escala IA — Tráfego Pago" }] }),
  component: ScalePage,
});

function ScalePage() {
  const qc = useQueryClient();
  const listWinnersFn = useServerFn(listWinners);
  const listScaleFn = useServerFn(listScaleHistory);
  const runFn = useServerFn(runScaleNow);
  const suggestFn = useServerFn(suggestFromWinners);
  const backfillFn = useServerFn(backfillWinnerEmbeddings);

  const winners = useQuery({ queryKey: ["ads-winners"], queryFn: () => listWinnersFn() });
  const history = useQuery({
    queryKey: ["ads-scale-history"],
    queryFn: () => listScaleFn({ data: {} }),
  });

  const run = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (r) => {
      toast.success(`${r.decisions.length} decisões geradas em ${r.evaluated} campanhas`);
      qc.invalidateQueries({ queryKey: ["ads-scale-history"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao executar"),
  });

  const backfill = useMutation({
    mutationFn: () => backfillFn(),
    onSuccess: (r) => {
      toast.success(`${r.created} criativos vencedores indexados`);
      qc.invalidateQueries({ queryKey: ["ads-winners"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const [productName, setProductName] = useState("");
  const [objective, setObjective] = useState("sales");
  const [angle, setAngle] = useState("");
  const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
  const [inspirations, setInspirations] = useState<Array<{ content: string; roas: number | null }>>([]);

  const suggest = useMutation({
    mutationFn: () =>
      suggestFn({ data: { productName, objective, angle: angle || null } }),
    onSuccess: (r) => {
      const parsed = r.suggestionJson ? (JSON.parse(r.suggestionJson) as Record<string, unknown>) : null;
      setSuggestion(parsed);
      setInspirations(r.inspirations as Array<{ content: string; roas: number | null }>);
      if (!parsed) toast.info(r.note ?? "Sem sugestão disponível");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Trophy}
        title="Escala IA & Aprendizado de Vencedores"
        description="A IA escala automaticamente campanhas com ROAS ≥ 3x, pausa perdedoras e aprende com os criativos vencedores para gerar novas variações."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => backfill.mutate()} disabled={backfill.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              Indexar vencedores
            </Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${run.isPending ? "animate-spin" : ""}`} />
              Executar escala agora
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Criativos vencedores"
          description="Anúncios que a IA marcou como vencedores (ROAS ≥ 2x)."
        >
          {winners.isLoading ? (
            <Skeleton className="h-32" />
          ) : (winners.data?.copies?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Ainda sem vencedores"
              description="Publique campanhas, sincronize métricas e a IA identificará seus vencedores automaticamente."
            />
          ) : (
            <div className="space-y-3">
              {winners.data?.copies?.slice(0, 8).map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{c.headline}</p>
                    <Badge variant="secondary">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {Number(c.winner_score ?? 0).toFixed(2)}x
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {c.primary_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Histórico de escala"
          description="Ajustes automáticos aplicados nas suas campanhas."
        >
          {history.isLoading ? (
            <Skeleton className="h-32" />
          ) : (history.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="Nenhum ajuste ainda"
              description="Assim que suas campanhas tiverem dados suficientes, a IA começará a escalar automaticamente."
            />
          ) : (
            <div className="space-y-2">
              {history.data?.slice(0, 10).map((h) => {
                const Icon =
                  h.action === "scale_up"
                    ? TrendingUp
                    : h.action === "scale_down"
                    ? TrendingDown
                    : Pause;
                const color =
                  h.action === "scale_up"
                    ? "text-emerald-600"
                    : h.action === "pause"
                    ? "text-red-600"
                    : "text-amber-600";
                return (
                  <div key={h.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Icon className={`h-4 w-4 mt-0.5 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {(h.ads_campaigns as { name?: string } | null)?.name ?? "Campanha"}
                      </p>
                      <p className="text-xs text-muted-foreground">{h.reason}</p>
                      <p className="text-xs mt-1">
                        R$ {Number(h.previous_budget ?? 0).toFixed(2)} →{" "}
                        <span className="font-semibold">
                          R$ {Number(h.new_budget ?? 0).toFixed(2)}
                        </span>
                        {" · "}
                        {new Date(h.created_at as string).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Gerar novo criativo inspirado nos vencedores"
        description="A IA busca semanticamente os anúncios de maior ROAS e usa como referência para criar uma nova variação."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Luvas de Muay Thai"
            />
          </div>
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ângulo (opcional)</Label>
            <Input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="Ex: iniciantes"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => suggest.mutate()}
            disabled={!productName || suggest.isPending}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Sugerir criativo com IA
          </Button>
        </div>

        {inspirations.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-semibold">Referências utilizadas:</p>
            {inspirations.slice(0, 3).map((it, i) => (
              <div key={i} className="text-xs rounded border p-2 bg-muted/40">
                <Badge variant="outline" className="mr-2">
                  ROAS {Number(it.roas ?? 0).toFixed(2)}x
                </Badge>
                <span className="text-muted-foreground line-clamp-2">{it.content}</span>
              </div>
            ))}
          </div>
        )}

        {suggestion && (
          <div className="mt-6 space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Nova sugestão gerada</p>
            </div>
            {typeof suggestion.headline === "string" && (
              <div>
                <Label className="text-xs">Headline</Label>
                <p className="text-sm font-medium">{suggestion.headline}</p>
              </div>
            )}
            {typeof suggestion.primary_text === "string" && (
              <div>
                <Label className="text-xs">Texto principal</Label>
                <Textarea
                  readOnly
                  value={suggestion.primary_text as string}
                  className="text-sm"
                  rows={4}
                />
              </div>
            )}
            {typeof suggestion.description === "string" && (
              <div>
                <Label className="text-xs">Descrição</Label>
                <p className="text-sm">{suggestion.description}</p>
              </div>
            )}
            {typeof suggestion.cta === "string" && (
              <Badge>{suggestion.cta}</Badge>
            )}
            {typeof suggestion.visual_prompt === "string" && (
              <div>
                <Label className="text-xs">Prompt visual sugerido</Label>
                <p className="text-xs text-muted-foreground">{suggestion.visual_prompt}</p>
              </div>
            )}
            {typeof suggestion.rationale === "string" && (
              <div>
                <Label className="text-xs">Por que deve funcionar</Label>
                <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
