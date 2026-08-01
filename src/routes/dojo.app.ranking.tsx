import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Medal, Award, Users, Loader2, Flame, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listRankingClasses, getClassRanking } from "@/lib/dojo/rankings.functions";

export const Route = createFileRoute("/dojo/app/ranking")({
  component: RankingPage,
  head: () => ({
    meta: [
      { title: "Ranking por turma — AMT Dojo Manager" },
      { name: "description", content: "Ranking de alunos por check-ins realizados em cada turma." },
      { property: "og:title", content: "Ranking por turma — AMT Dojo Manager" },
      { property: "og:description", content: "Classificação por check-ins realizados." },
    ],
  }),
});

type Period = "all" | "year" | "month" | "week";

function RankingPage() {
  const listClasses = useServerFn(listRankingClasses);
  const getRanking = useServerFn(getClassRanking);
  const [classId, setClassId] = useState<string>("");
  const [period, setPeriod] = useState<Period>("all");

  const classesQ = useQuery({
    queryKey: ["ranking", "classes"],
    queryFn: () => listClasses(),
    staleTime: 60_000,
  });

  const classes = classesQ.data ?? [];
  const activeClass = useMemo(
    () => classes.find((c: any) => c.id === classId) ?? classes[0],
    [classes, classId],
  );
  const effectiveClassId = activeClass?.id ?? "";

  const rankingQ = useQuery({
    queryKey: ["ranking", "class", effectiveClassId, period],
    queryFn: () => getRanking({ data: { classId: effectiveClassId, period } }),
    enabled: !!effectiveClassId,
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const data = rankingQ.data;
    if (!data) return [] as Array<{ id: string; full_name: string; photo_url: string | null; count: number; rank: number }>;
    const list = data.students.map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      photo_url: s.photo_url ?? null,
      count: data.counts[s.id] ?? 0,
    }));
    list.sort((a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name));
    let lastCount: number | null = null;
    let lastRank = 0;
    return list.map((r, idx) => {
      const rank = r.count === lastCount ? lastRank : idx + 1;
      lastCount = r.count; lastRank = rank;
      return { ...r, rank };
    });
  }, [rankingQ.data]);

  const totalCheckins = rows.reduce((acc, r) => acc + r.count, 0);
  const avg = rows.length ? Math.round((totalCheckins / rows.length) * 10) / 10 : 0;
  const podium = rows.slice(0, 3);

  const periodLabel: Record<Period, string> = {
    all: "Histórico completo",
    year: "Ano vigente (01/01 a 31/12)",
    month: "Mês vigente (dia 01 ao último dia)",
    week: "Semana vigente (domingo a sábado)",
  };


  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 text-white shadow-[0_30px_80px_-40px_rgba(220,38,38,0.65)] sm:rounded-3xl">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_40%)]" />

        <div className="relative flex flex-col gap-5 p-4 sm:p-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,auto)] md:items-start md:gap-4 md:p-7">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white shadow-[0_10px_25px_-10px_rgba(220,38,38,0.9)] ring-1 ring-white/20 sm:h-14 sm:w-14">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200 backdrop-blur">
                <Flame className="h-3 w-3" /> Ranking
              </div>
              <h1 className="mt-2 font-display text-xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
                Quem está mais firme no tatame?
              </h1>
              <p className="mt-1 max-w-xl text-[13px] text-neutral-300 sm:text-sm">
                Classificação por check-ins. Selecione a turma e o período.
              </p>

              {activeClass && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <HeroChip>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: activeClass.color || "#dc2626" }} />
                    <span className="max-w-[140px] truncate sm:max-w-none">{activeClass.name}</span>
                  </HeroChip>
                  {activeClass.modality && <HeroChip>{activeClass.modality}</HeroChip>}
                  <HeroChip icon={TrendingUp}>{periodLabel[period]}</HeroChip>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <Select
              value={effectiveClassId}
              onValueChange={(v) => setClassId(v)}
              disabled={classesQ.isLoading || classes.length === 0}
            >
              <SelectTrigger className="h-11 w-full border-white/15 bg-white/5 text-white backdrop-blur hover:bg-white/10 md:h-10 md:w-[280px]">
                <SelectValue placeholder={classesQ.isLoading ? "Carregando turmas…" : "Selecione a turma"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color || "#dc2626" }} />
                      {c.name}
                      <span className="text-muted-foreground">· {c.modality}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full md:w-auto">
              <TabsList className="grid h-11 w-full grid-cols-4 border border-white/15 bg-white/5 p-1 text-white backdrop-blur md:flex md:h-10 md:w-auto">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white sm:text-sm">Total</TabsTrigger>
                <TabsTrigger value="year" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white sm:text-sm">Ano</TabsTrigger>
                <TabsTrigger value="month" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white sm:text-sm">Mês</TabsTrigger>
                <TabsTrigger value="week" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white sm:text-sm">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* ===== KPIs ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Alunos na turma"
          value={rows.length}
          icon={<Users className="h-4 w-4" />}
          ringClass="from-sky-500/40 to-sky-500/0"
          iconClass="bg-sky-500/15 text-sky-600 dark:text-sky-300"
        />
        <KpiCard
          label="Check-ins no período"
          value={totalCheckins}
          icon={<Award className="h-4 w-4" />}
          ringClass="from-emerald-500/40 to-emerald-500/0"
          iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
        />
        <KpiCard
          label="Média por aluno"
          value={avg}
          icon={<Medal className="h-4 w-4" />}
          ringClass="from-violet-500/40 to-violet-500/0"
          iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-300"
        />
        <KpiCard
          label="Líder"
          value={rows[0]?.count ?? 0}
          hint={rows[0]?.full_name}
          icon={<Crown className="h-4 w-4" />}
          ringClass="from-amber-500/50 to-red-500/0"
          iconClass="bg-gradient-to-br from-amber-400 to-red-500 text-white"
        />
      </div>

      {/* ===== PÓDIO ===== */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((order, i) => {
            const p = podium[order];
            if (!p) return <div key={i} className="hidden sm:block" />;
            const medalRank = Math.min(p.rank, 3);
            const stylesByRank = [
              {
                border: "border-amber-300/70",
                bg: "bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-950/50 dark:via-neutral-950 dark:to-neutral-950",
                ring: "ring-4 ring-amber-300/40",
                glow: "shadow-[0_25px_60px_-25px_rgba(245,158,11,0.55)]",
                chip: "bg-amber-400 text-amber-950",
                gradient: "from-amber-400 via-amber-500 to-yellow-600",
                medal: "🥇",
                label: "1º LUGAR",
                mdOrder: "sm:order-2 sm:-translate-y-3 sm:scale-[1.03]",
              },
              {
                border: "border-slate-300/70",
                bg: "bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-800/50 dark:via-neutral-950 dark:to-neutral-950",
                ring: "ring-4 ring-slate-300/40",
                glow: "shadow-[0_20px_50px_-25px_rgba(148,163,184,0.55)]",
                chip: "bg-slate-300 text-slate-900",
                gradient: "from-slate-300 via-slate-400 to-slate-500",
                medal: "🥈",
                label: "2º LUGAR",
                mdOrder: "sm:order-1",
              },
              {
                border: "border-orange-300/70",
                bg: "bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-orange-950/50 dark:via-neutral-950 dark:to-neutral-950",
                ring: "ring-4 ring-orange-300/40",
                glow: "shadow-[0_20px_50px_-25px_rgba(234,88,12,0.55)]",
                chip: "bg-orange-400 text-orange-950",
                gradient: "from-orange-400 via-orange-500 to-amber-700",
                medal: "🥉",
                label: "3º LUGAR",
                mdOrder: "sm:order-3",
              },
            ];
            const s = stylesByRank[medalRank - 1];
            return (
              <Card
                key={p.id}
                className={`relative overflow-hidden border-2 transition-all ${s.border} ${s.bg} ${s.glow} ${s.mdOrder}`}
              >
                <div aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.gradient}`} />
                <div aria-hidden className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-20 blur-2xl`} />
                <CardContent className="relative flex flex-row items-center gap-4 py-4 text-left sm:flex-col sm:gap-3 sm:py-7 sm:text-center">
                  <div className="shrink-0 text-3xl leading-none drop-shadow sm:text-4xl">{s.medal}</div>
                  <div className={`shrink-0 rounded-full ${s.ring}`}>
                    <Avatar url={p.photo_url} name={p.full_name} size={56} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:items-center sm:gap-2">
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${s.chip} sm:text-[10px]`}>
                      {s.label}
                    </span>
                    <div className="line-clamp-1 max-w-full text-sm font-semibold">{p.full_name}</div>
                    <div className="flex items-baseline gap-1.5">
                      <div className={`bg-gradient-to-br bg-clip-text font-display text-2xl font-black leading-none text-transparent sm:text-4xl ${s.gradient}`}>
                        {p.count}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">check-ins</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== CLASSIFICAÇÃO COMPLETA ===== */}
      <Card className="relative overflow-hidden border-neutral-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-950">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-amber-400" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-2 border-b border-neutral-200/70 px-4 py-3 dark:border-white/10 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-600/10 text-red-600 dark:text-red-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Classificação completa</div>
              <div className="truncate text-[11px] text-muted-foreground">{periodLabel[period]}</div>
            </div>
          </div>
          {rows.length > 0 && (
            <span className="shrink-0 rounded-full border border-neutral-200/70 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
              {rows.length} {rows.length === 1 ? "aluno" : "alunos"}
            </span>
          )}
        </div>

        <CardContent className="relative p-0">
          {rankingQ.isLoading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !effectiveClassId ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Selecione uma turma para ver o ranking.</p>
          ) : rows.length === 0 ? (
            <div className="grid place-items-center gap-2 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-white/5">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum aluno matriculado nesta turma ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 dark:divide-white/5">
              {rows.map((r) => {
                const max = rows[0]?.count || 1;
                const pct = Math.max(4, Math.round((r.count / max) * 100));
                const isTop = r.rank <= 3;
                return (
                  <li
                    key={r.id}
                    className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-3 sm:px-5 ${
                      isTop ? "bg-gradient-to-r from-red-50/40 via-transparent to-transparent dark:from-red-950/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {r.rank <= 3 ? (
                        <span className="text-xl leading-none drop-shadow sm:text-2xl">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200/70 bg-neutral-50 text-xs font-bold text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 sm:h-8 sm:w-8">
                          {r.rank}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <div className="shrink-0">
                        <Avatar url={r.photo_url} name={r.full_name} size={36} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-[13px] font-semibold sm:text-sm">{r.full_name}</div>
                          {r.rank === 1 && (
                            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                          <div
                            className={`h-full rounded-full ${
                              r.rank === 1
                                ? "bg-gradient-to-r from-amber-400 via-red-500 to-red-600"
                                : r.rank === 2
                                ? "bg-gradient-to-r from-slate-300 to-slate-500"
                                : r.rank === 3
                                ? "bg-gradient-to-r from-orange-400 to-amber-600"
                                : "bg-gradient-to-r from-red-500/70 to-red-600/70"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-display text-base font-black leading-none sm:text-lg">{r.count}</div>
                      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">check-ins</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Subcomponentes
   ============================================================ */

function HeroChip({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-semibold text-neutral-100 backdrop-blur">
      {Icon && <Icon className="h-3 w-3 text-red-300" />}
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  ringClass,
  iconClass,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
  ringClass: string;
  iconClass: string;
}) {
  return (
    <Card className="relative overflow-hidden border-neutral-200/70 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-neutral-950">
      <div aria-hidden className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${ringClass} blur-2xl`} />
      <CardContent className="relative flex items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-black leading-none">{value}</div>
          {hint && <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt="" className="rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-neutral-900" style={{ width: size, height: size }} />;
  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-red-500 via-red-600 to-amber-500 font-bold text-white ring-2 ring-white shadow-sm dark:ring-neutral-900"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials || "?"}
    </div>
  );
}
