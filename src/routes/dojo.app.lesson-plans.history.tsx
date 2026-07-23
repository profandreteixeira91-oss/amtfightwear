import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLessonPlans } from "@/lib/dojo/lesson-plans.functions";

export const Route = createFileRoute("/dojo/app/lesson-plans/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const listFn = useServerFn(listLessonPlans);
  const today = new Date().toISOString().slice(0, 10);
  const { data: plans } = useQuery({
    queryKey: ["lesson-plans", "history"],
    queryFn: () => listFn({ data: { to: today, status: "ministrada", limit: 500 } }),
  });

  if (!plans?.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nenhuma aula registrada como ministrada ainda. Marque uma aula como <strong>Ministrada</strong> no editor para
        aparecer aqui.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {plans.map((p) => (
        <div key={p.id} className="grid grid-cols-1 gap-1 p-3 md:grid-cols-5">
          <div className="text-sm font-medium">
            {new Date(p.date as string).toLocaleDateString("pt-BR")}
            {p.start_time ? ` · ${(p.start_time as string).slice(0, 5)}` : ""}
          </div>
          <div className="md:col-span-2">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-muted-foreground">
              {(p.dojo_classes as { name?: string } | null)?.name ?? "Sem turma"}
              {p.modality ? ` · ${p.modality}` : ""}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {(p.dojo_team_members as { full_name?: string } | null)?.full_name ?? "Sem professor"}
          </div>
          <div className="text-xs text-muted-foreground">
            {p.duration_min ? `${p.duration_min} min` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
