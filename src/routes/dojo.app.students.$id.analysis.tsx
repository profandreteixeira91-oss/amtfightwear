import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Activity, CalendarDays, Dumbbell, GraduationCap, Trophy, Video,
  Target, HeartPulse, Users2, FileDown, TrendingUp, ClipboardList, User as UserIcon,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import {
  getAthleteOverview, getAthleteAttendance, getAthletePerformanceScore,
  getAthletePhysical, getAthleteTechnical, getAthleteGraduations,
  getAthleteCompetitions, getAthleteVideos, getAthleteInsights,
  compareAthletes, listAthletesForCompare,
} from "@/lib/dojo/athlete-analysis.functions";
import { PerformanceGauge } from "@/components/dojo/athlete-analysis/PerformanceGauge";
import { AttendanceHeatmap } from "@/components/dojo/athlete-analysis/AttendanceHeatmap";
import { TechnicalRadar } from "@/components/dojo/athlete-analysis/TechnicalRadar";
import { TechnicalTab } from "@/components/dojo/athlete-analysis/TechnicalTab";
import { InsightCard } from "@/components/dojo/athlete-analysis/InsightCard";
import { GoalsTab } from "@/components/dojo/athlete-analysis/GoalsTab";
import { formatDegree, degreeUnit } from "@/lib/dojo/degree-label";

