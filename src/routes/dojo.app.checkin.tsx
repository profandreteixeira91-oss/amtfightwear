import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listAttendance,
  attendanceStats,
  manualCheckin,
  checkinByCode,
  deleteAttendance,
} from "@/lib/dojo/attendance.functions";
import { listDojoStudents, listDojoUnits } from "@/lib/dojo/dojo.functions";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_dojo/dojo/app/checkin")({
  component: DojoCheckin,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function DojoCheckin() {
  const router = useRouter();
  const listAtt = useServerFn(listAttendance);
  const stats = useServerFn(attendanceStats);
  const listStudents = useServerFn(listDojoStudents);
  const listUnits = useServerFn(listDojoUnits);
  const manual = useServerFn(manualCheckin);
  const byCode = useServerFn(checkinByCode);
  const del = useServerFn(deleteAttendance);

  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");

  const attQ = useQuery({ queryKey: ["dojo-att"], queryFn: () => listAtt({ data: {} }) });
  const statQ = useQuery({ queryKey: ["dojo-att-stats"], queryFn: () => stats() });
  const studentsQ = useQuery({ queryKey: ["dojo-students-all"], queryFn: () => listStudents() });
  const unitsQ = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnits() });

  const refresh = () => {
    attQ.refetch();
    statQ.refetch();
  };

  async function doCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const r = await byCode({ data: { code: code.trim(), unitId: unitId || null } });
      toast.success(`Check-in: ${r.student.full_name}`);
      setCode("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function doManual() {
    if (!studentId) return toast.error("Selecione um aluno");
    try {
      await manual({ data: { studentId, unitId: unitId || null } });
      toast.success("Presença registrada");
      setStudentId("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check-in de alunos</h1>
        <p className="text-muted-foreground text-sm">Registre presenças por PIN, QR ou manualmente.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Hoje", v: statQ.data?.today ?? 0 },
          { label: "Últimos 7 dias", v: statQ.data?.week ?? 0 },
          { label: "Este mês", v: statQ.data?.month ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-3xl font-bold">{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Check-in por código</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={doCode} className="space-y-3">
              <div>
                <Label>Unidade</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {(unitsQ.data ?? []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PIN ou token QR</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: 123456" autoFocus />
              </div>
              <Button type="submit">Registrar presença</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Check-in manual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Aluno</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                <SelectContent>
                  {(studentsQ.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={doManual}>Registrar</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Últimas presenças</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {(attQ.data ?? []).map((a: any) => (
              <div key={a.id} className="py-2 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{a.dojo_students?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.checked_in_at).toLocaleString("pt-BR")} · {a.dojo_units?.name ?? "sem unidade"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.method}</Badge>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    await del({ data: { id: a.id } }); refresh();
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(attQ.data ?? []).length === 0 && <div className="text-sm text-muted-foreground py-4">Nenhuma presença registrada.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
