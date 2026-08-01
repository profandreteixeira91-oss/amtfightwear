import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { STAGE_LABEL, formatDuration } from "@/lib/store/production-stages";
import type { Stage } from "@/lib/store/production-stages";
import type { ProductionAnalytics } from "@/lib/store/production.functions";
import { formatBR } from "@/lib/dates";

/** Painel de desempenho: tempos médios, gargalos, eficiência e volume. */
export function ProductionPerformance({ data }: { data?: ProductionAnalytics }) {
  if (!data) {
    return <p className="text-sm text-muted-foreground">Carregando indicadores…</p>;
  }
  const maxStage = Math.max(1, ...data.stageAverages.map((s) => s.avgSeconds));
  const totalDeadline = data.onTime + data.late;
  const onTimeRate = totalDeadline ? (data.onTime / totalDeadline) * 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tempo médio por etapa (gargalos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.stageAverages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem etapas concluídas ainda.</p>
          ) : (
            data.stageAverages.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{STAGE_LABEL[s.stage as Stage] ?? s.stage}</span>
                  <span className="text-muted-foreground">
                    {formatDuration(s.avgSeconds)} · {s.completed} passagens
                  </span>
                </div>
                <Progress value={(s.avgSeconds / maxStage) * 100} className="mt-1 h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Eficiência por colaborador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.assigneeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etapa com responsável registrada.</p>
          ) : (
            data.assigneeStats.map((a) => (
              <div
                key={a.assignee}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {a.assignee.slice(0, 1).toUpperCase()}
                  </span>
                  {a.assignee}
                </span>
                <span className="text-muted-foreground">
                  {a.completed} etapas · média {formatDuration(a.avgSeconds)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produção por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {data.perDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem itens finalizados nos últimos 30 dias.</p>
          ) : (
            <div className="flex h-40 items-end gap-1.5">
              {data.perDay.map((d) => {
                const max = Math.max(...data.perDay.map((x) => x.pieces), 1);
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${formatBR(d.day)}: ${d.pieces} peças`}>
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${Math.max(4, (d.pieces / max) * 120)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{d.day.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Indicadores gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Lead time médio" value={formatDuration(data.avgLeadSeconds)} />
          <Metric label="Entregas no prazo" value={`${onTimeRate.toFixed(0)}%`} />
          <Metric label="Taxa de retrabalho" value={`${data.reworkRate.toFixed(1)}%`} />
          <Metric label="Fora do prazo" value={String(data.late)} />
          <div className="col-span-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Volume por produto</p>
            <div className="space-y-1.5">
              {data.categoryVolume.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="truncate">{c.name}</span>
                  <span className="text-muted-foreground">{c.pieces} pçs</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
