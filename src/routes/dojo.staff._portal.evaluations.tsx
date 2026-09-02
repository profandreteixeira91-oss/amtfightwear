import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { listStaffEvaluations } from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dojo/staff/_portal/evaluations")({
  head: () => ({
    meta: [
      { title: "Avaliações — Portal da Equipe" },
      { name: "description", content: "Critérios e provas de avaliação do dojo disponíveis ao professor." },
      { property: "og:title", content: "Avaliações — Portal da Equipe" },
      { property: "og:description", content: "Modelos de avaliação técnica do dojo no portal do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffEvaluations,
});

function StaffEvaluations() {
  const level = useStaffLevel("evaluations");
  const listFn = useServerFn(listStaffEvaluations);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-evaluations"],
    queryFn: () => listFn(),
    enabled: level !== "none",
  });

  if (level === "none") return <StaffNoAccess label="Avaliações" />;

  return (
    <div>
      <StaffPageHeader title="Avaliações" subtitle="Modelos e critérios do dojo" readOnly={level === "read"} />
      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhuma avaliação cadastrada." />
      ) : (
        <ul className="space-y-2">
          {data.map((e) => (
            <li key={e.id}>
              <Card className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[e.modality, e.category].filter(Boolean).join(" · ") || "—"}
                    {e.total_score ? ` · ${e.total_score} pts` : ""}
                    {e.passing_score ? ` · corte ${e.passing_score}` : ""}
                  </div>
                </div>
                <Badge variant={e.active ? "default" : "secondary"}>{e.active ? "Ativa" : "Inativa"}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
