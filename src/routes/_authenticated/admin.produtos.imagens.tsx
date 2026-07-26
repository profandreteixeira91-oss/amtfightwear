import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductImageStats, migrateProductImagesBatch } from "@/lib/store/product-images.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ImageIcon, Play, RefreshCw, Loader2 } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { useRef, useState } from "react";
import { toast } from "sonner";

const statsQuery = queryOptions({
  queryKey: ["store", "product-images", "stats"],
  queryFn: () => getProductImageStats(),
  refetchOnWindowFocus: false,
});

export const Route = createFileRoute("/_authenticated/admin/produtos/imagens")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: ProductImagesPage,
});

type LogEntry = { ts: number; ok: number; failed: number; sample?: string };

function ProductImagesPage() {
  const qc = useQueryClient();
  const migrate = useServerFn(migrateProductImagesBatch);
  const { data: stats } = useSuspenseQuery(statsQuery);
  const [running, setRunning] = useState<false | "batch" | "all">(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const cancelRef = useRef(false);

  const pct = stats.total > 0 ? Math.round((stats.migrated / stats.total) * 100) : 0;

  async function runOnce(limit = 25) {
    const res = await migrate({ data: { limit } });
    const firstError = res.results.find((r) => !r.ok)?.error;
    setLog((prev) =>
      [{ ts: Date.now(), ok: res.ok, failed: res.failed, sample: firstError }, ...prev].slice(0, 20),
    );
    await qc.invalidateQueries({ queryKey: ["store", "product-images", "stats"] });
    return res;
  }

  async function handleBatch() {
    setRunning("batch");
    try {
      const res = await runOnce();
      if (res.processed === 0) toast.info("Nenhuma imagem pendente");
      else toast.success(`Lote concluído: ${res.ok} ok, ${res.failed} falhas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na migração");
    } finally {
      setRunning(false);
    }
  }

  async function handleAll() {
    setRunning("all");
    cancelRef.current = false;
    try {
      let totalOk = 0;
      let totalFailed = 0;
      // Loop até esgotar
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelRef.current) break;
        const res = await runOnce(25);
        totalOk += res.ok;
        totalFailed += res.failed;
        if (res.processed === 0) break;
        if (res.processed < 25) break;
      }
      toast.success(`Migração concluída: ${totalOk} ok, ${totalFailed} falhas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na migração completa");
    } finally {
      setRunning(false);
    }
  }

  const nothingLeft = stats.pending === 0;

  return (
    <PageShell
      narrow
      title={
        <span className="inline-flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" /> Imagens dos produtos
        </span>
      }
      description="Migra as imagens hospedadas externamente para o armazenamento próprio da loja, acelerando o carregamento e removendo dependências."
    >

      <Card>
        <CardHeader>
          <CardTitle>Progresso da migração</CardTitle>
          <CardDescription>
            {stats.migrated.toLocaleString("pt-BR")} de {stats.total.toLocaleString("pt-BR")} imagens já armazenadas localmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Progress value={pct} />
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-primary">{pct}% concluído</span>
              <span className="text-muted-foreground">Pendentes: {stats.pending.toLocaleString("pt-BR")}</span>
              <span className="text-muted-foreground">Total: {stats.total.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleBatch} disabled={!!running || nothingLeft} variant="outline">
              {running === "batch" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Migrar próximo lote (25)
            </Button>
            <Button onClick={handleAll} disabled={!!running || nothingLeft}>
              {running === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Migrar tudo
            </Button>
            {running === "all" && (
              <Button variant="ghost" onClick={() => (cancelRef.current = true)}>
                Parar
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => qc.invalidateQueries({ queryKey: ["store", "product-images", "stats"] })}
              disabled={!!running}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
          </div>

          {nothingLeft && (
            <p className="text-sm text-primary">Todas as imagens já foram migradas ✓</p>
          )}
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {log.map((e) => (
                <li key={e.ts} className="flex flex-wrap items-center gap-3 rounded border p-2">
                  <span className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleTimeString("pt-BR")}</span>
                  <span className="font-medium text-primary">{e.ok} ok</span>
                  {e.failed > 0 && <span className="font-medium text-destructive">{e.failed} falha(s)</span>}
                  {e.sample && <span className="text-xs text-muted-foreground">último erro: {e.sample}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
