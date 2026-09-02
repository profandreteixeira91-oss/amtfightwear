import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  listStaffBelts,
  listStaffGraduations,
  listStaffStudents,
  staffRegisterGraduation,
} from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBR, todayISO } from "@/lib/dates";

export const Route = createFileRoute("/dojo/staff/_portal/graduations")({
  head: () => ({
    meta: [
      { title: "Graduações — Portal da Equipe" },
      { name: "description", content: "Histórico e registro de graduações pelo professor autorizado do dojo." },
      { property: "og:title", content: "Graduações — Portal da Equipe" },
      { property: "og:description", content: "Promoções de faixa registradas no portal do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffGraduations,
});

function StaffGraduations() {
  const level = useStaffLevel("graduations");
  const studentsLevel = useStaffLevel("students");
  const qc = useQueryClient();

  const listFn = useServerFn(listStaffGraduations);
  const beltsFn = useServerFn(listStaffBelts);
  const studentsFn = useServerFn(listStaffStudents);
  const registerFn = useServerFn(staffRegisterGraduation);

  const [studentId, setStudentId] = useState("");
  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState("0");
  const [date, setDate] = useState(todayISO());

  const { data, isLoading } = useQuery({
    queryKey: ["staff-graduations"],
    queryFn: () => listFn(),
    enabled: level !== "none",
  });
  const { data: belts } = useQuery({
    queryKey: ["staff-belts"],
    queryFn: () => beltsFn(),
    enabled: level === "write",
  });
  const { data: students } = useQuery({
    queryKey: ["staff-students", ""],
    queryFn: () => studentsFn({ data: {} }),
    enabled: level === "write" && studentsLevel !== "none",
  });

  const register = useMutation({
    mutationFn: () =>
      registerFn({
        data: { student_id: studentId, belt_id: beltId, degree: Number(degree), graduation_date: date },
      }),
    onSuccess: () => {
      toast.success("Graduação registrada");
      setStudentId("");
      setBeltId("");
      qc.invalidateQueries({ queryKey: ["staff-graduations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (level === "none") return <StaffNoAccess label="Graduações" />;

  const canSubmit = studentId && beltId && date && !register.isPending;

  return (
    <div className="space-y-4">
      <StaffPageHeader title="Graduação" subtitle="Promoções do dojo" readOnly={level === "read"} />

      {level === "write" && (
        <Card className="space-y-3 p-3">
          <div className="text-sm font-semibold">Registrar graduação</div>
          {studentsLevel === "none" ? (
            <p className="text-xs text-muted-foreground">
              Para registrar graduações é necessário também acesso ao módulo Alunos. Solicite ao dono do dojo.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Aluno</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger aria-label="Aluno">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(students ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Faixa</Label>
                <Select value={beltId} onValueChange={setBeltId}>
                  <SelectTrigger aria-label="Faixa">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(belts ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                        {b.modality ? ` · ${b.modality}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Grau</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  aria-label="Grau"
                />
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={() => register.mutate()} disabled={!canSubmit}>
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhuma graduação registrada." />
      ) : (
        <Card className="divide-y divide-border">
          {data.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{g.student_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {g.belt_name ?? "Sem faixa"}
                  {g.degree ? ` · ${g.degree}º grau` : ""}
                  {g.evaluator ? ` · ${g.evaluator}` : ""}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBR(g.graduation_date)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
