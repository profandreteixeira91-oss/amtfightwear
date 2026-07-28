import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Loader2, Users, Crown, Flame, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyClassRanking } from "@/lib/student/ranking.functions";

export const Route = createFileRoute("/app/_student/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Portal do Aluno" },
      { name: "description", content: "Ranking de check-ins da sua turma." },
      { property: "og:title", content: "Ranking — Portal do Aluno" },
      { property: "og:description", content: "Veja quem está mais firme no tatame na sua turma." },
    ],
  }),
  component: StudentRankingPage,
});

type Period = "all" | "year" | "month" | "week";

function StudentRankingPage() {
  const fn = useServerFn(getMyClassRanking);
  const [classId, setClassId] = useState<string>("");
  const [period, setPeriod] = useState<Period>("all");

  const q = useQuery({
    queryKey: ["student", "ranking", classId || null, period],
    queryFn: () => fn({ data: { classId: classId || undefined, period } }),
    staleTime: 30_000,
  });

  const data = q.data;
  const classes = data?.classes ?? [];
  const activeClassId = data?.classId ?? "";
  const activeClass = classes.find((c) => c.id === activeClassId);

  const rows = useMemo(() => {
    if (!data) return [] as Array<{ id: string; full_name: string; photo_url: string | null; count: number; rank: number; isMe: boolean }>;
    const list = data.students.map((s: any) => ({
      id: s.id,
      full_name: s.full_name as string,
      photo_url: (s.photo_url as string | null) ?? null,
      count: data.counts[s.id] ?? 0,
      isMe: s.id === data.me.id,
    }));
    list.sort((a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name));
    let lastCount: number | null = null;
    let lastRank = 0;
    return list.map((r, idx) => {
      const rank = r.count === lastCount ? lastRank : idx + 1;
      lastCount = r.count; lastRank = rank;
      return { ...r, rank };
    });
  }, [data]);

  // Ranking geral da academia (resumo mostrado quando nenhuma turma está selecionada)
  const overallRows = useMemo(() => {
    const overall = (data as any)?.overall as
      | { students: Array<{ id: string; full_name: string; photo_url: string | null }>; counts: Record<string, number>; total_students: number }
      | undefined;
    if (!overall) return [] as Array<{ id: string; full_name: string; photo_url: string | null; count: number; rank: number; isMe: boolean }>;
    const meId = data?.me.id ?? "";
    const list = overall.students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      photo_url: s.photo_url ?? null,
      count: overall.counts[s.id] ?? 0,
      isMe: s.id === meId,
    }));
    list.sort((a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name));
    let lastCount: number | null = null;
    let lastRank = 0;
    return list.map((r, idx) => {
      const rank = r.count === lastCount ? lastRank : idx + 1;
      lastCount = r.count; lastRank = rank;
      return { ...r, rank };
    });
  }, [data]);

  const myTotal = data?.me.total_checkins ?? 0;
  const podium = rows.slice(0, 3);
  const myRow = rows.find((r) => r.isMe);
  const overallPodium = overallRows.slice(0, 3);
  const myOverallRow = overallRows.find((r) => r.isMe);
  const hasMultipleClasses = classes.length > 1;
  const showOverall = !activeClassId;

  const periodLabel: Record<Period, string> = {
    all: "Histórico completo",
    year: "Últimos 12 meses",
    month: "Últimos 30 dias",
    week: "Últimos 7 dias",
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-2xl text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.65)]"
        style={{ background: "linear-gradient(135deg,#111 0%,#1a0a0a 50%,#3a0a0a 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-red-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-6 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 ring-1 ring-white/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200 backdrop-blur">
                <Flame className="h-3 w-3" /> Ranking
              </div>
              <h1 className="mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                Quem está mais firme no tatame?
              </h1>
              <p className="mt-1 text-[13px] text-neutral-300">
                {hasMultipleClasses
                  ? "Selecione uma turma para ver o ranking dos seus colegas."
                  : classes.length === 1
                  ? `Ranking da turma ${classes[0].name}.`
                  : "Você ainda não está matriculado em nenhuma turma."}
              </p>
            </div>
          </div>

          {/* Meu total */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <div className="col-span-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-200/80">
                Seus check-ins (total geral)
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <div className="font-display text-3xl font-black leading-none">{myTotal}</div>
                <div className="text-[11px] text-neutral-300">no histórico</div>
              </div>
            </div>
            {(myRow || myOverallRow) && (
              <div className="rounded-lg bg-gradient-to-br from-amber-400/20 to-red-500/20 p-2 text-right ring-1 ring-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-red-100/80">
                  {showOverall ? "Sua posição na academia" : "Sua posição"}
                </div>
                <div className="mt-0.5 font-display text-2xl font-black leading-none">
                  {(showOverall ? myOverallRow?.rank : myRow?.rank) ?? "—"}º
                </div>
                <div className="text-[10px] text-neutral-300">
                  {(showOverall ? myOverallRow?.count : myRow?.count) ?? 0} check-ins
                  {showOverall && overallRows.length ? ` · de ${overallRows.length}` : ""}
                </div>
              </div>
            )}
          </div>

          {/* Seletor de turma + período */}
          {classes.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {hasMultipleClasses && (
                <Select
                  value={activeClassId}
                  onValueChange={(v) => setClassId(v)}
                >
                  <SelectTrigger className="h-11 w-full border-white/15 bg-white/5 text-white backdrop-blur hover:bg-white/10 sm:w-[240px]">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color || "#dc2626" }} />
                          {c.name}
                          {c.modality && <span className="text-muted-foreground">· {c.modality}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full sm:w-auto">
                <TabsList className="grid h-11 w-full grid-cols-4 border border-white/15 bg-white/5 p-1 text-white backdrop-blur sm:flex sm:w-auto">
                  <TabsTrigger value="all" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Total</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Ano</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Mês</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Semana</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {activeClass && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full" style={{ background: activeClass.color || "#dc2626" }} />
                {activeClass.name}
              </span>
              {activeClass.modality && (
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 backdrop-blur">
                  {activeClass.modality}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 backdrop-blur">
                <TrendingUp className="h-3 w-3" /> {periodLabel[period]}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Estado sem turma */}
      {classes.length === 0 && !q.isLoading && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Você ainda não está matriculado em nenhuma turma. Fale com a sua academia para participar do ranking.
          </p>
        </section>
      )}

      {/* PÓDIO */}
      {(showOverall ? overallPodium : podium).length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[0, 1, 2].map((order, i) => {
            const p = (showOverall ? overallPodium : podium)[order];
            if (!p) return <div key={i} className="hidden sm:block" />;
            const medalRank = Math.min(p.rank, 3);
            const styles = [
              { border: "border-amber-300", bg: "from-amber-50 via-white to-amber-50", chip: "bg-amber-400 text-amber-950", gradient: "from-amber-400 via-amber-500 to-yellow-600", medal: "🥇", label: "1º LUGAR", mdOrder: "sm:order-2 sm:-translate-y-2 sm:scale-[1.03]" },
              { border: "border-slate-300", bg: "from-slate-100 via-white to-slate-50", chip: "bg-slate-300 text-slate-900", gradient: "from-slate-300 via-slate-400 to-slate-500", medal: "🥈", label: "2º LUGAR", mdOrder: "sm:order-1" },
              { border: "border-orange-300", bg: "from-orange-50 via-white to-orange-50", chip: "bg-orange-400 text-orange-950", gradient: "from-orange-400 via-orange-500 to-amber-700", medal: "🥉", label: "3º LUGAR", mdOrder: "sm:order-3" },
            ];
            const s = styles[medalRank - 1];
            return (
              <div
                key={p.id}
                className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${s.border} ${s.bg} shadow-sm ${s.mdOrder} ${p.isMe ? "ring-2 ring-red-400" : ""}`}
              >
                <div aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.gradient}`} />
                <div className="relative flex flex-row items-center gap-3 p-3 sm:flex-col sm:gap-2 sm:p-5 sm:text-center">
                  <div className="text-3xl leading-none sm:text-4xl">{s.medal}</div>
                  <Avatar url={p.photo_url} name={p.full_name} size={52} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:items-center">
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${s.chip}`}>
                      {s.label}
                    </span>
                    <div className="line-clamp-1 max-w-full text-sm font-semibold">
                      {p.isMe ? `${p.full_name} (você)` : p.full_name}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <div className={`bg-gradient-to-br bg-clip-text font-display text-2xl font-black leading-none text-transparent sm:text-3xl ${s.gradient}`}>
                        {p.count}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">check-ins</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA COMPLETA */}
      <section className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-amber-400" />
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-600/10 text-red-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Classificação completa</div>
              <div className="truncate text-[11px] text-neutral-500">{periodLabel[period]}</div>
            </div>
          </div>
          {rows.length > 0 && (
            <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
              {rows.length} {rows.length === 1 ? "aluno" : "alunos"}
            </span>
          )}
        </div>

        {q.isLoading ? (
          <div className="grid place-items-center py-16 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !activeClassId ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {hasMultipleClasses ? "Selecione uma turma para ver o ranking." : "Sem turma para exibir."}
          </p>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center gap-2 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm text-neutral-500">Nenhum aluno matriculado nesta turma ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const max = rows[0]?.count || 1;
              const pct = Math.max(4, Math.round((r.count / max) * 100));
              const isTop = r.rank <= 3;
              return (
                <li
                  key={r.id}
                  className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-3 sm:px-4 ${
                    isTop ? "bg-gradient-to-r from-red-50/40 via-transparent to-transparent" : ""
                  } ${r.isMe ? "bg-red-50/60" : ""}`}
                >
                  <div className="flex items-center justify-center">
                    {r.rank <= 3 ? (
                      <span className="text-xl leading-none">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}</span>
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600">
                        {r.rank}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar url={r.photo_url} name={r.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-[13px] font-semibold">
                          {r.isMe ? `${r.full_name} (você)` : r.full_name}
                        </div>
                        {r.rank === 1 && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      </div>
                      <div className="mt-1.5 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-neutral-100">
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

                  <div className="text-right">
                    <div className="font-display text-lg font-black leading-none text-neutral-900">{r.count}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      check-ins
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white ring-2 ring-white shadow-sm"
    >
      {initials || "?"}
    </div>
  );
}
