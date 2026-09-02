import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Search } from "lucide-react";

import {
  listStaffAttendance,
  listStaffClasses,
  listStaffStudents,
  staffRegisterCheckin,
} from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRDateTime, todayISO } from "@/lib/dates";

export const Route = createFileRoute("/dojo/staff/_portal/checkin")({
  head: () => ({
    meta: [
      { title: "Frequência — Portal da Equipe" },
      { name: "description", content: "Registro e consulta de presenças do dia pelo professor do dojo." },
      { property: "og:title", content: "Frequência — Portal da Equipe" },
      { property: "og:description", content: "Presenças do dia no portal do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffCheckin,
});

function StaffCheckin() {
  const level = useStaffLevel("checkin");
  const scheduleLevel = useStaffLevel("schedule");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string>("none");

  const attendanceFn = useServerFn(listStaffAttendance);
  const studentsFn = useServerFn(listStaffStudents);
  const classesFn = useServerFn(listStaffClasses);
  const checkinFn = useServerFn(staffRegisterCheckin);

  const today = todayISO();
  const { data: attendance, isLoading } = useQuery({
    queryKey: ["staff-attendance", today],
    queryFn: () => attendanceFn({ data: { date: today } }),
    enabled: level !== "none",
  });
  const { data: students } = useQuery({
    queryKey: ["staff-students", q],
    queryFn: () => studentsFn({ data: { q } }),
    enabled: level === "write" && q.trim().length >= 2,
  });
  const { data: classes } = useQuery({
    queryKey: ["staff-classes"],
    queryFn: () => classesFn(),
    enabled: level === "write" && scheduleLevel !== "none",
  });

  const alreadyToday = useMemo(
    () => new Set((attendance ?? []).map((a) => a.student_id)),
    [attendance],
  );

  const register = useMutation({
    mutationFn: (studentId: string) =>
      checkinFn({ data: { student_id: studentId, class_id: classId === "none" ? null : classId } }),
    onSuccess: () => {
      toast.success("Check-in registrado");
      qc.invalidateQueries({ queryKey: ["staff-attendance", today] });
      qc.invalidateQueries({ queryKey: ["staff-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (level === "none") return <StaffNoAccess label="Frequência" />;

  return (
    <div className="space-y-4">
      <StaffPageHeader
        title="Frequência"
        subtitle={`Presenças de hoje (${formatBRDateTime(new Date()).slice(0, 10)})`}
        readOnly={level === "read"}
      />

      {level === "write" && (
        <Card className="space-y-3 p-3">
          <div className="text-sm font-semibold">Registrar presença</div>
          {classes && classes.length > 0 && (
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger aria-label="Turma do check-in">
                <SelectValue placeholder="Turma (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem turma específica</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite o nome do aluno"
              className="pl-8"
              aria-label="Buscar aluno para check-in"
            />
          </div>
          {q.trim().length >= 2 && (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {(students ?? []).slice(0, 25).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <span className="truncate text-sm">{s.full_name}</span>
                  {alreadyToday.has(s.id) ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                      <Check className="h-3 w-3" /> presente
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => register.mutate(s.id)} disabled={register.isPending}>
                      Check-in
                    </Button>
                  )}
                </li>
              ))}
              {students && students.length === 0 && (
                <li className="p-2 text-xs text-muted-foreground">Nenhum aluno encontrado.</li>
              )}
            </ul>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !attendance || attendance.length === 0 ? (
        <StaffEmpty message="Nenhum check-in registrado hoje." />
      ) : (
        <Card className="divide-y divide-border">
          {attendance.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{a.student_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {a.class_name ?? "Sem turma"} · {a.method ?? "manual"}
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatBRDateTime(a.checked_in_at).slice(-5)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
