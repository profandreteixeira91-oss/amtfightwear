import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listDojoStudents, listDojoBelts, addBulkGraduation,
  listCertificateTemplates, issueCertificate,
} from "@/lib/dojo/dojo.functions";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Award, Eye, Printer } from "lucide-react";

export const Route = createFileRoute("/dojo/app/graduations")({
  head: () => ({ meta: [{ title: "Graduações — AMT Dojo Manager" }] }),
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
  const [modality, setModality] = useState<string>("jiu-jitsu");

  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState("");
  const [notes, setNotes] = useState("");

  const [registered, setRegistered] = useState<Array<{ id: string; student_id: string }>>([]);
  const [templateId, setTemplateId] = useState("");
  const [issued, setIssued] = useState<Map<string, { template: CertificateTemplate; values: Record<string, string>; studentName: string }>>(new Map());
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  // Hide Preta variants from the belt dropdown — they are chosen via the "Grau" selector below.
  const modalities = useMemo(() => {
    const set = new Set<string>();
    (belts.data ?? []).forEach((b: any) => set.add(b.modality ?? "jiu-jitsu"));
    return Array.from(set);
  }, [belts.data]);

  // Hide Preta variants from the belt dropdown — they are chosen via the "Grau" selector below.
  const visibleBelts = useMemo(
    () => (belts.data ?? []).filter((b: any) => {
      if ((b.modality ?? "jiu-jitsu") !== modality) return false;
      const n = b.name as string;
      return !/^preta\s+com\s+aparador$/i.test(n) && !/^preta\s+\d+\s+grau$/i.test(n);
    }),
    [belts.data, modality]
  );

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === beltId),
    [belts.data, beltId]
  );
  const isPretaBase = /^preta$/i.test(selectedBelt?.name ?? "");
  // Preta variant: 'plain' | 'aparador' | 1..6
  const [pretaVariant, setPretaVariant] = useState<string>("plain");

  // Resolve the actual belt row to submit when Preta base is chosen.
  const effectiveBelt = useMemo(() => {
    if (!isPretaBase) return selectedBelt;
    const all = belts.data ?? [];
    if (pretaVariant === "aparador") return all.find((b: any) => /^preta\s+com\s+aparador$/i.test(b.name)) ?? selectedBelt;
    const n = Number(pretaVariant);
    if (n >= 1 && n <= 6) return all.find((b: any) => new RegExp(`^preta\\s+${n}\\s+grau$`, "i").test(b.name)) ?? selectedBelt;
    return selectedBelt;
  }, [isPretaBase, pretaVariant, selectedBelt, belts.data]);

  const maxDeg = selectedBelt?.max_degrees ?? 4;
  const fixedDegreeName = /^vermelha e preta$/i.test(selectedBelt?.name ?? "")
    ? 7
    : /^vermelha e branca$/i.test(selectedBelt?.name ?? "")
    ? 8
    : /^vermelha$/i.test(selectedBelt?.name ?? "")
    ? 9
    : null;
  const isFixedDegree = fixedDegreeName !== null;
  // Force degree to mandatory value when a fixed-degree belt is selected
  if (isFixedDegree && degree !== fixedDegreeName) {
    setTimeout(() => setDegree(fixedDegreeName as number), 0);
  }


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
    const submitBeltId = effectiveBelt?.id ?? beltId;
    const submitDegree = isPretaBase ? 0 : degree;
    if (!isPretaBase && (degree < 0 || degree > maxDeg)) return toast.error(`Grau entre 0 e ${maxDeg}`);
    try {
      const res = await bulkFn({ data: {
        student_ids: Array.from(selectedStudents),
        belt_id: submitBeltId, degree: submitDegree, graduation_date: date,
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
      else if (f.key === "belt") values[f.key] = effectiveBelt?.name ?? `${selectedBelt?.name}${degree ? ` — ${degree}º grau` : ""}`;
      else if (f.key === "date") values[f.key] = new Date(date).toLocaleDateString("pt-BR");
      else if (f.key === "signature") values[f.key] = evaluator || "";
      else values[f.key] = "";
    });
    try {
      await issueFn({ data: { student_id: studentId, graduation_id: gradId, template_id: templateId, values } });
      setIssued(prev => {
        const next = new Map(prev);
        next.set(studentId, { template: tpl as unknown as CertificateTemplate, values, studentName: student.full_name });
        return next;
      });
      toast.success(`Certificado emitido: ${student.full_name}`);
      // Auto-open preview for a single-student flow
      if (registered.length <= 1) setPreviewFor(studentId);
    } catch (e: any) { toast.error(e.message ?? "Erro ao emitir"); }
  };

  const issueAll = async () => {
    if (!templateId) return toast.error("Selecione um modelo de certificado");
    for (const g of registered) await issueOne(g.student_id, g.id);
  };

  const printAll = () => {
    const items = Array.from(issued.values()).map(v => ({ template: v.template, values: v.values }));
    if (items.length === 0) return toast.error("Emita ao menos um certificado");
    openCertificatePrint(items);
  };

  const reset = () => {
    setStep("select"); setSelectedStudents(new Set()); setBeltId(""); setDegree(0);
    setEvaluator(""); setNotes(""); setRegistered([]); setTemplateId(""); setIssued(new Map()); setPreviewFor(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Selecione alunos, registre a graduação e emita os certificados.
        </p>
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
              {filteredStudents.map((s: any) => {
                const belts = (s.current_belts && s.current_belts.length > 0)
                  ? s.current_belts
                  : (s.belt ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                return (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {belts.length === 0
                          ? "Sem faixa"
                          : belts.map((b: any) => `${b.belt.name}${b.degree ? ` · ${b.degree}º grau` : ""}`).join(" • ")}
                      </div>
                    </div>
                    <div className="hidden sm:flex shrink-0 flex-col gap-1 items-end">
                      {belts.slice(0, 3).map((b: any, i: number) => (
                        <BeltVisual
                          key={i}
                          modality={b.belt.modality}
                          name={b.belt.name}
                          colorHex={b.belt.color_hex}
                          stripeHex={b.belt.stripe_hex}
                          degree={b.degree ?? 0}
                          maxDegrees={b.belt?.max_degrees ?? 4}
                          className="w-[220px]"
                        />
                      ))}
                    </div>
                  </label>
                );
              })}

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
                <label className="text-xs text-muted-foreground">Modalidade</label>
                <select
                  className="border rounded p-2 bg-background w-full"
                  value={modality}
                  onChange={(e) => { setModality(e.target.value); setBeltId(""); setDegree(0); }}
                >
                  {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Faixa</label>
                <select className="border rounded p-2 bg-background w-full" value={beltId} onChange={(e) => { setBeltId(e.target.value); setDegree(0); setPretaVariant("plain"); }}>
                  <option value="">Selecione…</option>
                  {visibleBelts.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Grau</label>
                {isPretaBase ? (
                  <select className="border rounded p-2 bg-background w-full" value={pretaVariant} onChange={(e) => setPretaVariant(e.target.value)}>
                    <option value="plain">Sem grau</option>
                    <option value="aparador">Com aparador</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}º grau</option>)}
                  </select>
                ) : (
                  <select className="border rounded p-2 bg-background w-full" value={degree} onChange={(e) => setDegree(Number(e.target.value))} disabled={!selectedBelt || isFixedDegree}>
                    {isFixedDegree ? (
                      <option value={fixedDegreeName as number}>{fixedDegreeName}º grau (obrigatório)</option>
                    ) : (
                      Array.from({ length: maxDeg + 1 }).map((_, i) => <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>)
                    )}
                  </select>
                )}
                {isFixedDegree && <p className="text-[11px] text-muted-foreground mt-1">Esta faixa possui grau fixo.</p>}
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

            {selectedBelt && effectiveBelt && (
              <div className="flex items-center gap-4 p-3 bg-muted/40 rounded">
                <BeltVisual modality={effectiveBelt.modality} name={effectiveBelt.name} colorHex={effectiveBelt.color_hex} stripeHex={effectiveBelt.stripe_hex} degree={isPretaBase ? 0 : degree} maxDegrees={effectiveBelt.max_degrees ?? maxDeg} className="min-w-[220px]" />
                <div className="text-sm">
                  <div className="font-medium">{effectiveBelt.name}</div>
                  <div className="text-muted-foreground">{isPretaBase ? "" : (degree === 0 ? "Sem grau" : `${degree}º grau`)}</div>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Emitido</span>
                        <Button size="sm" variant="outline" onClick={() => setPreviewFor(g.student_id)}>
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => issueOne(g.student_id, g.id)} disabled={!templateId}>Emitir</Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" onClick={reset}>Concluir</Button>
              <div className="flex flex-wrap gap-2">
                {issued.size > 0 && (
                  <Button variant="outline" onClick={printAll}>
                    <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF ({issued.size})
                  </Button>
                )}
                <Button onClick={issueAll} disabled={!templateId || issued.size === registered.length}>
                  Emitir todos ({registered.length - issued.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CertificatePreviewDialog
        open={!!previewFor}
        onOpenChange={(v) => { if (!v) setPreviewFor(null); }}
        template={previewFor ? (issued.get(previewFor)?.template ?? null) : null}
        values={previewFor ? (issued.get(previewFor)?.values ?? {}) : {}}
        title={previewFor ? `Certificado — ${issued.get(previewFor)?.studentName ?? ""}` : undefined}
      />
    </div>
  );
}
