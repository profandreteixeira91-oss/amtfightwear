import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Activity, CalendarDays, Dumbbell, GraduationCap, Trophy, Video,
  Target, HeartPulse, Users2, TrendingUp, ClipboardList, Flame, Award, Sparkles,
} from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import {
  getAthleteOverview, getAthleteAttendance, getAthletePerformanceScore,
  getAthletePhysical, getAthleteTechnical, getAthleteGraduations,
  getAthleteCompetitions, getAthleteInsights,
} from "@/lib/dojo/athlete-analysis.functions";
import { getMyHome } from "@/lib/student/student.functions";
import { PerformanceRadar } from "@/components/dojo/athlete-analysis/PerformanceRadar";
import { AttendanceHeatmap } from "@/components/dojo/athlete-analysis/AttendanceHeatmap";
import { AttendanceMonthlyChart } from "@/components/dojo/athlete-analysis/AttendanceMonthlyChart";
import { EvaluationTrendChart } from "@/components/dojo/athlete-analysis/EvaluationTrendChart";
import { MedalsBreakdown } from "@/components/dojo/athlete-analysis/MedalsBreakdown";
import { InsightCard } from "@/components/dojo/athlete-analysis/InsightCard";
import { formatDegree, degreeUnit, formatBeltName } from "@/lib/dojo/degree-label";
import { brDate } from "@/lib/format";

export const Route = createFileRoute("/app/_student/performance")({
  head: () => ({
    meta: [
      { title: "Performance — Portal do Aluno" },
      { name: "description", content: "Sua análise completa de performance: frequência, técnico, graduações, competições e insights." },
      { property: "og:title", content: "Performance — Portal do Aluno" },
      { property: "og:description", content: "Painel completo de performance esportiva do atleta." },
    ],
  }),
  component: StudentPerformancePage,
});

function fmtDate(v?: string | null) {
  return brDate(v);
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
  eventos: { label: "Eventos", icon: Activity },
};

function methodLabel(m?: string | null) {
  const map: Record<string, string> = {
    manual: "Manual", qr: "QR Code", pin: "PIN", geo: "Geolocalização",
    geolocation: "Geolocalização", visitor: "Visitante", fixed_qr: "QR Fixo",
    photo: "Foto", app: "App",
  };
  return map[(m ?? "manual").toLowerCase()] ?? (m ?? "—");
}

function imcCategory(imc: number | null | undefined) {
  if (!imc) return undefined;
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidade";
}

