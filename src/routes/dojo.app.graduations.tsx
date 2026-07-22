import { formatDegree, degreeSuffix, degreeUnit } from "@/lib/dojo/degree-label";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listDojoStudents, listDojoBelts, addBulkGraduation,
  listCertificateTemplates, issueCertificate,
  listGraduationProgress,
} from "@/lib/dojo/dojo.functions";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Award, Eye, Printer, GraduationCap, Users, ScrollText, Search, ArrowRight, ArrowLeft, RotateCcw, Info, Sparkles } from "lucide-react";

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
  const progressFn = useServerFn(listGraduationProgress);
  const progress = useQuery({ queryKey: ["dojo-grad-progress"], queryFn: () => progressFn() });
  const progressById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of (progress.data ?? []) as any[]) m.set(p.student_id, p);
    return m;
  }, [progress.data]);

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

  const modalities = useMemo(() => {
    const set = new Set<string>();
    (belts.data ?? []).forEach((b: any) => set.add(b.modality ?? "jiu-jitsu"));
    return Array.from(set);
  }, [belts.data]);

  const visibleBelts = useMemo(
    () => (belts.data ?? []).filter((b: any) => (b.modality ?? "jiu-jitsu") === modality),
    [belts.data, modality]
  );

  const selectedBelt = useMemo(
    () => (belts.data ?? []).find((b: any) => b.id === beltId),
    [belts.data, beltId]
  );
  const selectedIsBJJ = (selectedBelt?.modality ?? "jiu-jitsu") === "jiu-jitsu";
  const isPretaBase = selectedIsBJJ && /^preta$/i.test(selectedBelt?.name ?? "");
  // BJJ Preta usa max_degrees=7 codificados como: 0 base, 1 aparador, 2..7 = 1º..6º grau.
  const effectiveBelt = selectedBelt;

  const maxDeg = selectedBelt?.max_degrees ?? 4;
  const fixedDegreeName = /^vermelha e preta$/i.test(selectedBelt?.name ?? "")
    ? 7
    : /^vermelha e branca$/i.test(selectedBelt?.name ?? "")
    ? 8
    : /^vermelha$/i.test(selectedBelt?.name ?? "")
    ? 9
    : null;
  const isFixedDegree = fixedDegreeName !== null;
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

    // Build a comprehensive values map covering BOTH new keys (aluno_nome…)
    // and legacy keys (student_name, belt, date, signature) so any template
    // — antigo ou novo — preenche corretamente.
    const beltLabel = effectiveBelt?.name ?? `${selectedBelt?.name ?? ""}${degree ? ` — ${degree}º ${degreeUnit(selectedBelt?.modality)}` : ""}`;
    const dateBr = new Date(date).toLocaleDateString("pt-BR");
    const dateLong = new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const now = new Date();
    const values: Record<string, string> = {
      // Aluno
      aluno_nome: student.full_name ?? "",
      aluno_nome_social: (student as any).social_name || student.full_name || "",
      aluno_cpf: (student as any).cpf ?? "",
      aluno_data_nascimento: (student as any).birth_date ? new Date((student as any).birth_date).toLocaleDateString("pt-BR") : "",
      aluno_faixa: beltLabel,
      aluno_grau: String(degree ?? ""),
      aluno_modalidade: (student as any).modality || (student as any).discipline || modality || "",
      aluno_foto: (student as any).photo_url ?? "",
      // Graduação
      graduacao_atual: beltLabel,
      graduacao_data: dateLong,
      graduacao_modalidade: modality || "",
      graduacao_observacoes: notes || "",
      // Professor
      professor_nome: evaluator || "",
      // Certificado
      certificado_data: dateLong,
      certificado_numero: gradId ? gradId.slice(0, 8).toUpperCase() : "",
      // Sistema
      data_atual: now.toLocaleDateString("pt-BR"),
      hora_atual: now.toLocaleTimeString("pt-BR"),
      ano_atual: String(now.getFullYear()),
      // Compat (templates legados)
      student_name: student.full_name ?? "",
      belt: beltLabel,
      date: dateBr,
      signature: evaluator || "",
    };
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

  const stepMeta: Record<Step, { label: string; icon: any; hint: string }> = {
    select: { label: "Alunos", icon: Users, hint: "Escolha quem será graduado" },
    grad: { label: "Graduação", icon: GraduationCap, hint: "Defina faixa, grau e data" },
    cert: { label: "Certificado", icon: ScrollText, hint: "Emita e imprima os diplomas" },
  };

  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
      {/* ============ HERO / HEADER ============ */}
      <header className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/30">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Cerimônia de graduação
              </div>
              <h1 className="mt-1 truncate text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Nova graduação
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Selecione os alunos, registre a graduação e emita os certificados em um único fluxo guiado.
              </p>
            </div>
          </div>
          {step !== "select" && (
            <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Recomeçar
            </Button>
          )}
        </div>
      </header>

      {/* ============ STEPPER ============ */}
      <nav aria-label="Etapas" className="rounded-2xl border bg-card p-4 md:p-5 shadow-sm">
        <ol className="grid grid-cols-3 gap-2 md:gap-3">
          {(["select", "grad", "cert"] as Step[]).map((s, i) => {
            const meta = stepMeta[s];
            const Icon = meta.icon;
            const active = step === s;
            const done =
              (s === "select" && step !== "select") ||
              (s === "grad" && step === "cert");
            return (
              <li key={s} className="relative">
                <div
                  className={`flex items-start gap-3 rounded-xl border p-3 md:p-4 transition-all ${
                    active
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : done
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border bg-background/50"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : done
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4.5 w-4.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Etapa {i + 1}
                    </div>
                    <div
                      className={`truncate text-sm font-semibold ${
                        active ? "text-foreground" : done ? "text-emerald-700" : "text-muted-foreground"
                      }`}
                    >
                      {meta.label}
                    </div>
                    <div className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">
                      {meta.hint}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ============ INFO — CRITÉRIOS ============ */}
      {step === "select" && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent shadow-sm">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Info className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-2 text-sm text-muted-foreground">
                <div className="text-sm font-semibold text-foreground">Critérios de graduação</div>
                <p>
                  Cada aluno abaixo exibe seu progresso em relação ao critério configurado:
                  <span className="mx-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">aulas feitas / mínimo</span>
                  e
                  <span className="mx-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">meses de carência</span>.
                  Alunos com etiqueta
                  <span className="mx-1 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">critério individual</span>
                  possuem regra personalizada.
                </p>
                <p>
                  Defina os critérios padrão em{" "}
                  <a href="/dojo/app/belts" className="font-medium text-primary underline-offset-4 hover:underline">Graduações → Faixas</a>{" "}
                  (tempo mínimo, número de aulas, avaliação ou mérito). Para regras caso a caso, edite o aluno em{" "}
                  <a href="/dojo/app/students" className="font-medium text-primary underline-offset-4 hover:underline">Alunos</a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 1: SELECIONAR ALUNOS ============ */}
      {step === "select" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Selecionar alunos
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Marque os alunos que participarão desta cerimônia.</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selectedStudents.size} selecionado{selectedStudents.size === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno pelo nome…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set(filteredStudents.map((s: any) => s.id)))}>Todos</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>Limpar</Button>
            </div>

            <div className="max-h-[520px] divide-y divide-border overflow-y-auto rounded-xl border bg-background">
              {filteredStudents.map((s: any) => {
                const belts = (s.current_belts && s.current_belts.length > 0)
                  ? s.current_belts
                  : (s.belt ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                const isSelected = selectedStudents.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`group flex cursor-pointer items-center gap-4 p-3.5 transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground ring-primary/40" : "bg-muted text-foreground ring-border"
                    }`}>
                      {initials(s.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{s.full_name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {belts.length === 0
                          ? "Sem faixa"
                          : belts.map((b: any) => `${b.belt.name}${degreeSuffix(b.degree, b.belt?.modality, " · ", b.belt?.name)}`).join(" • ")}
                      </div>
                      {(() => {
                        const p = progressById.get(s.id);
                        if (!p) return null;
                        const badges: Array<{ text: string; ok?: boolean }> = [];
                        const modeLabel =
                          p.criteria_mode === "classes" ? "por aulas"
                          : p.criteria_mode === "time" ? "por tempo"
                          : p.criteria_mode === "evaluation" ? "por avaliação"
                          : "por mérito";
                        badges.push({ text: modeLabel });

                        if (p.criteria_mode === "classes" || p.criteria_mode === "time") {
                          if (p.min_classes != null) {
                            const ok = p.attendance_since >= p.min_classes;
                            badges.push({ text: `${ok ? "✓ " : ""}${p.attendance_since}/${p.min_classes} aulas`, ok });
                          } else {
                            badges.push({ text: `${p.attendance_since} aulas desde a última graduação` });
                          }
                          if (p.min_months != null) {
                            const ok = p.months_since >= p.min_months;
                            badges.push({ text: `${ok ? "✓ " : ""}${p.months_since}/${p.min_months} meses`, ok });
                          } else {
                            badges.push({ text: `${p.months_since} ${p.months_since === 1 ? "mês" : "meses"} de carência` });
                          }
                          if (p.min_classes == null && p.min_months == null) {
                            badges.push({ text: "sem meta definida" });
                          }
                        }
                        return (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {badges.map((b, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono ${
                                  b.ok === true
                                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/20"
                                    : "bg-muted text-muted-foreground ring-1 ring-border"
                                }`}
                              >
                                {b.text}
                              </span>
                            ))}
                            {p.has_override && (
                              <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-500/20">
                                critério individual
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      {belts.slice(0, 3).map((b: any, i: number) => (
                        <BeltAuto
                          key={i}
                          belt={b.belt}
                          degree={b.degree ?? 0}
                          className="w-[220px]"
                        />
                      ))}
                    </div>
                  </label>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="flex flex-col items-center gap-2 p-10 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                  <div className="text-sm font-medium text-muted-foreground">Nenhum aluno encontrado.</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                {filteredStudents.length} aluno{filteredStudents.length === 1 ? "" : "s"} listado{filteredStudents.length === 1 ? "" : "s"}
              </p>
              <Button onClick={goToGrad} disabled={selectedStudents.size === 0} size="lg" className="shadow-md shadow-primary/20">
                Continuar <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 2: GRADUAÇÃO ============ */}
      {step === "grad" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" />
              Nova graduação
              <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {selectedStudents.size} aluno{selectedStudents.size === 1 ? "" : "s"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6 space-y-6">
            {/* Lista de selecionados */}
            <section className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alunos selecionados</div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-3">
                {selectedRows.map((s: any) => {
                  const belts = (s.current_belts && s.current_belts.length > 0)
                    ? s.current_belts
                    : (s.belt ? [{ belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                  const matchesModality = belts.find((b: any) => (b.belt.modality ?? "jiu-jitsu") === modality);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 text-sm ring-1 ring-border/50">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials(s.full_name)}
                        </div>
                        <span className="truncate font-medium">{s.full_name}</span>
                      </div>
                      <span className="shrink-0 text-right text-xs text-muted-foreground">
                        {belts.length === 0
                          ? "Sem faixa"
                          : matchesModality
                          ? `Atual (${modality}): ${matchesModality.belt.name}${matchesModality.degree ? ` · ${matchesModality.degree}º` : ""}`
                          : `Sem faixa em ${modality}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Formulário */}
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Detalhes da graduação</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Modalidade</label>
                  <select
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={modality}
                    onChange={(e) => { setModality(e.target.value); setBeltId(""); setDegree(0); }}
                  >
                    {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Faixa</label>
                  <select
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={beltId}
                    onChange={(e) => { setBeltId(e.target.value); setDegree(0); }}
                  >
                    <option value="">Selecione…</option>
                    {visibleBelts.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {isPretaBase ? "Variação" : (degreeUnit(selectedBelt?.modality) === "Dan" ? "Dan" : "Grau")}
                  </label>
                  <select
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                    value={degree}
                    onChange={(e) => setDegree(Number(e.target.value))}
                    disabled={!selectedBelt || isFixedDegree}
                  >
                    {isFixedDegree ? (
                      <option value={fixedDegreeName as number}>{fixedDegreeName}º {degreeUnit(selectedBelt?.modality)} (obrigatório)</option>
                    ) : (
                      Array.from({ length: maxDeg + 1 }).map((_, i) => (
                        <option key={i} value={i}>{formatDegree(i, selectedBelt?.modality, selectedBelt?.name)}</option>
                      ))
                    )}
                  </select>
                  {isFixedDegree && <p className="text-[11px] text-muted-foreground">Esta faixa possui grau fixo.</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Data</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Avaliador</label>
                  <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Ex.: Prof. André Teixeira" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-foreground">Observações</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
            </section>

            {/* Preview */}
            {selectedBelt && effectiveBelt && (
              <section className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Prévia da faixa</div>
                <div className="flex items-center gap-5 rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-5">
                  <BeltAuto belt={effectiveBelt as any} degree={degree} className="min-w-[240px]" />
                  <div>
                    <div className="text-base font-semibold text-foreground">{effectiveBelt.name}</div>
                    <div className="text-sm text-muted-foreground">{formatDegree(degree, effectiveBelt?.modality, effectiveBelt?.name)}</div>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button variant="ghost" onClick={() => setStep("select")}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={submitGrad} size="lg" className="shadow-md shadow-primary/20">
                Registrar e emitir certificado <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 3: CERTIFICADO ============ */}
      {step === "cert" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Emissão de certificados
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {issued.size}/{registered.length} emitidos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Modelo de certificado</label>
              <select
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {(templates.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(templates.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum modelo cadastrado. Crie um na aba <strong>Modelo de certificado</strong>.
                </p>
              )}
            </div>

            <div className="divide-y divide-border rounded-xl border bg-background">
              {registered.map(g => {
                const s = selectedRows.find((x: any) => x.id === g.student_id);
                const done = issued.has(g.student_id);
                return (
                  <div key={g.id} className={`flex items-center gap-4 p-4 transition-colors ${done ? "bg-emerald-500/5" : ""}`}>
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ${
                      done ? "bg-emerald-500 text-white ring-emerald-500/40" : "bg-muted text-foreground ring-border"
                    }`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : initials(s?.full_name ?? "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s?.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {selectedBelt?.name}{degreeSuffix(degree, selectedBelt?.modality, " · ", selectedBelt?.name)}
                      </div>
                    </div>
                    {done ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 sm:inline-flex">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Emitido
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setPreviewFor(g.student_id)}>
                          <Eye className="mr-1 h-4 w-4" /> Ver
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => issueOne(g.student_id, g.id)} disabled={!templateId}>
                        Emitir
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button variant="ghost" onClick={reset}>Concluir</Button>
              <div className="flex flex-wrap gap-2">
                {issued.size > 0 && (
                  <Button variant="outline" onClick={printAll}>
                    <Printer className="mr-1.5 h-4 w-4" /> Imprimir / PDF ({issued.size})
                  </Button>
                )}
                <Button onClick={issueAll} disabled={!templateId || issued.size === registered.length} className="shadow-md shadow-primary/20">
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

