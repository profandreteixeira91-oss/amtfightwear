// Painel de estatísticas e ranking do dojo — usa RPCs em rankings.functions.

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, TrendingUp, MapPin, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  getAcademyAthleteRanking,
  getCompetitionsStats,
  getAcademyMedalSummary,
} from "@/lib/dojo/competitions/rankings.functions";

const CHART_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];

export function RankingPanel() {
  const rankFn = useServerFn(getAcademyAthleteRanking);
  const [belt, setBelt] = useState<string>("all");

  const q = useQuery({
    queryKey: ["comp-ranking", belt],
    queryFn: () => rankFn({ data: { belt_id: belt !== "all" ? belt : null } }),
    staleTime: 60_000,
  });

  const rows = q.data ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold">Ranking interno</div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Pontuação: Ouro ×5 · Prata ×3 · Bronze ×2 · Vitória ×1
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum atleta com registro competitivo ainda.
        </div>
      ) : (
        <>
          {/* Pódio */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {top3.map((r, i) => (
                <Card key={r.student_id} className={i === 0 ? "border-amber-500" : i === 1 ? "border-slate-400" : "border-orange-600"}>
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="text-3xl">{["🥇", "🥈", "🥉"][i]}</div>
                    {r.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold">
                        {r.full_name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div className="font-semibold">{r.full_name}</div>
                    <div className="text-2xl font-bold">{Number(r.points).toFixed(0)} pts</div>
                    <div className="flex gap-1 text-xs">
                      <Badge className="bg-amber-500">🥇 {r.gold}</Badge>
                      <Badge className="bg-slate-400">🥈 {r.silver}</Badge>
                      <Badge className="bg-orange-600">🥉 {r.bronze}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="divide-y overflow-hidden rounded border">
              {rest.map((r, i) => (
                <div key={r.student_id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="w-6 text-center font-bold text-muted-foreground">{i + 4}º</div>
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                      {r.full_name?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.competitions} competições · V: {r.wins} · D: {r.losses}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🥇 {r.gold}</span>
                    <span className="text-xs">🥈 {r.silver}</span>
                    <span className="text-xs">🥉 {r.bronze}</span>
                  </div>
                  <div className="w-16 text-right font-semibold">{Number(r.points).toFixed(0)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {/* placeholder for future belt filter — could be expanded to belt list */}
      <input type="hidden" value={belt} onChange={() => setBelt(belt)} />
    </div>
  );
}

export function StatsPanel() {
  const statsFn = useServerFn(getCompetitionsStats);
  const medalsFn = useServerFn(getAcademyMedalSummary);

  const s = useQuery({ queryKey: ["comp-stats"], queryFn: () => statsFn(), staleTime: 60_000 });
  const m = useQuery({ queryKey: ["comp-medals"], queryFn: () => medalsFn(), staleTime: 60_000 });

  if (s.isLoading || m.isLoading) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
    </div>;
  }

  const stats = s.data;
  const medals = m.data;
  const winRatePct = stats ? Math.round((stats.winRate ?? 0) * 100) : 0;

  const medalPie = medals ? [
    { name: "Ouro", value: medals.gold, fill: "#f59e0b" },
    { name: "Prata", value: medals.silver, fill: "#94a3b8" },
    { name: "Bronze", value: medals.bronze, fill: "#c2410c" },
  ].filter((x) => x.value > 0) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IndicatorCard label="Nacionais" value={stats?.nationalCount ?? 0} />
        <IndicatorCard label="Internacionais" value={stats?.internationalCount ?? 0} />
        <IndicatorCard label="Vitórias" value={stats?.totalWins ?? 0} />
        <IndicatorCard label={`Aproveitamento`} value={`${winRatePct}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4" /> Competições por ano
            </div>
            {(stats?.competitionsByYear.length ?? 0) === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats!.competitionsByYear}>
                  <XAxis dataKey="year" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4" /> Eventos por estado
            </div>
            {(stats?.competitionsByState.length ?? 0) === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats!.competitionsByState}>
                  <XAxis dataKey="state" fontSize={11} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Medal className="h-4 w-4" /> Distribuição de medalhas
            </div>
            {medalPie.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={medalPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label>
                    {medalPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4" /> Atletas mais premiados
            </div>
            {(stats?.topAthletes.length ?? 0) === 0 ? (
              <EmptyChart />
            ) : (
              <div className="divide-y">
                {stats!.topAthletes.map((a, i) => (
                  <div key={a.student_id} className="flex items-center gap-2 py-2 text-sm">
                    <div className="w-6 text-center font-bold text-muted-foreground">{i + 1}º</div>
                    <div className="min-w-0 flex-1 truncate">{a.name}</div>
                    <div className="flex items-center gap-1 text-xs">
                      <span>🥇 {a.gold}</span>
                      <span>🥈 {a.silver}</span>
                      <span>🥉 {a.bronze}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IndicatorCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      <Award className="mr-2 h-5 w-5" /> Sem dados suficientes.
    </div>
  );
}