function StudentPerformancePage() {
  const homeFn = useServerFn(getMyHome);
  const home = useQuery({ queryKey: ["student", "home", "perf"], queryFn: () => homeFn({}) });
  const id = (home.data as any)?.student?.id as string | undefined;

  const overviewFn = useServerFn(getAthleteOverview);
  const attFn = useServerFn(getAthleteAttendance);
  const scoreFn = useServerFn(getAthletePerformanceScore);
  const physFn = useServerFn(getAthletePhysical);
  const techFn = useServerFn(getAthleteTechnical);
  const gradFn = useServerFn(getAthleteGraduations);
  const compFn = useServerFn(getAthleteCompetitions);
  const insFn = useServerFn(getAthleteInsights);

  const enabled = !!id;
  const overview = useQuery({ enabled, queryKey: ["stu-perf", id, "overview"], queryFn: () => overviewFn({ data: { studentId: id! } }) });
  const attendance = useQuery({ enabled, queryKey: ["stu-perf", id, "att"], queryFn: () => attFn({ data: { studentId: id!, days: 365 } }) });
  const score = useQuery({ enabled, queryKey: ["stu-perf", id, "score"], queryFn: () => scoreFn({ data: { studentId: id! } }) });
  const physical = useQuery({ enabled, queryKey: ["stu-perf", id, "phys"], queryFn: () => physFn({ data: { studentId: id! } }) });
  const technical = useQuery({ enabled, queryKey: ["stu-perf", id, "tech"], queryFn: () => techFn({ data: { studentId: id! } }) });
  const grads = useQuery({ enabled, queryKey: ["stu-perf", id, "grads"], queryFn: () => gradFn({ data: { studentId: id! } }) });
  const comps = useQuery({ enabled, queryKey: ["stu-perf", id, "comps"], queryFn: () => compFn({ data: { studentId: id! } }) });
  const insights = useQuery({ enabled, queryKey: ["stu-perf", id, "ins"], queryFn: () => insFn({ data: { studentId: id! } }) });

  const s = overview.data?.student as any;
  const belt = overview.data?.belt as any;

  if (home.isLoading || !id) {
    return (
      <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div data-student-performance className="mx-auto grid w-full min-w-0 max-w-3xl gap-5 lg:max-w-5xl">
      <Link to="/app/home" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Voltar ao início
      </Link>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-red-500/25 bg-gradient-to-br from-neutral-950 via-neutral-950 to-black p-5 shadow-[0_30px_80px_-30px_rgba(239,68,68,0.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-red-500/15 blur-[100px]" />
        <div className="relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
          {s?.photo_url ? (
            <img src={s.photo_url} alt={s.full_name} className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/10 sm:h-24 sm:w-24" />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-xl font-black text-red-200 ring-2 ring-white/10 sm:h-24 sm:w-24 sm:text-2xl">
              {s?.full_name?.slice(0, 2).toUpperCase() ?? "—"}
            </div>
          )}
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">
              <Sparkles className="h-3 w-3" /> Minha performance
            </div>
            <h1 className="break-words text-lg font-black leading-tight tracking-tight text-white sm:text-2xl">
              {s?.full_name ?? <Skeleton className="h-6 w-40" />}
            </h1>
            <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/80 sm:text-xs">
              {age(s?.birth_date) != null && <span className="inline-flex items-center gap-1"><HeartPulse className="h-3.5 w-3.5 text-red-400" />{age(s?.birth_date)} anos</span>}
              {belt && <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5 text-amber-400" />{formatBeltName(belt.name, belt.modality)} · {formatDegree(s?.current_degree ?? 0, belt.modality, belt.name)}</span>}
            </div>
            {score.data && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                  <span className="text-white/60">Índice geral</span>
                  <span className="text-white">{score.data.score}<span className="text-white/40">/100</span></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-red-400 to-amber-400" style={{ width: `${Math.min(100, score.data.score)}%` }} />
                </div>
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">{score.data.label}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard index={0} icon={Activity} label="Check-ins (365d)" value={attendance.data?.totalPresent ?? "—"} hint={`${attendance.data?.distinctDays ?? 0} dias distintos`} loading={attendance.isLoading} />
        <StatCard index={1} icon={Flame} label="Maior sequência" value={attendance.data?.maxStreak ?? "—"} hint="dias consecutivos" loading={attendance.isLoading} />
        <StatCard index={2} icon={GraduationCap} label="Graduações" value={grads.data?.history.length ?? "—"} hint={grads.data?.nextForecast ? `Próxima ~ ${fmtDate(grads.data.nextForecast)}` : "Sem previsão"} loading={grads.isLoading} />
        <StatCard index={3} icon={Trophy} label="Medalhas" value={comps.data ? comps.data.totals.gold + comps.data.totals.silver + comps.data.totals.bronze : "—"} hint={comps.data ? `${comps.data.totals.gold}🥇 ${comps.data.totals.silver}🥈 ${comps.data.totals.bronze}🥉` : ""} loading={comps.isLoading} />
      </div>

      {/* Gauge + breakdown */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <SectionCard title="Índice Geral" description="Score composto de 6 dimensões">
          {score.isLoading ? <Skeleton className="h-56" /> : score.data ? <PerformanceRadar data={Object.entries((score.data as any).breakdownScores ?? score.data.breakdown).map(([k, v]) => ({ name: k, value: Number(v) }))} /> : null}
        </SectionCard>
        <SectionCard title="Decomposição do Score" description="Contribuição por dimensão" className="lg:col-span-2">
          {score.isLoading ? (
            <div className="space-y-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : score.data ? (
            <div className="space-y-4">
              {Object.entries(score.data.breakdown).map(([k, v]) => {
                const meta = BREAKDOWN_LABELS[k] ?? { label: k, icon: Activity };
                const Icon = meta.icon;
                const val = Number(v);
                const color = val >= 80 ? "bg-emerald-500" : val >= 60 ? "bg-primary" : val >= 40 ? "bg-amber-500" : "bg-destructive";
                return (
                  <div key={k}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-muted-foreground" />{meta.label}</span>
                      <span className="tabular-nums text-muted-foreground">{val}<span className="text-xs">/100</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, val)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Inteligência Analítica" description="Insights automáticos">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          {insights.data?.insights.map((it, i) => <InsightCard key={i} {...it} />)}
          {insights.data && insights.data.insights.length === 0 && (
            <div className="text-sm text-muted-foreground">Sem alertas no momento. Bom trabalho!</div>
          )}
        </div>
      </SectionCard>

      {/* Tabs */}
      <Tabs defaultValue="frequencia" className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto w-max min-w-full gap-1 rounded-2xl border border-red-500/20 bg-neutral-950/70 p-1.5 backdrop-blur">
            <TabsTrigger value="frequencia" className="gap-1.5 rounded-xl px-3 py-2 text-xs text-white/60 data-[state=active]:bg-red-600 data-[state=active]:text-white"><CalendarDays className="h-4 w-4" />Frequência</TabsTrigger>
            <TabsTrigger value="tecnico" className="gap-1.5 rounded-xl px-3 py-2 text-xs text-white/60 data-[state=active]:bg-red-600 data-[state=active]:text-white"><Target className="h-4 w-4" />Técnico</TabsTrigger>
            <TabsTrigger value="graduacoes" className="gap-1.5 rounded-xl px-3 py-2 text-xs text-white/60 data-[state=active]:bg-red-600 data-[state=active]:text-white"><GraduationCap className="h-4 w-4" />Graduações</TabsTrigger>
            <TabsTrigger value="competicoes" className="gap-1.5 rounded-xl px-3 py-2 text-xs text-white/60 data-[state=active]:bg-red-600 data-[state=active]:text-white"><Trophy className="h-4 w-4" />Competições</TabsTrigger>
            <TabsTrigger value="fisico" className="gap-1.5 rounded-xl px-3 py-2 text-xs text-white/60 data-[state=active]:bg-red-600 data-[state=active]:text-white"><HeartPulse className="h-4 w-4" />Físico</TabsTrigger>
          </TabsList>
        </div>

        {/* Frequência */}
        <TabsContent value="frequencia" className="mt-5 space-y-5">
          <SectionCard title="Frequência mensal" description="Últimos 12 meses">
            {attendance.isLoading ? <Skeleton className="h-56 w-full" /> :
              <AttendanceMonthlyChart data={attendance.data?.heatmap ?? []} months={12} />}
          </SectionCard>
          <SectionCard title="Dias da semana" description="Seu padrão de treino">
            <div className="grid min-w-0 grid-cols-7 gap-1 text-center sm:gap-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => {
                const v = attendance.data?.weekday?.[i] ?? 0;
                const max = Math.max(1, ...(attendance.data?.weekday ?? [1]));
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="relative flex h-24 w-full items-end overflow-hidden rounded-lg bg-muted/40">
                      <div className="w-full rounded-lg bg-gradient-to-t from-primary to-primary/60" style={{ height: `${(v / max) * 100}%` }} />
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
                    <div className="text-sm font-bold tabular-nums">{v}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard title="Heatmap anual" description="Cada quadrado é um dia">
            {attendance.isLoading ? <Skeleton className="h-32 w-full" /> :
              <AttendanceHeatmap data={attendance.data?.heatmap ?? []} />}
          </SectionCard>
          <SectionCard title="Últimos check-ins">
            {attendance.isLoading ? <Skeleton className="h-40 w-full" /> :
              (attendance.data?.recent?.length ?? 0) === 0 ? (
                <EmptyState title="Nenhum check-in" description="Assim que você fizer check-ins, aparecerão aqui." icon={CalendarDays} />
              ) : (
                <div className="-mx-1 min-w-0 overflow-x-auto px-1">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr className="border-b border-border/40">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Hora</th>
                        <th className="py-2 pr-3">Método</th>
                        <th className="py-2">Turma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {attendance.data!.recent.map((c: any) => {
                        const dt = new Date(c.checked_in_at);
                        return (
                          <tr key={c.id} className="hover:bg-muted/30">
                            <td className="py-2 pr-3 font-medium">{dt.toLocaleDateString("pt-BR")}</td>
                            <td className="py-2 pr-3 tabular-nums text-muted-foreground">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="py-2 pr-3"><Badge variant="outline" className="capitalize">{methodLabel(c.method)}</Badge></td>
                            <td className="py-2">{c.class_name ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </SectionCard>
        </TabsContent>

        {/* Técnico */}
        <TabsContent value="tecnico" className="mt-5 space-y-5">
          <SectionCard title="Evolução em avaliações" description="Aproveitamento (%) em sessões concluídas">
            {technical.isLoading ? <Skeleton className="h-56" /> :
              <EvaluationTrendChart sessions={(technical.data?.sessions ?? []) as any} />}
          </SectionCard>
          <SectionCard title="Histórico de avaliações">
            {(technical.data?.sessions?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma avaliação concluída.</div>
            ) : (
              <div className="-mx-1 min-w-0 overflow-x-auto px-1">
                <table className="w-full min-w-[440px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="py-2 pr-3">Avaliação</th>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3 text-right">Aproveitamento</th>
                      <th className="py-2 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {technical.data!.sessions.map((sess: any) => (
                      <tr key={sess.id} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 font-medium">{sess.dojo_evaluations?.title ?? "Avaliação"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(sess.finished_at)}</td>
                        <td className="py-2 pr-3 text-right font-bold tabular-nums">{Number(sess.percentage).toFixed(1)}%</td>
                        <td className="py-2 text-right">
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
        <TabsContent value="graduacoes" className="mt-5">
          <SectionCard title="Timeline de Graduações" description={grads.data?.nextForecast ? `Próxima prevista: ${fmtDate(grads.data.nextForecast)}` : undefined}>
            {(grads.data?.history?.length ?? 0) === 0 ? (
              <EmptyState title="Sem graduações" description="Suas graduações aparecerão aqui." icon={GraduationCap} />
            ) : (
              <ol className="relative min-w-0 space-y-4 border-l-2 border-border/60 pl-4 sm:pl-5">
                {grads.data!.history.map((g: any, i: number) => (
                  <li key={g.id} className="relative">
                    <span className="absolute -left-[26px] top-4 h-3.5 w-3.5 rounded-full ring-4 ring-background" style={{ background: g.dojo_belts?.color_hex ?? "#000" }} />
                    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/40 bg-card p-3 sm:flex-row sm:items-center sm:p-4">
                      <div className="w-20 shrink-0 sm:w-24"><BeltAuto belt={g.dojo_belts} degree={g.degree} /></div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm font-bold sm:text-base">{g.dojo_belts?.name}{g.degree ? ` · ${g.degree}º ${degreeUnit(g.dojo_belts?.modality)}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(g.graduation_date)} {g.evaluator ? `· Avaliador: ${g.evaluator}` : ""}</div>
                        {g.notes && <div className="mt-1 text-xs leading-relaxed">{g.notes}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        {/* Competições */}
        <TabsContent value="competicoes" className="mt-5 space-y-5">
          <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard index={0} icon={Trophy} label="Disputadas" value={comps.data?.totals.competitions ?? "—"} />
            <StatCard index={1} icon={TrendingUp} label="Vitórias" value={comps.data?.totals.wins ?? "—"} />
            <StatCard index={2} icon={Activity} label="Finalizações" value={comps.data?.totals.submissions ?? "—"} />
            <StatCard index={3} icon={Target} label="Pontos" value={comps.data?.totals.points ?? "—"} />
          </div>
          <SectionCard title="Medalhas & Cartel">
            {comps.isLoading ? <Skeleton className="h-40" /> :
              comps.data ? <MedalsBreakdown totals={comps.data.totals} /> : null}
          </SectionCard>
          <SectionCard title="Histórico de competições">
            {(comps.data?.list?.length ?? 0) === 0 ? (
              <EmptyState title="Sem competições" description="Suas competições aparecerão aqui." icon={Trophy} />
            ) : (
              <div className="-mx-1 min-w-0 overflow-x-auto px-1">
                <table className="w-full min-w-[440px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="py-2 pr-3">Competição</th>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Categoria</th>
                      <th className="py-2 pr-3">Resultado</th>
                      <th className="py-2 text-right">V/D/E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {comps.data!.list.map((c: any) => (
                      <tr key={c.athlete_id} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 font-medium">{c.competition_name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(c.competition_start_at)}</td>
                        <td className="py-2 pr-3">{c.category ?? "—"}</td>
                        <td className="py-2 pr-3">
                          {c.medal ? (
                            <Badge className={c.medal === "gold" ? "bg-yellow-500/20 text-yellow-700" : c.medal === "silver" ? "bg-slate-400/20 text-slate-700" : "bg-orange-600/20 text-orange-700"}>
                              {c.medal === "gold" ? "🥇 Ouro" : c.medal === "silver" ? "🥈 Prata" : "🥉 Bronze"}
                            </Badge>
                          ) : c.placement ? `${c.placement}º` : "—"}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">{c.wins ?? 0}/{c.losses ?? 0}/{c.draws ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Físico */}
        <TabsContent value="fisico" className="mt-5 space-y-5">
          <SectionCard title="Composição corporal">
            {physical.data ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricBox label="Peso" value={physical.data.current.weight ? `${physical.data.current.weight} kg` : "—"} />
                <MetricBox label="Altura" value={physical.data.current.height ? `${physical.data.current.height} cm` : "—"} />
                <MetricBox label="IMC" value={physical.data.current.imc ?? "—"} hint={imcCategory(physical.data.current.imc)} />
              </div>
            ) : <Skeleton className="h-24" />}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricBox({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/10 p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-black tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
