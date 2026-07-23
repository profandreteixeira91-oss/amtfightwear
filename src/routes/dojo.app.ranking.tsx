import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Medal, Award, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listRankingClasses, getClassRanking } from "@/lib/dojo/rankings.functions";

export const Route = createFileRoute("/dojo/app/ranking")({
  component: RankingPage,
  head: () => ({
    meta: [
      { title: "Ranking por turma — AMT Dojo Manager" },
      { name: "description", content: "Ranking de alunos por check-ins realizados em cada turma." },
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
  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-red-600 text-white shadow">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Ranking por turma</h2>
            <p className="text-xs text-muted-foreground">Classificação por número de check-ins realizados.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={effectiveClassId}
            onValueChange={(v) => setClassId(v)}
            disabled={classesQ.isLoading || classes.length === 0}
          >
            <SelectTrigger className="w-[260px]">
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

          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="all">Total</TabsTrigger>
              <TabsTrigger value="year">Ano</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Alunos na turma" value={rows.length} icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Check-ins no período" value={totalCheckins} icon={<Award className="h-4 w-4" />} />
        <KpiCard
          label="Média por aluno"
          value={rows.length ? Math.round((totalCheckins / rows.length) * 10) / 10 : 0}
          icon={<Medal className="h-4 w-4" />}
        />
        <KpiCard
          label="Líder"
          value={rows[0]?.count ?? 0}
          hint={rows[0]?.full_name}
          icon={<Trophy className="h-4 w-4" />}
        />
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 0, 2].map((order, i) => {
            const p = podium[order];
            if (!p) return <div key={i} />;
            // Medalha segue a ordem de exibição (sempre distinta), mesmo em empate.
            const medalRank = order + 1;
            const styleByMedal = [
              { border: "border-amber-400", bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-transparent", label: "text-amber-700 dark:text-amber-300", medal: "🥇" },
              { border: "border-slate-300", bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-transparent", label: "text-slate-600 dark:text-slate-300", medal: "🥈" },
              { border: "border-orange-400", bg: "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-transparent", label: "text-orange-700 dark:text-orange-300", medal: "🥉" },
            ];
            const styles = styleByMedal[medalRank - 1];
            const raised = order === 0 ? "md:-translate-y-2" : "";
            return (
              <Card key={p.id} className={`${styles.border} ${styles.bg} ${raised} border-2 transition`}>
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="text-3xl">{styles.medal}</div>
                  <Avatar url={p.photo_url} name={p.full_name} size={64} />
                  <div className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{p.rank}º lugar</div>
                  <div className="line-clamp-1 text-sm font-semibold">{p.full_name}</div>
                  <div className="text-2xl font-black">{p.count}</div>
                  <div className="text-[11px] text-muted-foreground">check-ins</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Classificação completa</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingQ.isLoading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !effectiveClassId ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Selecione uma turma para ver o ranking.</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum aluno matriculado nesta turma ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="w-14 py-2">#</th>
                    <th className="py-2">Aluno</th>
                    <th className="w-32 py-2 text-right">Check-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const max = rows[0]?.count || 1;
                    const pct = Math.max(4, Math.round((r.count / max) * 100));
                    const medalRank = idx + 1; // ordem de exibição — medalha única mesmo em empate
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 font-bold text-muted-foreground">
                          {medalRank <= 3 ? <RankMedal rank={medalRank} /> : <span className="pl-1">{r.rank}º</span>}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-3">
                            <Avatar url={r.photo_url} name={r.full_name} size={32} />
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-1 font-medium">{r.full_name}</div>
                              <div className="mt-1 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="secondary" className="font-mono">{r.count}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, hint, icon }: { label: string; value: number | string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const m = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return <span className="text-lg">{m}</span>;
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-red-500 to-amber-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials || "?"}
    </div>
  );
}