export const Route = createFileRoute("/dojo/app/students/$id/analysis")({
  head: () => ({ meta: [{ title: "Análise Individual — AMT Dojo Manager" }] }),
  component: AnalysisPage,
});

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return String(v); }
}
function age(birth?: string | null) {
  if (!birth) return null;
  const d = new Date(birth);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function AnalysisPage() {
  const { id } = useParams({ from: "/dojo/app/students/$id/analysis" });

  const overviewFn = useServerFn(getAthleteOverview);
  const attFn = useServerFn(getAthleteAttendance);
  const scoreFn = useServerFn(getAthletePerformanceScore);
  const physFn = useServerFn(getAthletePhysical);
  const techFn = useServerFn(getAthleteTechnical);
  const gradFn = useServerFn(getAthleteGraduations);
  const compFn = useServerFn(getAthleteCompetitions);
  const vidFn = useServerFn(getAthleteVideos);
  const insFn = useServerFn(getAthleteInsights);

  const overview = useQuery({ queryKey: ["athlete", id, "overview"], queryFn: () => overviewFn({ data: { studentId: id } }) });
  const attendance = useQuery({ queryKey: ["athlete", id, "att"], queryFn: () => attFn({ data: { studentId: id, days: 365 } }) });
  const score = useQuery({ queryKey: ["athlete", id, "score"], queryFn: () => scoreFn({ data: { studentId: id } }) });
  const physical = useQuery({ queryKey: ["athlete", id, "phys"], queryFn: () => physFn({ data: { studentId: id } }) });
  const technical = useQuery({ queryKey: ["athlete", id, "tech"], queryFn: () => techFn({ data: { studentId: id } }) });
  const grads = useQuery({ queryKey: ["athlete", id, "grads"], queryFn: () => gradFn({ data: { studentId: id } }) });
  const comps = useQuery({ queryKey: ["athlete", id, "comps"], queryFn: () => compFn({ data: { studentId: id } }) });
  const videos = useQuery({ queryKey: ["athlete", id, "vids"], queryFn: () => vidFn({ data: { studentId: id } }) });
  const insights = useQuery({ queryKey: ["athlete", id, "ins"], queryFn: () => insFn({ data: { studentId: id } }) });

  const s = overview.data?.student as any;
  const belt = overview.data?.belt as any;

  return (
    <PageShell
      eyebrow={
        <Link to="/dojo/app/students/$id" params={{ id }} className="inline-flex items-center gap-1 hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Voltar à ficha
        </Link>
      }
      title="Análise Individual do Atleta"
      description="Centro completo de performance esportiva — dados consolidados de todos os módulos"
      actions={
        <Button variant="outline" onClick={() => window.print()}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar / Imprimir
        </Button>
      }
    >
      {/* HERO do atleta */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {s?.photo_url ? (
            <img src={s.photo_url} alt={s.full_name} className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/30" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted text-2xl font-bold text-muted-foreground">
              {s?.full_name?.slice(0, 2).toUpperCase() ?? "—"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{s?.full_name ?? <Skeleton className="h-7 w-40" />}</h2>
              {s?.status && <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {age(s?.birth_date) != null && <span>{age(s?.birth_date)} anos</span>}
              {s?.gender && <span className="capitalize">{s.gender}</span>}
              {belt && <span>{belt.name} · {formatDegree(s?.current_degree ?? 0, belt.modality, belt.name)}</span>}
              {overview.data?.classes?.[0]?.dojo_classes && <span>Turma: {(overview.data.classes[0] as any).dojo_classes.name}</span>}
              <span>Matrícula: {fmtDate(s?.created_at)}</span>
            </div>
          </div>
          {belt && (
            <div className="w-full max-w-[240px]">
              <BeltAuto belt={belt} degree={s?.current_degree ?? 0} />
              {s?.current_degree ? <div className="mt-1 text-center text-xs text-muted-foreground">{s.current_degree}º {degreeUnit(belt.modality)}</div> : null}
            </div>
          )}
        </div>
      </div>

      {/* Cartões de indicadores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Activity} label="Check-ins (365d)" value={attendance.data?.totalPresent ?? "—"} hint={`${attendance.data?.distinctDays ?? 0} dias distintos`} loading={attendance.isLoading} />
        <StatCard icon={TrendingUp} label="Maior sequência" value={attendance.data?.maxStreak ?? "—"} hint="dias consecutivos" loading={attendance.isLoading} />
        <StatCard icon={GraduationCap} label="Graduações" value={grads.data?.history.length ?? "—"} hint={grads.data?.nextForecast ? `Próxima ~ ${fmtDate(grads.data.nextForecast)}` : "Sem previsão"} loading={grads.isLoading} />
        <StatCard icon={Trophy} label="Competições" value={comps.data?.totals.competitions ?? "—"} hint={comps.data ? `${comps.data.totals.gold}🥇 ${comps.data.totals.silver}🥈 ${comps.data.totals.bronze}🥉` : ""} loading={comps.isLoading} />
      </div>

      {/* Score + Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Índice Geral de Performance" description="Calculado automaticamente a partir dos dados do atleta">
          {score.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : score.data ? (
            <>
              <PerformanceGauge score={score.data.score} label={score.data.label} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {Object.entries(score.data.breakdown).map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border/40 bg-muted/20 p-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                    <div className="text-sm font-bold">{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </SectionCard>

        <SectionCard title="Inteligência Analítica" description="Insights automáticos" className="lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {insights.isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
            {insights.data?.insights.map((it, i) => <InsightCard key={i} {...it} />)}
            {insights.data && insights.data.insights.length === 0 && (
              <div className="text-sm text-muted-foreground">Sem alertas no momento. Bom trabalho!</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Tabs detalhadas */}
      <Tabs defaultValue="frequencia" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/30 p-1">
          <TabsTrigger value="frequencia"><CalendarDays className="mr-1 h-4 w-4" />Frequência</TabsTrigger>
          <TabsTrigger value="fisico"><HeartPulse className="mr-1 h-4 w-4" />Físico</TabsTrigger>
          <TabsTrigger value="tecnico"><Target className="mr-1 h-4 w-4" />Técnico</TabsTrigger>
          <TabsTrigger value="graduacoes"><GraduationCap className="mr-1 h-4 w-4" />Graduações</TabsTrigger>
          <TabsTrigger value="competicoes"><Trophy className="mr-1 h-4 w-4" />Competições</TabsTrigger>
          <TabsTrigger value="videos"><Video className="mr-1 h-4 w-4" />Vídeos</TabsTrigger>
          <TabsTrigger value="metas"><Dumbbell className="mr-1 h-4 w-4" />Metas</TabsTrigger>
          <TabsTrigger value="lesoes"><ClipboardList className="mr-1 h-4 w-4" />Lesões</TabsTrigger>
          <TabsTrigger value="comparar"><Users2 className="mr-1 h-4 w-4" />Comparar</TabsTrigger>
        </TabsList>

        <TabsContent value="frequencia" className="mt-4 space-y-4">
          <SectionCard title="Heatmap anual de frequência" description="Últimos 365 dias">
            {attendance.isLoading ? <Skeleton className="h-24 w-full" /> :
              <AttendanceHeatmap data={attendance.data?.heatmap ?? []} />}
          </SectionCard>
          <SectionCard title="Distribuição por dia da semana">
            <div className="grid grid-cols-7 gap-2 text-center">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => {
                const v = attendance.data?.weekday?.[i] ?? 0;
                const max = Math.max(1, ...(attendance.data?.weekday ?? [1]));
                return (
                  <div key={d} className="rounded-md border border-border/40 bg-muted/20 p-2">
                    <div className="text-xs font-semibold">{d}</div>
                    <div className="mx-auto mt-1 h-16 w-full rounded-sm bg-muted overflow-hidden flex items-end">
                      <div className="w-full bg-primary" style={{ height: `${(v / max) * 100}%` }} />
                    </div>
                    <div className="mt-1 text-xs font-bold">{v}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fisico" className="mt-4">
          <SectionCard title="Evolução Física" description="Dados atuais do atleta">
            {physical.data ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricBox label="Peso" value={physical.data.current.weight ? `${physical.data.current.weight} kg` : "—"} />
                <MetricBox label="Altura" value={physical.data.current.height ? `${physical.data.current.height} cm` : "—"} />
                <MetricBox label="IMC" value={physical.data.current.imc ?? "—"} />
              </div>
            ) : <Skeleton className="h-24" />}
            <div className="mt-4 rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Histórico detalhado (percentual de gordura, circunferências, massa muscular) será liberado com o módulo de avaliações físicas dedicado — em breve.
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="tecnico" className="mt-4 space-y-4">
          <TechnicalTab studentId={id} />
          <SectionCard title="Avaliações formais (histórico)" description="Sessões concluídas no módulo Avaliações">
            {(technical.data?.sessions?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma avaliação concluída.</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {technical.data!.sessions.map((sess: any) => (
                  <li key={sess.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium">{sess.dojo_evaluations?.title ?? "Avaliação"}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(sess.finished_at)}</div>
                    </div>
                    <Badge variant={sess.result === "approved" ? "default" : "outline"}>{Number(sess.percentage).toFixed(1)}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>


        <TabsContent value="graduacoes" className="mt-4">
          <SectionCard title="Timeline de Graduações" description={grads.data?.nextForecast ? `Próxima prevista: ${fmtDate(grads.data.nextForecast)}` : undefined}>
            {(grads.data?.history?.length ?? 0) === 0 ? (
              <EmptyState title="Sem graduações registradas" description="Registre a primeira graduação no perfil do aluno." icon={GraduationCap} />
            ) : (
              <ol className="relative space-y-3 border-l border-border/60 pl-4">
                {grads.data!.history.map((g: any) => (
                  <li key={g.id} className="relative">
                    <span className="absolute -left-[21px] top-2 h-3 w-3 rounded-full" style={{ background: g.dojo_belts?.color_hex ?? "#000" }} />
                    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3">
                      <div className="w-24 shrink-0"><BeltAuto belt={g.dojo_belts} degree={g.degree} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{g.dojo_belts?.name}{g.degree ? ` · ${g.degree}º ${degreeUnit(g.dojo_belts?.modality)}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(g.graduation_date)} {g.evaluator ? `· ${g.evaluator}` : ""}</div>
                        {g.notes && <div className="mt-1 text-xs">{g.notes}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="competicoes" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Trophy} label="Disputadas" value={comps.data?.totals.competitions ?? "—"} />
            <StatCard icon={TrendingUp} label="Vitórias" value={comps.data?.totals.wins ?? "—"} />
            <StatCard icon={Activity} label="Derrotas" value={comps.data?.totals.losses ?? "—"} />
            <StatCard icon={Target} label="Pontos" value={comps.data?.totals.points ?? "—"} />
          </div>
          <SectionCard title="Histórico completo">
            {(comps.data?.list?.length ?? 0) === 0 ? (
              <EmptyState title="Sem competições" description="Inscreva o atleta em uma competição para começar." icon={Trophy} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Competição</th><th>Data</th><th>Categoria</th><th>Peso</th><th>Faixa</th><th>Resultado</th><th>V/D/E</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {comps.data!.list.map((c: any) => (
                      <tr key={c.athlete_id}>
                        <td className="py-2 font-medium">{c.competition_name}</td>
                        <td>{fmtDate(c.competition_start_at)}</td>
                        <td>{c.category ?? "—"}</td>
                        <td>{c.weight_kg ? `${c.weight_kg} kg` : c.weight_class ?? "—"}</td>
                        <td>{c.belt_name ?? "—"}</td>
                        <td>
                          {c.medal ? <Badge>{c.medal}</Badge> : c.placement ? `${c.placement}º` : "—"}
                        </td>
                        <td className="tabular-nums">{c.wins ?? 0}/{c.losses ?? 0}/{c.draws ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <SectionCard title="Biblioteca de Vídeos" description="Progresso do atleta">
            {(videos.data?.progress?.length ?? 0) === 0 ? (
              <EmptyState title="Sem vídeos assistidos" description="O aluno ainda não iniciou nenhum vídeo do dojo." icon={Video} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.data!.progress.map((p: any) => (
                  <div key={p.video_id} className="overflow-hidden rounded-xl border border-border/40 bg-card">
                    {p.dojo_videos?.thumbnail_url ? (
                      <img src={p.dojo_videos.thumbnail_url} alt="" className="h-32 w-full object-cover" />
                    ) : <div className="h-32 w-full bg-muted" />}
                    <div className="p-3">
                      <div className="truncate text-sm font-medium">{p.dojo_videos?.title ?? "—"}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(p.percent) || 0)}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{Math.round(Number(p.percent) || 0)}% assistido</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="metas" className="mt-4">
          <GoalsTab studentId={id} />
        </TabsContent>

        <TabsContent value="lesoes" className="mt-4">
          <ComingSoon icon={ClipboardList} title="Histórico de lesões" description="Registro de lesões, retorno previsto e timeline clínica em breve." />
        </TabsContent>

        <TabsContent value="comparar" className="mt-4">
          <CompareTab currentId={id} currentName={s?.full_name ?? "Atleta atual"} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function MetricBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ComingSoon({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <SectionCard title={title}>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 p-8 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div className="font-semibold">{title}</div>
        <div className="max-w-md text-sm text-muted-foreground">{description}</div>
        <Badge variant="outline" className="mt-2">Em breve</Badge>
      </div>
    </SectionCard>
  );
}

function CompareTab({ currentId, currentName }: { currentId: string; currentName: string }) {
  const [otherId, setOtherId] = useState<string>("");
  const listFn = useServerFn(listAthletesForCompare);
  const cmpFn = useServerFn(compareAthletes);
  const list = useQuery({ queryKey: ["athlete", "list-for-compare"], queryFn: () => listFn({}) });
  const cmp = useQuery({
    queryKey: ["athlete", "compare", currentId, otherId],
    queryFn: () => cmpFn({ data: { a: currentId, b: otherId } }),
    enabled: !!otherId,
  });

  const others = useMemo(() => (list.data ?? []).filter((s) => s.id !== currentId), [list.data, currentId]);

  return (
    <SectionCard title="Comparar atletas" description={`Comparando ${currentName} com outro aluno`}>
      <div className="mb-4 max-w-md">
        <Select value={otherId} onValueChange={setOtherId}>
          <SelectTrigger><SelectValue placeholder="Selecione o segundo atleta" /></SelectTrigger>
          <SelectContent>
            {others.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!otherId && <div className="text-sm text-muted-foreground">Escolha um atleta acima para comparar lado a lado.</div>}
      {otherId && cmp.data && (
        <div className="grid gap-4 md:grid-cols-2">
          {[cmp.data.a, cmp.data.b].map((x: any, i: number) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                {x.student?.photo_url ? <img src={x.student.photo_url} className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-muted" />}
                <div>
                  <div className="font-semibold">{x.student?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{x.student?.dojo_belts?.name}</div>
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                <CmpRow label="Frequência (90d)" value={x.frequencia90d} />
                <CmpRow label="Última avaliação" value={`${Number(x.ultimaAvaliacao).toFixed(1)}%`} />
                <CmpRow label="Competições" value={x.competicoes} />
                <CmpRow label="Vitórias" value={x.vitorias} />
                <CmpRow label="🥇 / 🥈 / 🥉" value={`${x.ouro} / ${x.prata} / ${x.bronze}`} />
                <CmpRow label="Graduações" value={x.graduacoes} />
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function CmpRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
