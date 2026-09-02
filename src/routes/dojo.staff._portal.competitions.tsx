import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { listStaffCompetitions } from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { formatBR } from "@/lib/dates";

export const Route = createFileRoute("/dojo/staff/_portal/competitions")({
  head: () => ({
    meta: [
      { title: "Competições — Portal da Equipe" },
      { name: "description", content: "Calendário competitivo do dojo disponível ao professor autorizado." },
      { property: "og:title", content: "Competições — Portal da Equipe" },
      { property: "og:description", content: "Próximos campeonatos e eventos do dojo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffCompetitions,
});

function StaffCompetitions() {
  const level = useStaffLevel("competitions");
  const listFn = useServerFn(listStaffCompetitions);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-competitions"],
    queryFn: () => listFn(),
    enabled: level !== "none",
  });

  if (level === "none") return <StaffNoAccess label="Competições" />;

  return (
    <div>
      <StaffPageHeader title="Competições" subtitle="Calendário competitivo" readOnly={level === "read"} />
      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhuma competição cadastrada." />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}>
              <Card className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[c.city, c.state, c.modality].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.starts_at ? formatBR(c.starts_at) : ""}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
