import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { listStaffClasses } from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const Route = createFileRoute("/dojo/staff/_portal/schedule")({
  head: () => ({
    meta: [
      { title: "Turmas e Horários — Portal da Equipe" },
      { name: "description", content: "Turmas e horários do dojo disponíveis ao professor autorizado." },
      { property: "og:title", content: "Turmas e Horários — Portal da Equipe" },
      { property: "og:description", content: "Grade de turmas do dojo no portal do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffSchedule,
});

function StaffSchedule() {
  const level = useStaffLevel("schedule");
  const listFn = useServerFn(listStaffClasses);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-classes"],
    queryFn: () => listFn(),
    enabled: level !== "none",
  });

  if (level === "none") return <StaffNoAccess label="Turmas" />;

  return (
    <div>
      <StaffPageHeader title="Turmas" subtitle="Grade de horários do dojo" readOnly={level === "read"} />
      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhuma turma cadastrada." />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}>
              <Card className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {[c.modality, c.level, c.teacher_name].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.students} alunos</Badge>
                </div>
                {c.schedules.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.schedules.map((s, i) => (
                      <span
                        key={`${s.weekday}-${s.start_time}-${i}`}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {WEEKDAYS[s.weekday] ?? "?"} {s.start_time}
                        {s.end_time ? `–${s.end_time}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
