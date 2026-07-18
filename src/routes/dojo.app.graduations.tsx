import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listDojoStudents, listDojoBelts, addBulkGraduation,
  listCertificateTemplates, issueCertificate,
} from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import beltsReference from "@/assets/amt-belts-reference.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Award } from "lucide-react";

export const Route = createFileRoute("/dojo/app/graduations")({
  component: NewGraduationPage,
});

type Step = "select" | "grad" | "cert";

function NewGraduationPage() {
  const studentsFn = useServerFn(listDojoStudents);
  const beltsFn = useServerFn(listDojoBelts);
  const bulkFn = useServerFn(addBulkGraduation);
  const templatesFn = useServerFn(listCertificateTemplates);
  const issueFn = useServerFn(issueCertificate);
  const qc = useQueryClient();

  const students = useQuery({ queryKey: ["dojo-students"], queryFn: () => studentsFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => templatesFn() });

  const [step, setStep] = useState<Step>("select");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState("");
  const [notes, setNotes] = useState("");

  const [registered, setRegistered] = useState<Array<{ id: string; student_id: string }>>([]);
  const [templateId, setTemplateId] = useState("");
  const [issued, setIssued] = useState<Set<string>>(new Set());

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === beltId),
    [belts.data, beltId]
  );
  const maxDeg = selectedBelt?.max_degrees ?? 4;

  const selectedRows = useMemo(
    () => (students.data ?? []).filter((s: any) => selectedStudents.has(s.id)),
    [students.data, selectedStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students.data ?? []).filter((s: any) => !q || s.full_name.toLowerCase().includes(q));
  }, [students.data, search]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const goToGrad = () => {
    if (selectedStudents.size === 0) return toast.error("Selecione ao menos um aluno");
    setStep("grad");
  };

  const submitGrad = async () => {
    if (!beltId) return toast.error("Selecione a faixa");
    if (degree < 0 || degree > maxDeg) return toast.error(`Grau entre 0 e ${maxDeg}`);
    try {
      const res = await bulkFn({ data: {
        student_ids: Array.from(selectedStudents),
        belt_id: beltId, degree, graduation_date: date,
        evaluator: evaluator || null, notes: notes || null,
      }});
      toast.success(`${res.count} graduação(ões) registrada(s)`);
      setRegistered(res.graduations ?? []);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
      setStep("cert");
    } catch (e: any) { toast.error(e.message ?? "Erro ao registrar"); }
  };

  const issueOne = async (studentId: string, gradId: string | null) => {
    if (!templateId) return toast.error("Selecione um modelo de certificado");
    const student = selectedRows.find((s: any) => s.id === studentId);
    if (!student) return;
    const tpl = (templates.data ?? []).find((t: any) => t.id === templateId);
    const values: Record<string, string> = {};
    const fields = Array.isArray(tpl?.fields) ? (tpl.fields as any[]) : [];
    fields.forEach((f: any) => {
      if (f.key === "student_name") values[f.key] = student.full_name;
      else if (f.key === "belt") values[f.key] = `${selectedBelt?.name}${degree ? ` — ${degree}º grau` : ""}`;
      else if (f.key === "date") values[f.key] = new Date(date).toLocaleDateString("pt-BR");
      else if (f.key === "signature") values[f.key] = evaluator || "";
      else values[f.key] = "";
    });
    try {
      await issueFn({ data: { student_id: studentId, graduation_id: gradId, template_id: templateId, values } });
      setIssued(prev => new Set(prev).add(studentId));
      toast.success(`Certificado emitido: ${student.full_name}`);
    } catch (e: any) { toast.error(e.message ?? "Erro ao emitir"); }
  };

  const issueAll = async () => {
    if (!templateId) return toast.error("Selecione um modelo de certificado");
    for (const g of registered) await issueOne(g.student_id, g.id);
  };

  const reset = () => {
    setStep("select"); setSelectedStudents(new Set()); setBeltId(""); setDegree(0);
    setEvaluator(""); setNotes(""); setRegistered([]); setTemplateId(""); setIssued(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Nova graduação</h2>
          <p className="text-sm text-muted-foreground">Selecione alunos, registre a graduação e emita os certificados.</p>
        </div>
        {step !== "select" && <Button variant="ghost" onClick={reset}>Recomeçar</Button>}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {(["select", "grad", "cert"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${step === s ? "bg-primary text-primary-foreground" : registered.length && s === "grad" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
            <span className={step === s ? "font-medium" : "text-muted-foreground"}>
              {s === "select" ? "Alunos" : s === "grad" ? "Graduação" : "Certificado"}
            </span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Selecionar alunos
              <span className="text-xs font-normal text-muted-foreground">{selectedStudents.size} selecionado(s)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Buscar aluno…" value={search} onChange={e => setSearch(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set(filteredStudents.map((s: any) => s.id)))}>Todos</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>Limpar</Button>
            </div>
            <div className="border rounded max-h-[420px] overflow-y-auto divide-y">
              {filteredStudents.map((s: any) => (
                <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Graduação atual: {s.belt?.name ?? "Sem faixa"}{s.current_degree ? ` · ${s.current_degree}º grau` : ""}
                    </div>
                  </div>
                  {s.belt?.color_hex && (
                    <BeltVisual name={s.belt.name} colorHex={s.belt.color_hex} stripeHex={s.belt.stripe_hex} degree={s.current_degree ?? 0} maxDegrees={s.belt?.max_degrees ?? 4} />
                  )}
                </label>
              ))}
              {filteredStudents.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum aluno.</div>}
            </div>
            <div className="flex justify-end">
              <Button onClick={goToGrad} disabled={selectedStudents.size === 0}>Continuar →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "grad" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nova graduação · {selectedStudents.size} aluno(s)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded p-3 bg-muted/30 space-y-1 max-h-40 overflow-y-auto">
              {selectedRows.map((s: any) => (
                <div key={s.id} className="text-sm flex items-center justify-between">
                  <span>{s.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    Atual: {s.belt?.name ?? "Sem faixa"}{s.current_degree ? ` · ${s.current_degree}º` : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Faixa</label>
                <select className="border rounded p-2 bg-background w-full" value={beltId} onChange={(e) => { setBeltId(e.target.value); setDegree(0); }}>
                  <option value="">Selecione…</option>
                  {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Grau</label>
                <select className="border rounded p-2 bg-background w-full" value={degree} onChange={(e) => setDegree(Number(e.target.value))} disabled={!selectedBelt}>
                  {Array.from({ length: maxDeg + 1 }).map((_, i) => <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Avaliador</label>
                <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Ex.: Prof. André Teixeira" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Observações</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {selectedBelt && (
              <div className="flex items-center gap-4 p-3 bg-muted/40 rounded">
                <BeltVisual name={selectedBelt.name} colorHex={selectedBelt.color_hex} stripeHex={selectedBelt.stripe_hex} degree={degree} maxDegrees={maxDeg} className="min-w-[220px]" />
                <div className="text-sm">
                  <div className="font-medium">{selectedBelt.name}</div>
                  <div className="text-muted-foreground">{degree === 0 ? "Sem grau" : `${degree}º grau`}</div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("select")}>← Voltar</Button>
              <Button onClick={submitGrad}>Registrar e emitir certificado →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "cert" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" /> Emissão de certificados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Modelo de certificado</label>
              <select className="border rounded p-2 bg-background w-full" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="">Selecione…</option>
                {(templates.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(templates.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Nenhum modelo cadastrado. Crie um na aba <strong>Modelo de certificado</strong>.</p>
              )}
            </div>

            <div className="border rounded divide-y">
              {registered.map(g => {
                const s = selectedRows.find((x: any) => x.id === g.student_id);
                const done = issued.has(g.student_id);
                return (
                  <div key={g.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{selectedBelt?.name}{degree ? ` · ${degree}º grau` : ""}</div>
                    </div>
                    {done ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Emitido</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => issueOne(g.student_id, g.id)} disabled={!templateId}>Emitir</Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Concluir</Button>
              <Button onClick={issueAll} disabled={!templateId || issued.size === registered.length}>
                Emitir todos ({registered.length - issued.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
