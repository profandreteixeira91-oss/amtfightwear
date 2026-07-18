import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listDojoStudents, listDojoBelts, addDojoGraduation } from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/graduations")({
  component: GraduationsPage,
});

function GraduationsPage() {
  const studentsFn = useServerFn(listDojoStudents);
  const beltsFn = useServerFn(listDojoBelts);
  const addGrad = useServerFn(addDojoGraduation);
  const qc = useQueryClient();

  const students = useQuery({ queryKey: ["dojo-students"], queryFn: () => studentsFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });

  const [studentId, setStudentId] = useState("");
  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState("");
  const [notes, setNotes] = useState("");

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === beltId),
    [belts.data, beltId]
  );
  const maxDeg = selectedBelt?.max_degrees ?? 4;

  const submit = async () => {
    if (!studentId) return toast.error("Selecione o aluno");
    if (!beltId) return toast.error("Selecione a faixa");
    if (degree < 0 || degree > maxDeg) return toast.error(`Grau deve estar entre 0 e ${maxDeg}`);
    try {
      await addGrad({ data: { student_id: studentId, belt_id: beltId, degree, graduation_date: date, evaluator, notes } });
      toast.success("Graduação registrada");
      setEvaluator(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Graduações</h2>
        <p className="text-sm text-muted-foreground">Sistema de faixas AMT — da Branca à Preta, com graus por faixa.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registrar nova graduação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Aluno</label>
              <select className="border rounded p-2 bg-background w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Selecione…</option>
                {(students.data ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Faixa</label>
              <select className="border rounded p-2 bg-background w-full" value={beltId} onChange={(e) => { setBeltId(e.target.value); setDegree(0); }}>
                <option value="">Selecione…</option>
                {(belts.data ?? []).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Grau</label>
              <select
                className="border rounded p-2 bg-background w-full"
                value={degree}
                onChange={(e) => setDegree(Number(e.target.value))}
                disabled={!selectedBelt}
              >
                {Array.from({ length: maxDeg + 1 }).map((_, i) => (
                  <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>
                ))}
              </select>
              {selectedBelt && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedBelt.name}: até {maxDeg} graus.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Avaliador</label>
              <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Ex.: Prof. André Teixeira" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {selectedBelt && (
            <div className="flex items-center gap-4 p-3 bg-muted/40 rounded">
              <BeltVisual
                colorHex={selectedBelt.color_hex}
                stripeHex={selectedBelt.stripe_hex}
                degree={degree}
                maxDegrees={maxDeg}
                className="min-w-[220px]"
              />
              <div className="text-sm">
                <div className="font-medium">{selectedBelt.name}</div>
                <div className="text-muted-foreground">{degree === 0 ? "Sem grau" : `${degree}º grau`}</div>
              </div>
            </div>
          )}

          <Button onClick={submit}>Registrar graduação</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sistema de faixas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(belts.data ?? []).map((b: any) => (
              <div key={b.id} className="border rounded p-3 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{b.name}</div>
                  <span className="text-[11px] text-muted-foreground">até {b.max_degrees}º grau</span>
                </div>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: b.max_degrees + 1 }).map((_, d) => (
                    <div key={d} className="flex items-center gap-2">
                      <BeltVisual colorHex={b.color_hex} stripeHex={b.stripe_hex} degree={d} maxDegrees={b.max_degrees} />
                      <span className="text-[11px] text-muted-foreground">{d === 0 ? "sem grau" : `${d}º`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alunos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="rounded border">
            {(students.data ?? []).map((s: any) => (
              <Link key={s.id} to="/dojo/app/students/$id" params={{ id: s.id }} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Faixa: {s.belt?.name ?? "—"} {s.current_degree ? `· ${s.current_degree}º grau` : ""}
                  </div>
                </div>
                {s.belt?.color_hex && (
                  <BeltVisual
                    colorHex={s.belt.color_hex}
                    stripeHex={s.belt.stripe_hex}
                    degree={s.current_degree ?? 0}
                    maxDegrees={s.belt?.max_degrees ?? 4}
                  />
                )}
              </Link>
            ))}
            {(students.data ?? []).length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhum aluno cadastrado ainda.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
