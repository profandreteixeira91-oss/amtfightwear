import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, BrainCircuit, TrendingUp, AlertTriangle, Lightbulb, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsManager } from "../AdsManagerContext";
import { adsAiAnalyzeAccount } from "@/lib/ads/ads-ai.functions";
import { amListAccounts } from "@/lib/ads/ads-manager.functions";
import ReactMarkdown from "react-markdown";

export function AdsAiAgent() {
  const { accountId, setAccountId, range } = useAdsManager();
  const analyze = useServerFn(adsAiAnalyzeAccount);
  const listAccounts = useServerFn(amListAccounts);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Se não houver conta selecionada, tenta selecionar a primeira ativa automaticamente
  useEffect(() => {
    if (!accountId) {
      listAccounts().then(accounts => {
        const active = accounts.find(a => a.active);
        if (active) setAccountId(active.id);
        else if (accounts.length > 0) setAccountId(accounts[0].id);
      }).catch(console.error);
    }
  }, [accountId, setAccountId, listAccounts]);

  const { data, refetch, isFetching, error } = useQuery({
    queryKey: ["ads-ai-analysis", accountId, range.since, range.until],
    queryFn: async () => {
      try {
        console.log("[AdsAiAgent] Starting analysis for account:", accountId);
        const result = await analyze({ data: { accountId: accountId!, since: range.since, until: range.until } });
        console.log("[AdsAiAgent] Analysis complete:", result);
        return result;
      } catch (err) {
        console.error("[AdsAiAgent] Error in analyze function:", err);
        throw err;
      }
    },
    enabled: !!accountId,
    staleTime: 30 * 60_000, // 30 min
    retry: false, // Don't retry automatically to avoid looping errors
  });

  const loading = isFetching || isAnalyzing;

  if (!accountId) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">Buscando conta de anúncios...</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aguarde enquanto localizamos sua conta conectada para ativar o Agente IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Coluna de Status/Insights Rápidos */}
      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">IA Ativa</span>
            </div>
            <CardTitle className="text-lg">AMT Ads Agent</CardTitle>
            <CardDescription>Otimização inteligente de tráfego.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Precisão da Análise</span>
                <span className="text-[10px] font-bold text-primary">94%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[94%] bg-primary transition-all" />
              </div>
            </div>
            
            <Button 
              className="w-full gap-2 bg-primary hover:bg-primary/90" 
              onClick={() => refetch()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              Nova Consultoria IA
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickInsight icon={TrendingUp} color="text-green-500" label="Escalar Campanha X" />
            <QuickInsight icon={AlertTriangle} color="text-yellow-500" label="Frequência Alta em Y" />
            <QuickInsight icon={Lightbulb} color="text-blue-500" label="Novo Público Lookalike" />
          </CardContent>
        </Card>
      </div>

      {/* Coluna de Relatório Detalhado */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="text-base">Análise e Recomendações</CardTitle>
            <CardDescription>Insights gerados via OpenRouter (DeepSeek v3)</CardDescription>
          </div>
          {data?.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              Última atualização: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-destructive">Erro na Consultoria</h4>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {(error as Error)?.message || "Não foi possível gerar a análise agora."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar Novamente
                </Button>
              </div>
            ) : data?.analysis ? (
              <article className="prose prose-sm prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-primary prose-code:text-primary">
                <ReactMarkdown>{data.analysis}</ReactMarkdown>
              </article>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
                <BrainCircuit className="mb-4 h-12 w-12" />
                <p>Clique em "Nova Consultoria" para iniciar a análise.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickInsight({ icon: Icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2 text-xs transition-colors hover:bg-muted/50">
      <div className={`rounded p-1.5 bg-muted ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}
