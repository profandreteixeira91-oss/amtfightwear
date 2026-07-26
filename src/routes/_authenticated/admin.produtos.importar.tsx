import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startCatalogImport, getImportJob } from "@/lib/store/import.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Download, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/admin/produtos/importar")({
  component: ImportPage,
});

function ImportPage() {
  const start = useServerFn(startCatalogImport);
  const fetchJob = useServerFn(getImportJob);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      const j = await fetchJob({ data: { id: jobId } });
      setJob(j);
      if (j?.status === "completed" || j?.status === "failed") clearInterval(iv);
    }, 2500);
    return () => clearInterval(iv);
  }, [jobId, fetchJob]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const r = await start({});
      setJobId(r.job_id);
      toast.success("Importação iniciada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const progress = job?.total_urls ? (job.processed / job.total_urls) * 100 : 0;

  return (
    <PageShell
      narrow
      title="Importar catálogo"
      description="Extrai produtos, categorias, imagens e variações do site amtfightwear.com.br via Firecrawl + IA."
    >

      <Card>
        <CardHeader>
          <CardTitle>Fonte: amtfightwear.com.br</CardTitle>
          <CardDescription>A importação roda em segundo plano. Você pode fechar esta página — o progresso continua.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleStart} disabled={loading || (job && job.status === "running")}>
            <Download className="mr-2 h-4 w-4" /> {loading ? "Iniciando..." : "Iniciar importação"}
          </Button>

          {job && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
                <div className="text-sm font-bold">{job.status}</div>
                {job.status === "running" && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
              </div>
              <Progress value={progress} />
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <Stat label="Total" v={job.total_urls} />
                <Stat label="Processados" v={job.processed} />
                <Stat label="Sucesso" v={job.succeeded} c="text-emerald-600" />
                <Stat label="Falhas" v={job.failed} c="text-destructive" />
              </div>
              {job.error_message && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{job.error_message}</div>
              )}
              {job.log && Array.isArray(job.log) && job.log.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-[11px]">
                  {[...(job.log as any[])].reverse().map((l: any, i: number) => (
                    <div key={i} className="border-b border-border/50 py-1 last:border-0">
                      <span className="text-muted-foreground">{new Date(l.t).toLocaleTimeString()}</span> — {l.msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Stat({ label, v, c }: { label: string; v: number; c?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-black ${c ?? ""}`}>{v}</div>
    </div>
  );
}
