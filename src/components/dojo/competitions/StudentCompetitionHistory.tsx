// Histórico competitivo do aluno — consumido pela aba Competições no perfil.

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { getStudentCompetitionHistory } from "@/lib/dojo/competitions/rankings.functions";

const medalStyle: Record<string, { emoji: string; label: string; className: string }> = {
  gold: { emoji: "🥇", label: "Ouro", className: "bg-amber-500 text-white" },
  silver: { emoji: "🥈", label: "Prata", className: "bg-slate-400 text-white" },
  bronze: { emoji: "🥉", label: "Bronze", className: "bg-orange-600 text-white" },
  participation: { emoji: "🎗️", label: "Participação", className: "bg-zinc-500 text-white" },
};

const fmt = (v?: string | null) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return String(v); }
};

export function StudentCompetitionHistory({ studentId }: { studentId: string }) {
  const historyFn = useServerFn(getStudentCompetitionHistory);
  const q = useQuery({
    queryKey: ["student-comp-history", studentId],
    queryFn: () => historyFn({ data: { student_id: studentId } }),
    staleTime: 60_000,
  });

  const rows = q.data ?? [];

  const stats = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.medal === "gold") acc.gold += 1;
      else if (r.medal === "silver") acc.silver += 1;
      else if (r.medal === "bronze") acc.bronze += 1;
      acc.wins += Number(r.wins ?? 0);
      acc.losses += Number(r.losses ?? 0);
      return acc;
    },
    { total: 0, gold: 0, silver: 0, bronze: 0, wins: 0, losses: 0 },
  );

  const medalTotal = stats.gold + stats.silver + stats.bronze;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        <StatBox label="Disputadas" value={stats.total} />
        <StatBox label="Vitórias" value={stats.wins} />
        <StatBox label="Derrotas" value={stats.losses} />
        <StatBox label="🥇 Ouro" value={stats.gold} />
        <StatBox label="🥈 Prata" value={stats.silver} />
        <StatBox label="🥉 Bronze" value={stats.bronze} />
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Trophy className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Este aluno ainda não possui histórico de competições registrado.
          </div>
          <Link to="/dojo/app/competitions" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Ir para o módulo Competições <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {rows.map((r) => {
            const style = r.medal ? medalStyle[r.medal] : null;
            return (
              <Link
                key={r.athlete_id}
                to="/dojo/app/competitions/$id"
                params={{ id: r.academy_competition_id }}
                className="flex flex-wrap items-center gap-3 p-3 text-sm transition hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {style && <Badge className={style.className}>{style.emoji} {style.label}</Badge>}
                    {r.placement && <Badge variant="outline">{r.placement}º lugar</Badge>}
                    {r.scope && <Badge variant="outline" className="capitalize">{r.scope}</Badge>}
                    <span className="truncate font-medium">{r.competition_name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{fmt(r.competition_start_at)}</span>
                    {r.category && <span>{r.category}</span>}
                    {r.weight_class && <span>{r.weight_class}</span>}
                    {r.belt_name && <span>Faixa: {r.belt_name}</span>}
                    {(r.wins != null || r.losses != null) && (
                      <span>V: {r.wins ?? 0} · D: {r.losses ?? 0}{r.draws ? ` · E: ${r.draws}` : ""}</span>
                    )}
                    {r.submissions ? <span>Finalizações: {r.submissions}</span> : null}
                    {r.knockouts ? <span>KOs: {r.knockouts}</span> : null}
                    {r.ippons ? <span>Ippons: {r.ippons}</span> : null}
                  </div>
                  {r.notes && (
                    <div className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">{r.notes}</div>
                  )}
                  {r.photos && r.photos.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {r.photos.slice(0, 4).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" className="h-10 w-10 rounded object-cover" />
                      ))}
                      {r.photos.length > 4 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          +{r.photos.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Medal className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}

      {medalTotal > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Total de {medalTotal} {medalTotal === 1 ? "medalha" : "medalhas"} conquistada{medalTotal === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
