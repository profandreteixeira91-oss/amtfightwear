import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLessonHistory, contentUsageStats } from "@/lib/dojo/lesson-plans.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, FileText, Repeat } from "lucide-react";

export const Route = createFileRoute("/dojo/app/lesson-plans/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const histFn = useServerFn(listLessonHistory);
  const usageFn = useServerFn(contentUsageStats);

  const { data: history } = useQuery({
    queryKey: ["lesson-plans", "history-v2"],
    queryFn: () => histFn({}),
  });
  const { data: usage } = useQuery({
    queryKey: ["lesson-plans", "content-usage"],
    queryFn: () => usageFn({}),
  });

  const totalStudents = (history ?? []).reduce((s, h) => s + (h.students_count ?? 0), 0);
  const totalMin = (history ?? []).reduce((s, h) => s + (h.duration_min ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Aulas ministradas" value={history?.length ?? 0} icon={FileText} />
        <StatCard label="Presenças registradas" value={totalStudents} icon={Users} />
        <StatCard label="Horas ministradas" value={`${Math.round(totalMin / 60)}h`} icon={Clock} />
        <StatCard label="Conteúdos aplicados" value={usage?.length ?? 0} icon={Repeat} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Histórico de aulas ministradas</CardTitle>
          </CardHeader>
          <CardContent>
            {!history?.length ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhuma aula registrada. Abra um plano, clique em <strong>Registrar aula ministrada</strong> e faça a
                chamada para popular o histórico automaticamente.
              </div>
            ) : (
              <div className="divide-y">
                {history.map((h) => {
                  const plan = h.dojo_lesson_plans as { id?: string; title?: string; color?: string; modality?: string } | null;
                  const cls = h.dojo_classes as { name?: string } | null;
                  const teacher = h.dojo_team_members as { full_name?: string } | null;
                  return (
                    <div key={h.id as string} className="flex flex-wrap items-start gap-3 py-3">
                      <div
                        className="mt-1 h-10 w-1.5 rounded"
                        style={{ backgroundColor: plan?.color ?? "#dc2626" }}
                      />
                      <div className="w-24 text-sm">
                        <div className="font-medium">
                          {new Date(h.date as string).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {h.duration_min ? `${h.duration_min} min` : "—"}
                        </div>
                      </div>
                      <div className="min-w-[200px] flex-1">
                        {plan?.id ? (
                          <Link
                            to="/dojo/app/lesson-plans/$id"
                            params={{ id: plan.id }}
                            className="break-words font-medium leading-tight hover:underline"
                          >
                            {plan.title ?? "Aula"}
                          </Link>
                        ) : (
                          <span className="break-words font-medium leading-tight">{plan?.title ?? "Aula"}</span>
                        )}
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="truncate">{cls?.name ?? "Sem turma"}</span>
                          {plan?.modality && <span className="truncate">· {plan.modality}</span>}
                          {teacher?.full_name && <span className="truncate">· {teacher.full_name}</span>}
                        </div>
                        {h.notes ? (
                          <div className="mt-1 rounded bg-muted/50 p-2 text-xs italic text-muted-foreground">
                            "{h.notes}"
                          </div>
                        ) : null}
                        {Array.isArray(h.media_urls) && h.media_urls.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(h.media_urls as string[]).map((u, i) => (
                              <a
                                key={i}
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Mídia {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Users className="mr-1 h-3 w-3" />
                        {h.students_count ?? 0} presentes
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Conteúdos mais aplicados</CardTitle>
          </CardHeader>
          <CardContent>
            {!usage?.length ? (
              <div className="rounded border border-dashed p-6 text-center text-xs text-muted-foreground">
                Ainda não há dados suficientes para inteligência de reuso.
              </div>
            ) : (
              <ul className="space-y-2">
                {usage.slice(0, 15).map((u) => (
                  <li key={u.key} className="flex items-center justify-between rounded border px-2 py-1.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium leading-tight">{u.name || "(sem nome)"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.kind === "content" ? "Biblioteca" : u.kind === "technique" ? "Técnica" : "Item livre"} ·
                        {" "}último uso {new Date(u.last_used).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <Badge variant="secondary">{u.count}×</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
