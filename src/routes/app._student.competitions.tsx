import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, MapPin, Calendar as CalIcon, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listStudentCompetitions } from "@/lib/student/competitions.functions";
import { scopeLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/app/_student/competitions")({
  head: () => ({ meta: [{ title: "Competições" }] }),
  component: StudentCompetitionsPage,
});

function StudentCompetitionsPage() {
  const fn = useServerFn(listStudentCompetitions);
  const q = useQuery({ queryKey: ["student-competitions"], queryFn: () => fn() });

  const rows = (q.data ?? []) as Array<{ id: string; notes: string | null; competition: { name: string; scope: string | null; city: string | null; state: string | null; start_at: string | null } | null }>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-xl font-bold">Competições da minha academia</h1>
      </header>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {!q.isLoading && rows.length === 0 && (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sua academia ainda não adicionou competições ao calendário.
        </div>
      )}

      <div className="grid gap-3">
        {rows.map((r) => (
          <Link key={r.id} to="/app/competitions/$id" params={{ id: r.id }}>
            <Card className="transition hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{scopeLabel(r.competition?.scope)}</Badge>
                    {r.competition?.start_at && (
                      <span className="text-xs text-muted-foreground">
                        <CalIcon className="mr-1 inline h-3 w-3" />
                        {new Date(r.competition.start_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 line-clamp-2 font-semibold">{r.competition?.name}</h3>
                  {(r.competition?.city || r.competition?.state) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {r.competition?.city}{r.competition?.state && `/${r.competition.state}`}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
