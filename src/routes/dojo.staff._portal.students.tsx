import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import { listStaffStudents } from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dojo/staff/_portal/students")({
  head: () => ({
    meta: [
      { title: "Meus Alunos — Portal da Equipe" },
      { name: "description", content: "Consulta dos alunos do dojo pelo professor autorizado." },
      { property: "og:title", content: "Meus Alunos — Portal da Equipe" },
      { property: "og:description", content: "Lista de alunos do dojo disponível ao professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffStudents,
});

function StaffStudents() {
  const level = useStaffLevel("students");
  const [q, setQ] = useState("");
  const listFn = useServerFn(listStaffStudents);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-students", q],
    queryFn: () => listFn({ data: { q } }),
    enabled: level !== "none",
  });

  if (level === "none") return <StaffNoAccess label="Alunos" />;

  return (
    <div>
      <StaffPageHeader title="Meus Alunos" subtitle="Alunos vinculados ao seu dojo" readOnly={level === "read"} />

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar aluno por nome"
          className="pl-8"
          aria-label="Buscar aluno"
        />
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhum aluno encontrado." />
      ) : (
        <ul className="space-y-2">
          {data.map((s) => (
            <li key={s.id}>
              <Card className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                      {s.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.full_name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {s.belt?.name ?? "Sem faixa"}
                    {s.current_degree ? ` · ${s.current_degree}º grau` : ""}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </div>
                </div>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>
                  {s.status === "active" ? "Ativo" : (s.status ?? "—")}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
