import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Activity, CalendarDays, Dumbbell, GraduationCap, Trophy, Video,
  Target, HeartPulse, Users2, FileDown, TrendingUp, ClipboardList, Flame, Zap, Award, Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { AttendanceMonthlyChart } from "@/components/dojo/athlete-analysis/AttendanceMonthlyChart";
import { EvaluationTrendChart } from "@/components/dojo/athlete-analysis/EvaluationTrendChart";
import { MedalsBreakdown } from "@/components/dojo/athlete-analysis/MedalsBreakdown";
import { CompareRadar } from "@/components/dojo/athlete-analysis/CompareRadar";
import { TechnicalTab } from "@/components/dojo/athlete-analysis/TechnicalTab";
import { InsightCard } from "@/components/dojo/athlete-analysis/InsightCard";
import { GoalsTab } from "@/components/dojo/athlete-analysis/GoalsTab";
import { formatDegree, degreeUnit, formatBeltName } from "@/lib/dojo/degree-label";

export const Route = createFileRoute("/dojo/app/students/$id/analysis")({
  head: () => ({
    meta: [
      { title: "Análise Individual do Atleta — AMT Dojo Manager" },
      { name: "description", content: "Centro completo de performance esportiva com dados consolidados, gráficos, radar técnico e comparação entre atletas." },
    ],
  }),
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

const BREAKDOWN_LABELS: Record<string, { label: string; icon: any }> = {
  frequencia: { label: "Frequência", icon: CalendarDays },
  assiduidade: { label: "Assiduidade", icon: Flame },
  avaliacoes: { label: "Avaliações", icon: Target },
  graduacoes: { label: "Graduações", icon: GraduationCap },
  competicoes: { label: "Competições", icon: Trophy },
  eventos: { label: "Eventos", icon: Zap },
};

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
      description="Centro de performance esportiva — indicadores consolidados, gráficos e inteligência analítica"
      actions={
        <Button variant="outline" onClick={() => window.print()}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar / Imprimir
        </Button>
      }
    >
      {/* HERO premium */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-[0_20px_60px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)] sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-10">
          {s?.photo_url ? (
            <img src={s.photo_url} alt={s.full_name} className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-xl ring-4 ring-primary/25 sm:h-32 sm:w-32" />
          ) : (
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-muted text-3xl font-bold text-muted-foreground ring-4 ring-primary/10 sm:h-32 sm:w-32">
              {s?.full_name?.slice(0, 2).toUpperCase() ?? "—"}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="min-w-0 truncate text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">{s?.full_name ?? <Skeleton className="h-8 w-56" />}</h2>
              {s?.status && (
                <Badge variant={s.status === "active" ? "default" : "outline"} className="uppercase tracking-widest">
                  {s.status === "active" ? "Ativo" : s.status}
                </Badge>
              )}
              {score.data && (
                <Badge className="bg-primary/15 uppercase tracking-widest text-primary hover:bg-primary/20">
                  <Sparkles className="mr-1 h-3 w-3" /> {score.data.label}
                </Badge>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {age(s?.birth_date) != null && <span className="inline-flex items-center gap-1.5"><HeartPulse className="h-4 w-4 text-primary/70" />{age(s?.birth_date)} anos</span>}
              {s?.gender && <span className="capitalize">{s.gender}</span>}
              {belt && <span className="inline-flex items-center gap-1.5"><Award className="h-4 w-4 text-primary/70" />{formatBeltName(belt.name, belt.modality)} · {formatDegree(s?.current_degree ?? 0, belt.modality, belt.name)}</span>}
              {overview.data?.classes?.[0]?.dojo_classes && <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4 text-primary/70" />{(overview.data.classes[0] as any).dojo_classes.name}</span>}
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary/70" />Matrícula {fmtDate(s?.created_at)}</span>
            </div>
            {score.data && (
              <div className="mt-6 max-w-xl">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Índice geral de performance</span>
                  <span className="text-foreground">{score.data.score}<span className="text-muted-foreground">/100</span></span>
                </div>
                <Progress value={score.data.score} className="h-2.5" />
              </div>
            )}
          </div>
          {belt && (
            <div className="w-full max-w-[220px] justify-self-center md:justify-self-end">
              <BeltAuto belt={belt} degree={s?.current_degree ?? 0} />
              {s?.current_degree ? <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{s.current_degree}º {degreeUnit(belt.modality)}</div> : null}
            </div>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} icon={Activity} label="Check-ins (365d)" value={attendance.data?.totalPresent ?? "—"} hint={`${attendance.data?.distinctDays ?? 0} dias distintos`} loading={attendance.isLoading} />
        <StatCard index={1} icon={Flame} label="Maior sequência" value={attendance.data?.maxStreak ?? "—"} hint="dias consecutivos" loading={attendance.isLoading} />
        <StatCard index={2} icon={GraduationCap} label="Graduações" value={grads.data?.history.length ?? "—"} hint={grads.data?.nextForecast ? `Próxima ~ ${fmtDate(grads.data.nextForecast)}` : "Sem previsão"} loading={grads.isLoading} />
        <StatCard index={3} icon={Trophy} label="Medalhas" value={comps.data ? comps.data.totals.gold + comps.data.totals.silver + comps.data.totals.bronze : "—"} hint={comps.data ? `${comps.data.totals.gold}🥇 ${comps.data.totals.silver}🥈 ${comps.data.totals.bronze}🥉` : ""} loading={comps.isLoading} />
      </div>

      {/* Score radial + insights + breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Índice Geral" description="Score composto de 6 dimensões">
          {score.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : score.data ? (
            <PerformanceGauge score={score.data.score} label={score.data.label} />
          ) : null}
        </SectionCard>

        <SectionCard title="Decomposição do Score" description="Contribuição por dimensão" className="lg:col-span-2">
          {score.isLoading ? (
            <div className="space-y-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : score.data ? (
            <div className="space-y-5">
              {Object.entries(score.data.breakdown).map(([k, v]) => {
                const meta = BREAKDOWN_LABELS[k] ?? { label: k, icon: Activity };
                const Icon = meta.icon;
                const val = Number(v);
                const color = val >= 80 ? "bg-emerald-500" : val >= 60 ? "bg-primary" : val >= 40 ? "bg-amber-500" : "bg-destructive";
                return (
                  <div key={k}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {meta.label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{val}<span className="text-xs">/100</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, val)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Inteligência Analítica" description="Insights automáticos gerados a partir de todos os módulos">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insights.isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          {insights.data?.insights.map((it, i) => <InsightCard key={i} {...it} />)}
          {insights.data && insights.data.insights.length === 0 && (
            <div className="text-sm text-muted-foreground">Sem alertas no momento. Bom trabalho!</div>
          )}
        </div>
      </SectionCard>

      {/* Tabs detalhadas */}
      <Tabs defaultValue="frequencia" className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto w-max min-w-full gap-1 rounded-2xl bg-muted/40 p-1.5 backdrop-blur">
            <TabsTrigger value="frequencia" className="gap-1.5 px-3 py-2 text-sm"><CalendarDays className="h-4 w-4" />Frequência</TabsTrigger>
            <TabsTrigger value="tecnico" className="gap-1.5 px-3 py-2 text-sm"><Target className="h-4 w-4" />Técnico</TabsTrigger>
            <TabsTrigger value="graduacoes" className="gap-1.5 px-3 py-2 text-sm"><GraduationCap className="h-4 w-4" />Graduações</TabsTrigger>
            <TabsTrigger value="competicoes" className="gap-1.5 px-3 py-2 text-sm"><Trophy className="h-4 w-4" />Competições</TabsTrigger>
            <TabsTrigger value="fisico" className="gap-1.5 px-3 py-2 text-sm"><HeartPulse className="h-4 w-4" />Físico</TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 px-3 py-2 text-sm"><Video className="h-4 w-4" />Vídeos</TabsTrigger>
            <TabsTrigger value="metas" className="gap-1.5 px-3 py-2 text-sm"><Dumbbell className="h-4 w-4" />Metas</TabsTrigger>
            <TabsTrigger value="lesoes" className="gap-1.5 px-3 py-2 text-sm"><ClipboardList className="h-4 w-4" />Clínico</TabsTrigger>
            <TabsTrigger value="comparar" className="gap-1.5 px-3 py-2 text-sm"><Users2 className="h-4 w-4" />Comparar</TabsTrigger>
          </TabsList>
        </div>

        {/* Frequência */}
        <TabsContent value="frequencia" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard title="Frequência mensal" description="Últimos 12 meses" className="lg:col-span-2">
              {attendance.isLoading ? <Skeleton className="h-56 w-full" /> :
                <AttendanceMonthlyChart data={attendance.data?.heatmap ?? []} months={12} />}
            </SectionCard>
            <SectionCard title="Dias da semana" description="Padrão de treino">
              <div className="grid grid-cols-7 gap-2 text-center">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => {
                  const v = attendance.data?.weekday?.[i] ?? 0;
                  const max = Math.max(1, ...(attendance.data?.weekday ?? [1]));
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="relative flex h-36 w-full items-end overflow-hidden rounded-lg bg-muted/40">
                        <div className="w-full rounded-lg bg-gradient-to-t from-primary to-primary/60 transition-all" style={{ height: `${(v / max) * 100}%` }} />
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{d}</div>
                      <div className="text-sm font-bold tabular-nums">{v}</div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Heatmap anual de frequência" description="Cada quadrado é um dia dos últimos 365 dias">
            {attendance.isLoading ? <Skeleton className="h-32 w-full" /> :
              <AttendanceHeatmap data={attendance.data?.heatmap ?? []} />}
          </SectionCard>
        </TabsContent>


        {/* Técnico */}
        <TabsContent value="tecnico" className="mt-6 space-y-6">
          <TechnicalTab studentId={id} />
          <SectionCard title="Evolução em avaliações formais" description="Aproveitamento (%) em sessões concluídas">
            {technical.isLoading ? <Skeleton className="h-56" /> :
              <EvaluationTrendChart sessions={(technical.data?.sessions ?? []) as any} />}
          </SectionCard>
          <SectionCard title="Histórico de avaliações" description="Sessões concluídas no módulo Avaliações">
            {(technical.data?.sessions?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma avaliação concluída.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="py-3 pr-4">Avaliação</th>
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4 text-right">Aproveitamento</th>
                      <th className="py-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {technical.data!.sessions.map((sess: any) => (
                      <tr key={sess.id} className="hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{sess.dojo_evaluations?.title ?? "Avaliação"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{fmtDate(sess.finished_at)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{Number(sess.percentage).toFixed(1)}%</td>
                        <td className="py-3 text-right">
                          <Badge variant={sess.result === "approved" ? "default" : "outline"}>
                            {sess.result === "approved" ? "Aprovado" : sess.result ?? "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>


        {/* Graduações */}
        <TabsContent value="graduacoes" className="mt-6">
          <SectionCard title="Timeline de Graduações" description={grads.data?.nextForecast ? `Próxima prevista: ${fmtDate(grads.data.nextForecast)}` : undefined}>
            {(grads.data?.history?.length ?? 0) === 0 ? (
              <EmptyState title="Sem graduações registradas" description="Registre a primeira graduação no perfil do aluno." icon={GraduationCap} />
            ) : (
              <ol className="relative space-y-5 border-l-2 border-border/60 pl-6">
                {grads.data!.history.map((g: any, i: number) => (
                  <li key={g.id} className="relative">
                    <span className="absolute -left-[30px] top-4 h-4 w-4 rounded-full ring-4 ring-background" style={{ background: g.dojo_belts?.color_hex ?? "#000" }} />
                    {i === 0 && <span className="absolute -left-[34px] top-3 h-6 w-6 animate-ping rounded-full opacity-30" style={{ background: g.dojo_belts?.color_hex ?? "#000" }} />}
                    <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center">
                      <div className="w-32 shrink-0"><BeltAuto belt={g.dojo_belts} degree={g.degree} /></div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="text-base font-bold sm:text-lg">{g.dojo_belts?.name}{g.degree ? ` · ${g.degree}º ${degreeUnit(g.dojo_belts?.modality)}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(g.graduation_date)} {g.evaluator ? `· Avaliador: ${g.evaluator}` : ""}</div>
                        {g.notes && <div className="mt-1 text-sm leading-relaxed">{g.notes}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>


        {/* Competições */}
        <TabsContent value="competicoes" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={0} icon={Trophy} label="Disputadas" value={comps.data?.totals.competitions ?? "—"} />
            <StatCard index={1} icon={TrendingUp} label="Vitórias" value={comps.data?.totals.wins ?? "—"} />
            <StatCard index={2} icon={Activity} label="Finalizações" value={comps.data?.totals.submissions ?? "—"} />
            <StatCard index={3} icon={Target} label="Pontos" value={comps.data?.totals.points ?? "—"} />
          </div>

          <SectionCard title="Medalhas & Cartel" description="Distribuição de resultados">
            {comps.isLoading ? <Skeleton className="h-40" /> :
              comps.data ? <MedalsBreakdown totals={comps.data.totals} /> : null}
          </SectionCard>

          <SectionCard title="Histórico completo de competições">
            {(comps.data?.list?.length ?? 0) === 0 ? (
              <EmptyState title="Sem competições" description="Inscreva o atleta em uma competição para começar." icon={Trophy} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="py-3 pr-4">Competição</th>
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4">Categoria</th>
                      <th className="py-3 pr-4">Peso</th>
                      <th className="py-3 pr-4">Faixa</th>
                      <th className="py-3 pr-4">Resultado</th>
                      <th className="py-3 text-right">V/D/E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {comps.data!.list.map((c: any) => (
                      <tr key={c.athlete_id} className="hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{c.competition_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{fmtDate(c.competition_start_at)}</td>
                        <td className="py-3 pr-4">{c.category ?? "—"}</td>
                        <td className="py-3 pr-4">{c.weight_kg ? `${c.weight_kg} kg` : c.weight_class ?? "—"}</td>
                        <td className="py-3 pr-4">{c.belt_name ?? "—"}</td>
                        <td className="py-3 pr-4">
                          {c.medal ? (
                            <Badge className={c.medal === "gold" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" : c.medal === "silver" ? "bg-slate-400/20 text-slate-700 dark:text-slate-300" : "bg-orange-600/20 text-orange-700 dark:text-orange-300"}>
                              {c.medal === "gold" ? "🥇 Ouro" : c.medal === "silver" ? "🥈 Prata" : "🥉 Bronze"}
                            </Badge>
                          ) : c.placement ? `${c.placement}º` : "—"}
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums">{c.wins ?? 0}/{c.losses ?? 0}/{c.draws ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Físico */}
        <TabsContent value="fisico" className="mt-6 space-y-6">
          <SectionCard title="Composição corporal" description="Dados atuais do atleta">
            {physical.data ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricBox label="Peso" value={physical.data.current.weight ? `${physical.data.current.weight} kg` : "—"} />
                <MetricBox label="Altura" value={physical.data.current.height ? `${physical.data.current.height} cm` : "—"} />
                <MetricBox label="IMC" value={physical.data.current.imc ?? "—"} hint={imcCategory(physical.data.current.imc)} />
              </div>
            ) : <Skeleton className="h-24" />}
          </SectionCard>
          <SectionCard title="Roadmap de evolução física">
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm leading-relaxed text-muted-foreground">
              Histórico detalhado (percentual de gordura, circunferências, massa muscular, testes físicos padronizados como VO2, flexões e agilidade) será liberado com o módulo <span className="font-semibold text-foreground">Avaliação Física</span> dedicado.
            </div>
          </SectionCard>
        </TabsContent>

        {/* Vídeos */}
        <TabsContent value="videos" className="mt-6">
          <SectionCard title="Biblioteca de Vídeos" description="Progresso do atleta na plataforma">
            {(videos.data?.progress?.length ?? 0) === 0 ? (
              <EmptyState title="Sem vídeos assistidos" description="O aluno ainda não iniciou nenhum vídeo do dojo." icon={Video} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {videos.data!.progress.map((p: any) => (
                  <div key={p.video_id} className="overflow-hidden rounded-2xl border border-border/40 bg-card transition-all hover:border-primary/40 hover:shadow-md">
                    {p.dojo_videos?.thumbnail_url ? (
                      <img src={p.dojo_videos.thumbnail_url} alt="" className="h-36 w-full object-cover" />
                    ) : <div className="h-36 w-full bg-muted" />}
                    <div className="space-y-2.5 p-4">
                      <div className="truncate text-sm font-semibold">{p.dojo_videos?.title ?? "—"}</div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${Math.min(100, Number(p.percent) || 0)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{Math.round(Number(p.percent) || 0)}% assistido</span>
                        {p.completed && <Badge variant="outline" className="text-[10px]">Completo</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="metas" className="mt-6">
          <GoalsTab studentId={id} />
        </TabsContent>

        <TabsContent value="lesoes" className="mt-6">
          <SectionCard title="Ficha clínica & lesões" description="Módulo em desenvolvimento">
            <div className="rounded-2xl border border-dashed border-border/60 p-8">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold">Registro clínico integrado</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Em breve: histórico de lesões, tempo de afastamento, retorno progressivo, prescrições de fisioterapia e assinatura eletrônica do atleta.
                </p>
                <div className="mt-6 grid gap-3 text-left text-xs sm:grid-cols-3">
                  {[
                    ["Lesões", "Registro por região corporal, data, gravidade"],
                    ["Recuperação", "Timeline de tratamento e retorno"],
                    ["Anamnese", "Histórico de saúde e condicionamento"],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                      <div className="mb-1 font-semibold">{t}</div>
                      <div className="leading-relaxed text-muted-foreground">{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="comparar" className="mt-6">
          <CompareTab currentId={id} currentName={s?.full_name ?? "Atleta atual"} />

        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function imcCategory(imc: number | null | undefined) {
  if (!imc) return undefined;
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidade";
}

function MetricBox({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/10 p-5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-black tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
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
    <div className="space-y-6">

      <SectionCard title="Comparar atletas" description={`Comparando ${currentName} com outro aluno lado a lado`}>
        <div className="max-w-md">
          <Select value={otherId} onValueChange={setOtherId}>
            <SelectTrigger><SelectValue placeholder="Selecione o segundo atleta" /></SelectTrigger>
            <SelectContent>
              {others.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {!otherId && (
        <SectionCard title="Escolha um oponente">
          <EmptyState title="Comparação lado a lado" description="Selecione outro atleta acima para gerar o radar comparativo e a tabela de indicadores." icon={Users2} />
        </SectionCard>
      )}

      {otherId && cmp.isLoading && <Skeleton className="h-72" />}

      {otherId && cmp.data && (
        <>
          <SectionCard title="Radar comparativo" description="Indicadores normalizados (0-100%)">
            <CompareRadar
              a={cmp.data.a}
              b={cmp.data.b}
              nameA={(cmp.data.a as any).student?.full_name ?? "Atleta A"}
              nameB={(cmp.data.b as any).student?.full_name ?? "Atleta B"}
            />
          </SectionCard>

          <SectionCard title="Tabela comparativa">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Indicador</th>
                    <th className="text-center">{(cmp.data.a as any).student?.full_name ?? "A"}</th>
                    <th className="text-center">{(cmp.data.b as any).student?.full_name ?? "B"}</th>
                    <th className="text-center">Vantagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    ["Frequência (90d)", "frequencia90d"],
                    ["Última avaliação (%)", "ultimaAvaliacao"],
                    ["Competições", "competicoes"],
                    ["Vitórias", "vitorias"],
                    ["Ouros", "ouro"],
                    ["Pratas", "prata"],
                    ["Bronzes", "bronze"],
                    ["Graduações", "graduacoes"],
                  ].map(([label, key]) => {
                    const va = Number((cmp.data.a as any)[key] ?? 0);
                    const vb = Number((cmp.data.b as any)[key] ?? 0);
                    const winner = va === vb ? "=" : va > vb ? "A" : "B";
                    return (
                      <tr key={key} className="hover:bg-muted/30">
                        <td className="py-2 font-medium">{label}</td>
                        <td className={`text-center tabular-nums ${winner === "A" ? "font-bold text-primary" : ""}`}>{key === "ultimaAvaliacao" ? va.toFixed(1) : va}</td>
                        <td className={`text-center tabular-nums ${winner === "B" ? "font-bold text-primary" : ""}`}>{key === "ultimaAvaliacao" ? vb.toFixed(1) : vb}</td>
                        <td className="text-center text-xs">
                          {winner === "=" ? <Badge variant="outline">Empate</Badge> : <Badge>{winner === "A" ? "A" : "B"}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
