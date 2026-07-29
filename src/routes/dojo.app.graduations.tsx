import { formatDegree, degreeSuffix, degreeUnit, formatBeltName, formatBeltFull } from "@/lib/dojo/degree-label";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listDojoStudents, listDojoBelts, addBulkGraduation,
  listCertificateTemplates, issueCertificate,
  listGraduationProgress,
  getGraduationSettings, saveGraduationSettings,
} from "@/lib/dojo/dojo.functions";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";
import { computeAge, ageCategory, filterBeltsByAge, isBeltAllowedForAge, suggestNextBelt } from "@/lib/dojo/belt-age-rules";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Award, Eye, Printer, GraduationCap, Users, ScrollText, Search, ArrowRight, ArrowLeft, RotateCcw, Info, Sparkles, DollarSign, Save } from "lucide-react";

export const Route = createFileRoute("/dojo/app/graduations")({
  head: () => ({ meta: [{ title: "Graduações — AMT Dojo Manager" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    student: typeof s.student === "string" ? s.student : undefined,
    session: typeof s.session === "string" ? s.session : undefined,
  }),
  component: NewGraduationPage,
});

type Step = "select" | "grad" | "payment" | "cert";

const MODALITY_LABELS: Record<string, string> = {
  "jiu-jitsu": "Jiu-Jitsu",
  "muay-thai": "Muay Thai",
  judo: "Judô",
  karate: "Karatê",
  "taekwondo": "Taekwondo",
  boxe: "Boxe",
  mma: "MMA",
  capoeira: "Capoeira",
  "kung-fu": "Kung Fu",
  "krav-maga": "Krav Magá",
  wrestling: "Wrestling",
};
function modalityLabel(v: string) {
  if (MODALITY_LABELS[v]) return MODALITY_LABELS[v];
  return String(v).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function NewGraduationPage() {
  const routeSearch = Route.useSearch();
  const studentsFn = useServerFn(listDojoStudents);
  const beltsFn = useServerFn(listDojoBelts);
  const bulkFn = useServerFn(addBulkGraduation);
  const templatesFn = useServerFn(listCertificateTemplates);
  const issueFn = useServerFn(issueCertificate);
  const settingsFn = useServerFn(getGraduationSettings);
  const saveSettingsFn = useServerFn(saveGraduationSettings);
  const qc = useQueryClient();

  const students = useQuery({ queryKey: ["dojo-students"], queryFn: () => studentsFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const templates = useQuery({ queryKey: ["dojo-templates"], queryFn: () => templatesFn() });
  const settings = useQuery({ queryKey: ["dojo-grad-settings"], queryFn: () => settingsFn() });
  const academyModalities = useQuery({
    queryKey: ["dojo-academy-modalities"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as string[];
      const { data } = await supabase
        .from("dojo_academy_profile")
        .select("modalities")
        .eq("owner_id", u.user.id)
        .maybeSingle();
      return ((data?.modalities ?? []) as string[]).map((s) => String(s));
    },
  });
  const progressFn = useServerFn(listGraduationProgress);
  const progress = useQuery({ queryKey: ["dojo-grad-progress"], queryFn: () => progressFn() });
  const progressById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of (progress.data ?? []) as any[]) m.set(p.student_id, p);
    return m;
  }, [progress.data]);

  const priceByBelt: Record<string, number> = ((settings.data as any)?.price_by_belt ?? {}) as Record<string, number>;

  const [step, setStep] = useState<Step>("select");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState<string>("jiu-jitsu");
  // Filtros da lista de seleção
  const [filterModality, setFilterModality] = useState<string>("all");
  const [filterBeltId, setFilterBeltId] = useState<string>("all");

  // Preços por faixa (edição local)
  const [showPricing, setShowPricing] = useState(false);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricingModality, setPricingModality] = useState<string>("all");

  // Defaults ("aplicar a todos")
  const [beltId, setBeltId] = useState("");
  const [degree, setDegree] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState("");
  const [notes, setNotes] = useState("");

  // Graduação individual por aluno (faixa/grau + cobrança)
  const [perStudent, setPerStudent] = useState<Record<string, { beltId: string; degree: number; fee?: string; paid?: boolean }>>({});
  // Modalidade escolhida por aluno (quando o aluno é graduado em mais de uma)
  const [perStudentMod, setPerStudentMod] = useState<Record<string, string>>({});

  // Sincroniza a taxa exibida com os preços salvos em "Preços de graduação
  // por faixa" sempre que os valores mudarem (inclui o caso das settings
  // carregarem depois da tela já estar montada). Assim os valores
  // configurados anteriormente aparecem automaticamente na confirmação de
  // pagamento e são mantidos até o dono ajustar.
  const priceByBeltKey = JSON.stringify(priceByBelt);
  useEffect(() => {
    setPerStudent(prev => {
      let changed = false;
      const next: typeof prev = { ...prev };
      for (const [sid, p] of Object.entries(prev)) {
        if (!p?.beltId) continue;
        const target = priceByBelt[p.beltId];
        if (target == null) continue;
        const targetStr = String(target);
        const feeStr = (p.fee ?? "").toString().trim();
        // Só preenche automaticamente quando o campo está vazio — assim
        // uma edição manual do professor não é sobrescrita, mas os valores
        // configurados pelo dono do dojo sempre aparecem por padrão.
        if (feeStr === "") {
          next[sid] = { ...p, fee: targetStr };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceByBeltKey]);

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
    return (students.data ?? []).filter((s: any) => {
      if (q && !s.full_name.toLowerCase().includes(q)) return false;
      const beltsOfStudent: Array<{ modality?: string; belt?: any; degree?: number }> =
        (s.current_belts && s.current_belts.length > 0)
          ? s.current_belts
          : (s.belt ? [{ modality: s.belt.modality, belt: s.belt, degree: s.current_degree ?? 0 }] : []);
      if (filterModality !== "all") {
        const has = beltsOfStudent.some(
          (b) => (b.belt?.modality ?? b.modality ?? "jiu-jitsu") === filterModality,
        );
        if (!has) return false;
      }
      if (filterBeltId !== "all") {
        const has = beltsOfStudent.some((b) => b.belt?.id === filterBeltId);
        if (!has) return false;
      }
      return true;
    });
  }, [students.data, search, filterModality, filterBeltId]);

  // Faixas disponíveis para o filtro (respeita a modalidade escolhida no filtro)
  const filterBeltOptions = useMemo(() => {
    return (belts.data ?? []).filter(
      (b: any) => filterModality === "all" || (b.modality ?? "jiu-jitsu") === filterModality,
    );
  }, [belts.data, filterModality]);


  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const beltById = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of (belts.data ?? []) as any[]) m.set(b.id, b);
    return m;
  }, [belts.data]);

  const resolveStudentGrad = (studentId: string) => {
    const p = perStudent[studentId] ?? { beltId, degree };
    return { beltId: p.beltId, degree: p.degree, belt: beltById.get(p.beltId) };
  };

  const goToGrad = () => {
    if (selectedStudents.size === 0) return toast.error("Selecione ao menos um aluno");
    // Inicializa entradas por aluno com sugestão da próxima graduação (mantém escolhas prévias).
    const allBelts = (belts.data ?? []) as any[];
    const studentsList = (students.data ?? []) as any[];
    const modDefaults: Record<string, string> = {};
    setPerStudent(prev => {
      const next = { ...prev };
      for (const id of selectedStudents) {
        const s = studentsList.find((x: any) => x.id === id);
        const age = computeAge(s?.birth_date);
        // Faixa atual do aluno na modalidade escolhida (fallback: primeira encontrada).
        const currents: any[] = (s?.current_belts && s.current_belts.length > 0)
          ? s.current_belts
          : (s?.belt ? [{ belt: s.belt, degree: s.current_degree ?? 0 }] : []);
        const currentInMod = currents.find((b: any) => (b.belt?.modality ?? "jiu-jitsu") === modality) ?? currents[0] ?? null;
        const targetMod = perStudentMod[id] ?? currentInMod?.belt?.modality ?? modality;
        modDefaults[id] = targetMod;
        if (next[id]?.beltId) continue;
        const currentTarget = currents.find((b: any) => (b.belt?.modality ?? "jiu-jitsu") === targetMod) ?? null;
        const suggestion = suggestNextBelt({
          current: currentTarget ? { belt: currentTarget.belt, degree: currentTarget.degree ?? 0 } : null,
          belts: allBelts,
          modality: targetMod,
          age,
        });
        if (suggestion) {
          next[id] = {
            beltId: suggestion.beltId,
            degree: suggestion.degree,
            fee: String(priceByBelt[suggestion.beltId] ?? ""),
            paid: prev[id]?.paid ?? false,
          };
        } else if (!next[id]) {
          next[id] = { beltId: "", degree: 0, fee: "", paid: false };
        }
      }
      return next;
    });
    setPerStudentMod(prev => ({ ...modDefaults, ...prev }));
    setStep("grad");
  };

  // Deep-link vindo da avaliação aprovada: ?student=<id>&session=<id>
  const autoStudentApplied = useMemo(() => ({ current: false }), []);
  useEffect(() => {
    if (autoStudentApplied.current) return;
    const targetId = routeSearch?.student;
    if (!targetId) return;
    if (!students.data || !belts.data) return;
    const s = (students.data as any[]).find((x: any) => x.id === targetId);
    if (!s) return;
    autoStudentApplied.current = true;
    setSelectedStudents(new Set([targetId]));
    // aguarda tick para o estado propagar e então avança
    setTimeout(() => goToGrad(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSearch?.student, students.data, belts.data]);

  const savePrices = async () => {
    try {
      setSavingPrices(true);
      const priceMap: Record<string, number> = {};
      for (const [bid, raw] of Object.entries(priceDraft)) {
        const v = Number((raw ?? "").toString().replace(",", ".").trim());
        if (!Number.isNaN(v) && v > 0) priceMap[bid] = v;
      }
      await saveSettingsFn({ data: {
        system: (settings.data as any)?.system ?? "merit",
        classes_by_belt: (settings.data as any)?.classes_by_belt ?? {},
        period_months_by_belt: (settings.data as any)?.period_months_by_belt ?? {},
        default_classes: (settings.data as any)?.default_classes ?? 60,
        default_period_months: (settings.data as any)?.default_period_months ?? 12,
        price_by_belt: priceMap,
      }});
      toast.success("Preços salvos");
      qc.invalidateQueries({ queryKey: ["dojo-grad-settings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar preços");
    } finally {
      setSavingPrices(false);
    }
  };

  const applyDefaultsToAll = () => {
    if (!beltId) return toast.error("Selecione uma faixa padrão");
    const chosen = beltById.get(beltId);
    const studentsList = (students.data ?? []) as any[];
    let skipped = 0;
    setPerStudent(prev => {
      const next = { ...prev };
      for (const id of selectedStudents) {
        const s = studentsList.find((x: any) => x.id === id);
        const age = computeAge(s?.birth_date);
        if (chosen && !isBeltAllowedForAge(chosen, age)) { skipped += 1; continue; }
        next[id] = { beltId, degree, fee: String(priceByBelt[beltId] ?? ""), paid: prev[id]?.paid ?? false };
      }
      return next;
    });
    if (skipped > 0) {
      toast.warning(`Faixa aplicada — ${skipped} aluno(s) ignorado(s) por regra de idade`);
    } else {
      toast.success("Faixa aplicada a todos os alunos");
    }
  };

  // Troca a modalidade em que o aluno será graduado e recalcula a sugestão
  const setStudentModality = (studentId: string, newMod: string) => {
    setPerStudentMod(prev => ({ ...prev, [studentId]: newMod }));
    const s = (students.data ?? []).find((x: any) => x.id === studentId) as any;
    const age = computeAge(s?.birth_date);
    const currents: any[] = (s?.current_belts && s.current_belts.length > 0)
      ? s.current_belts
      : (s?.belt ? [{ belt: s.belt, degree: s.current_degree ?? 0 }] : []);
    const currentTarget = currents.find((b: any) => (b.belt?.modality ?? "jiu-jitsu") === newMod) ?? null;
    const suggestion = suggestNextBelt({
      current: currentTarget ? { belt: currentTarget.belt, degree: currentTarget.degree ?? 0 } : null,
      belts: (belts.data ?? []) as any[],
      modality: newMod,
      age,
    });
    setPerStudent(prev => ({
      ...prev,
      [studentId]: {
        beltId: suggestion?.beltId ?? "",
        degree: suggestion?.degree ?? 0,
        fee: suggestion ? String(priceByBelt[suggestion.beltId] ?? "") : "",
        paid: prev[studentId]?.paid ?? false,
      },
    }));
  };

  const setStudentBelt = (studentId: string, newBeltId: string) => {
    setPerStudent(prev => ({
      ...prev,
      [studentId]: {
        beltId: newBeltId,
        degree: 0,
        fee: String(priceByBelt[newBeltId] ?? ""),
        paid: prev[studentId]?.paid ?? false,
      },
    }));
  };
  const setStudentDegree = (studentId: string, newDegree: number) => {
    setPerStudent(prev => ({
      ...prev,
      [studentId]: {
        beltId: prev[studentId]?.beltId ?? "",
        degree: newDegree,
        fee: prev[studentId]?.fee,
        paid: prev[studentId]?.paid,
      },
    }));
  };
  const setStudentFee = (studentId: string, fee: string) => {
    setPerStudent(prev => ({
      ...prev,
      [studentId]: {
        beltId: prev[studentId]?.beltId ?? "",
        degree: prev[studentId]?.degree ?? 0,
        fee,
        paid: prev[studentId]?.paid ?? false,
      },
    }));
  };
  const setStudentPaid = (studentId: string, paid: boolean) => {
    setPerStudent(prev => ({
      ...prev,
      [studentId]: {
        beltId: prev[studentId]?.beltId ?? "",
        degree: prev[studentId]?.degree ?? 0,
        fee: prev[studentId]?.fee,
        paid,
      },
    }));
  };

  const goToPayment = () => {
    const missing: string[] = [];
    for (const sid of selectedStudents) {
      const p = perStudent[sid];
      if (!p?.beltId) missing.push(sid);
    }
    if (missing.length > 0) {
      return toast.error(`Selecione a faixa de ${missing.length} aluno(s) pendente(s)`);
    }
    // sincroniza a taxa da faixa selecionada com o valor atual definido em
    // "Preços de graduação por faixa" — se o dono do dojo acabou de ajustar,
    // o valor precisa refletir imediatamente na confirmação de pagamento.
    setPerStudent(prev => {
      const next = { ...prev };
      for (const sid of selectedStudents) {
        const p = next[sid];
        if (p && p.beltId && priceByBelt[p.beltId] != null) {
          next[sid] = { ...p, fee: String(priceByBelt[p.beltId]) };
        }
      }
      return next;
    });
    setStep("payment");
  };

  const paymentTotals = useMemo(() => {
    let paid = 0, pending = 0;
    for (const sid of selectedStudents) {
      const p = perStudent[sid];
      const raw = (p?.fee ?? "").toString().replace(",", ".").trim();
      const fallback = p?.beltId && priceByBelt[p.beltId] != null ? Number(priceByBelt[p.beltId]) : 0;
      const v = raw === "" ? fallback : Number(raw);
      if (Number.isNaN(v)) continue;
      if (p?.paid) paid += v; else pending += v;
    }
    return { paid, pending, total: paid + pending };
  }, [selectedStudents, perStudent, priceByBeltKey]);

  const submitGrad = async () => {
    const items = Array.from(selectedStudents).map(sid => {
      const p = perStudent[sid] ?? { beltId, degree };
      const rawFee = (p.fee ?? "").toString().replace(",", ".").trim();
      const fallbackFee = p.beltId && priceByBelt[p.beltId] != null ? Number(priceByBelt[p.beltId]) : NaN;
      const feeNum = rawFee === "" ? fallbackFee : Number(rawFee);
      return {
        student_id: sid,
        belt_id: p.beltId,
        degree: p.degree,
        fee_amount: Number.isFinite(feeNum) ? feeNum : null,
        paid: !!p.paid,
      };
    });
    const missing = items.filter(i => !i.belt_id);
    if (missing.length > 0) {
      return toast.error(`Selecione a faixa de ${missing.length} aluno(s) pendente(s)`);
    }
    for (const it of items) {
      const b = beltById.get(it.belt_id);
      const max = b?.max_degrees ?? 4;
      if (it.degree < 0 || it.degree > max) {
        return toast.error(`Grau inválido para ${b?.name ?? "faixa"}`);
      }
    }

    try {
      const res = await bulkFn({ data: {
        items,
        graduation_date: date,
        evaluator: evaluator || null,
        notes: notes || null,
      }});

      const invCount = (res as any).invoices?.length ?? 0;
      toast.success(
        `${res.count} graduação(ões) registrada(s)` +
        (invCount > 0 ? ` · ${invCount} cobrança(s) lançada(s) no financeiro` : ""),
      );
      setRegistered(res.graduations ?? []);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
      qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setStep("cert");
    } catch (e: any) { toast.error(e.message ?? "Erro ao registrar"); }
  };

  const issueOne = async (studentId: string, gradId: string | null) => {
    if (!templateId) return toast.error("Selecione um modelo de certificado");
    const student = selectedRows.find((s: any) => s.id === studentId);
    if (!student) return;
    const tpl = (templates.data ?? []).find((t: any) => t.id === templateId);

    const { belt: studentBelt, degree: studentDeg } = resolveStudentGrad(studentId);
    const studentMod = studentBelt?.modality ?? modality;

    // Rótulo completo com prefixo "Faixa"/"Grau" + grau, conforme modalidade
    // (configurado em Modalidades e Faixas). Ex.: "Faixa Marrom", "Grau Preto · 2º grau".
    const beltLabel = studentBelt?.name
      ? formatBeltFull(studentBelt.name, studentMod, studentDeg)
      : "";
    const beltNameOnly = studentBelt?.name ? formatBeltName(studentBelt.name, studentMod) : "";
    const grauLabel = studentDeg ? formatDegree(studentDeg, studentMod, studentBelt?.name) : "";
    const grauValueForVar = /^sem\s+(grau|dan)$/i.test(grauLabel) ? "" : grauLabel;
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
      aluno_faixa_nome: beltNameOnly,
      aluno_grau: grauValueForVar,
      aluno_grau_numero: String(Number(studentDeg ?? 0) || 0),
      aluno_modalidade: (student as any).modality || (student as any).discipline || studentMod || "",
      aluno_foto: (student as any).photo_url ?? "",
      // Graduação
      graduacao_atual: beltLabel,
      graduacao_data: dateLong,
      graduacao_modalidade: studentMod || "",
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
    setPerStudent({});
  };


  const stepMeta: Record<Step, { label: string; icon: any; hint: string }> = {
    select: { label: "Alunos", icon: Users, hint: "Escolha quem será graduado" },
    grad: { label: "Graduação", icon: GraduationCap, hint: "Defina faixa e grau" },
    payment: { label: "Pagamento", icon: Award, hint: "Confirme taxas e status" },
    cert: { label: "Certificado", icon: ScrollText, hint: "Emita e imprima os diplomas" },
  };

  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:gap-8 md:p-6">
      {/* ============ HERO / HEADER ============ */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-[0_30px_80px_-40px_rgba(220,38,38,0.65)]">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.06),transparent_45%)]" />

        <div className="relative flex flex-col gap-4 p-5 sm:p-7">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white shadow-[0_10px_25px_-10px_rgba(220,38,38,0.9)] ring-1 ring-white/20">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200 backdrop-blur">
                  <Sparkles className="h-3 w-3" /> Cerimônia
                </div>
                <h1 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
                  Nova graduação
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-neutral-300">
                  Selecione os alunos, registre a graduação e emita os certificados em um único fluxo guiado.
                </p>
              </div>
            </div>
            {step !== "select" && (
              <Button variant="outline" size="sm" onClick={reset} className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Recomeçar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ============ STEPPER ============ */}
      <nav aria-label="Etapas" className="rounded-2xl border border-white/10 bg-neutral-950/60 p-3 backdrop-blur md:p-4">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {(["select", "grad", "payment", "cert"] as Step[]).map((s, i) => {
            const meta = stepMeta[s];
            const Icon = meta.icon;
            const active = step === s;
            const order: Step[] = ["select", "grad", "payment", "cert"];
            const done = order.indexOf(s) < order.indexOf(step);
            return (
              <li key={s} className="relative">
                <div
                  className={`flex items-start gap-3 rounded-xl border p-3 transition-all md:p-4 ${
                    active
                      ? "border-red-500/40 bg-gradient-to-br from-red-950/60 via-neutral-950/80 to-neutral-950/80 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.9)]"
                      : done
                        ? "border-emerald-400/30 bg-emerald-500/[0.06]"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ring-1 transition-colors ${
                      active
                        ? "bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-white/20 shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)]"
                        : done
                          ? "bg-emerald-500 text-white ring-emerald-300/40"
                          : "bg-white/5 text-neutral-300 ring-white/10"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                      Etapa {i + 1}
                    </div>
                    <div
                      className={`truncate text-sm font-semibold ${
                        active ? "text-white" : done ? "text-emerald-200" : "text-neutral-300"
                      }`}
                    >
                      {meta.label}
                    </div>
                    <div className="mt-0.5 hidden truncate text-xs text-neutral-400 md:block">
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
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/40 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.5)]">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
          <div className="relative flex gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)]">
              <Info className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2 text-sm text-neutral-300">
              <div className="text-sm font-semibold text-white">Critérios de graduação</div>
              <p>
                Cada aluno abaixo exibe seu progresso em relação ao critério configurado:
                <span className="mx-1 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white">aulas feitas / mínimo</span>
                e
                <span className="mx-1 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white">meses de carência</span>.
                Alunos com etiqueta
                <span className="mx-1 inline-flex items-center rounded-md border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">critério individual</span>
                possuem regra personalizada.
              </p>
              <p>
                Defina os critérios padrão em{" "}
                <a href="/dojo/app/belts" className="font-medium text-red-300 underline-offset-4 hover:underline">Graduações → Faixas</a>{" "}
                (tempo mínimo, número de aulas, avaliação ou mérito). Para regras caso a caso, edite o aluno em{" "}
                <a href="/dojo/app/students" className="font-medium text-red-300 underline-offset-4 hover:underline">Alunos</a>.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* ============ PREÇOS POR FAIXA ============ */}
      {step === "select" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Preços de graduação por faixa
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Defina o valor fixo cobrado por faixa para gerar contas no Financeiro.
                </p>
              </div>
              <Button
                size="sm"
                variant={showPricing ? "secondary" : "outline"}
                className="w-full sm:w-auto"
                onClick={() => {
                  const opening = !showPricing;
                  setShowPricing(opening);
                  if (opening) {
                    const draft: Record<string, string> = {};
                    for (const [bid, v] of Object.entries(priceByBelt)) draft[bid] = String(v);
                    setPriceDraft(draft);
                  }
                }}
              >
                {showPricing ? "Fechar" : "Configurar preços"}
              </Button>
            </div>
          </CardHeader>
          {showPricing && (() => {
            const acadMods = (academyModalities.data ?? []).map((m) => m.toLowerCase());
            const filteredByAcademy = acadMods.length > 0
              ? (belts.data ?? []).filter((b: any) => acadMods.includes(String(b.modality ?? "jiu-jitsu").toLowerCase()))
              : (belts.data ?? []);
            const modalityOptions = Array.from(new Set(filteredByAcademy.map((b: any) => String(b.modality ?? "jiu-jitsu")))) as string[];
            const beltsToShow = pricingModality === "all"
              ? filteredByAcademy
              : filteredByAcademy.filter((b: any) => String(b.modality ?? "jiu-jitsu") === pricingModality);
            return (
            <CardContent className="p-4 md:p-5 space-y-4">
              {acadMods.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Nenhuma modalidade definida em <a href="/dojo/app/account?tab=academy" className="font-medium underline">Minha Conta</a>.
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Filtrar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPricingModality("all")}
                      className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${pricingModality === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                    >
                      Todas
                    </button>
                    {modalityOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPricingModality(m)}
                        className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${pricingModality === m ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Aplicar valor em massa</div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:max-w-[140px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        id="bulk-price-input"
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9 pl-8"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="whitespace-nowrap"
                      onClick={() => {
                        const el = document.getElementById("bulk-price-input") as HTMLInputElement | null;
                        const v = (el?.value ?? "").trim();
                        if (!v) { toast.error("Digite um valor"); return; }
                        setPriceDraft((prev) => {
                          const next = { ...prev };
                          for (const b of beltsToShow) next[(b as any).id] = v;
                          return next;
                        });
                        toast.success(`Valor aplicado a ${beltsToShow.length} ${beltsToShow.length === 1 ? "faixa" : "faixas"}`);
                      }}
                    >
                      Aplicar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => {
                        setPriceDraft((prev) => {
                          const next = { ...prev };
                          for (const b of beltsToShow) next[(b as any).id] = "";
                          return next;
                        });
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-border rounded-xl border bg-background">
                {beltsToShow.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma faixa disponível para as modalidades selecionadas.</div>
                )}
                {beltsToShow.map((b: any) => (
                  <div key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      <div className="hidden sm:block">
                        <BeltAuto belt={b} degree={0} className="w-[160px] shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-foreground">{b.name}</div>
                        <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{b.modality ?? "jiu-jitsu"}</div>
                        <div className="mt-1 sm:hidden">
                          <BeltAuto belt={b} degree={0} className="w-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          inputMode="decimal"
                          placeholder="0,00"
                          className="h-9 pl-8"
                          value={priceDraft[b.id] ?? ""}
                          onChange={(e) => setPriceDraft(prev => ({ ...prev, [b.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowPricing(false)}>Cancelar</Button>
                <Button size="sm" onClick={savePrices} disabled={savingPrices}>
                  <Save className="mr-1.5 h-4 w-4" /> {savingPrices ? "Salvando…" : "Salvar preços"}
                </Button>
              </div>
            </CardContent>
            );
          })()}
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setSelectedStudents(new Set(filteredStudents.map((s: any) => s.id)))}>Todos</Button>
                <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setSelectedStudents(new Set())}>Limpar</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Modalidade
                </label>
                <select
                  value={filterModality}
                  onChange={(e) => {
                    setFilterModality(e.target.value);
                    setFilterBeltId("all");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  <option value="all">Todas as modalidades</option>
                  {modalities.map((m) => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Graduação atual
                </label>
                <select
                  value={filterBeltId}
                  onChange={(e) => setFilterBeltId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todas as graduações</option>
                  {filterBeltOptions.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {filterModality === "all" ? ` (${b.modality ?? "jiu-jitsu"})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {(filterModality !== "all" || filterBeltId !== "all") && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterModality("all");
                      setFilterBeltId("all");
                    }}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar filtros
                  </Button>
                </div>
              )}
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
                    className={`group flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(s.id)}
                        className="h-5 w-5 shrink-0 accent-primary"
                      />
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground ring-primary/40" : "bg-muted text-foreground ring-border"
                      }`}>
                        {initials(s.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-foreground">{s.full_name}</div>
                        <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                          {belts.length === 0
                            ? "Sem faixa"
                            : belts.map((b: any) => formatBeltFull(b.belt.name, b.belt?.modality, b.degree)).join(" • ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
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
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Nova graduação</span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {selectedStudents.size} aluno{selectedStudents.size === 1 ? "" : "s"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            {/* Padrões — aplicar a todos (opcional) */}
            <section className="space-y-4 rounded-xl border border-dashed bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Padrão (opcional)</div>
                  <p className="text-xs text-muted-foreground">Defina uma faixa e grau para aplicar em massa.</p>
                </div>
                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={applyDefaultsToAll} disabled={!beltId}>
                  Aplicar a todos
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
                  <label className="text-xs font-medium text-foreground">Faixa padrão</label>
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
                </div>
              </div>
            </section>

            {/* Graduação individual por aluno */}
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Graduação por aluno
                </div>
                <span className="min-w-0 text-[11px] text-muted-foreground">
                  Cada aluno pode receber uma faixa/grau diferente
                </span>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border bg-background">
                {selectedRows.map((s: any) => {
                  const entry = perStudent[s.id] ?? { beltId: "", degree: 0 };
                  const chosenBelt = beltById.get(entry.beltId);
                  const current = (s.current_belts && s.current_belts.length > 0)
                    ? s.current_belts
                    : (s.belt ? [{ belt: s.belt, degree: s.current_degree ?? 0 }] : []);
                  // Modalidades em que o aluno já é graduado
                  const studentMods: string[] = Array.from(
                    new Set(current.map((b: any) => String(b.belt?.modality ?? b.modality ?? "jiu-jitsu"))),
                  );
                  const multiMod = studentMods.length > 1;
                  const chosenMod =
                    perStudentMod[s.id] ?? chosenBelt?.modality ?? studentMods[0] ?? modality;
                  const chosenMax = chosenBelt?.max_degrees ?? 4;
                  const chosenFixed = /^vermelha e preta$/i.test(chosenBelt?.name ?? "")
                    ? 7
                    : /^vermelha e branca$/i.test(chosenBelt?.name ?? "")
                    ? 8
                    : /^vermelha$/i.test(chosenBelt?.name ?? "")
                    ? 9
                    : null;
                  const studentAge = computeAge(s.birth_date);
                  const ageCat = ageCategory(studentAge);
                  const beltOptionsRaw = (belts.data ?? []).filter(
                    (b: any) => (b.modality ?? "jiu-jitsu") === chosenMod
                  );
                  const beltOptions = filterBeltsByAge(beltOptionsRaw as any[], studentAge) as any[];
                  // Se a faixa selecionada estiver fora do filtro por idade, mantém no dropdown para não travar o valor.
                  if (entry.beltId && !beltOptions.some((b: any) => b.id === entry.beltId)) {
                    const extra = beltOptionsRaw.find((b: any) => b.id === entry.beltId);
                    if (extra) beltOptions.push(extra);
                  }
                  const currentMatch = current.find((b: any) => (b.belt?.modality ?? "jiu-jitsu") === chosenMod);
                  const nextSuggest = suggestNextBelt({
                    current: currentMatch ? { belt: currentMatch.belt, degree: currentMatch.degree ?? 0 } : null,
                    belts: (belts.data ?? []) as any[],
                    modality: chosenMod,
                    age: studentAge,
                  });
                  const suggestedBelt = nextSuggest ? beltById.get(nextSuggest.beltId) : null;

                  return (
                    <div
                      key={s.id}
                      className={`flex flex-col gap-4 p-4 md:grid md:items-center md:gap-3 ${
                        multiMod
                          ? "md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)]"
                          : "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(s.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="truncate text-sm font-semibold">{s.full_name}</div>
                            {chosenMod === "jiu-jitsu" && ageCat !== "any" && (
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ageCat === "kids" ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"}`}>
                                {ageCat === "kids" ? `Infantil${studentAge != null ? ` · ${studentAge}a` : ""}` : `Adulto${studentAge != null ? ` · ${studentAge}a` : ""}`}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {currentMatch
                              ? `Atual: ${formatBeltFull(currentMatch.belt.name, currentMatch.belt?.modality, currentMatch.degree)}`
                              : "Sem faixa nesta modalidade"}
                          </div>
                          {suggestedBelt && (
                            <div className="truncate text-[11px] text-primary/80">
                              <Sparkles className="mr-1 inline h-3 w-3 align-text-bottom" />
                              Sugerida: {formatBeltFull(suggestedBelt.name, suggestedBelt.modality, nextSuggest!.degree)}
                            </div>
                          )}
                        </div>
                      </div>

                      {multiMod && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Modalidade
                          </label>
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={chosenMod}
                            onChange={(e) => setStudentModality(s.id, e.target.value)}
                          >
                            {studentMods.map((m) => (
                              <option key={m} value={m}>{modalityLabel(m)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Faixa</label>
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={entry.beltId}
                          onChange={(e) => setStudentBelt(s.id, e.target.value)}
                        >
                          <option value="">Selecione…</option>
                          {beltOptions.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {degreeUnit(chosenBelt?.modality) === "Dan" ? "Dan" : "Grau"}
                        </label>
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                          value={entry.degree}
                          onChange={(e) => setStudentDegree(s.id, Number(e.target.value))}
                          disabled={!entry.beltId || chosenFixed !== null}
                        >
                          {chosenFixed !== null ? (
                            <option value={chosenFixed}>{chosenFixed}º {degreeUnit(chosenBelt?.modality)}</option>
                          ) : (
                            Array.from({ length: chosenMax + 1 }).map((_, i) => (
                              <option key={i} value={i}>{formatDegree(i, chosenBelt?.modality, chosenBelt?.name)}</option>
                            ))
                          )}
                        </select>
                      </div>


                      <div className="flex items-center justify-end">
                        {chosenBelt ? (
                          <BeltAuto belt={chosenBelt as any} degree={entry.degree} className="w-full max-w-[220px]" />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Selecione a faixa</span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>

            {/* Dados comuns */}
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dados da cerimônia</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Data</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Avaliador</label>
                  <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Ex.: Prof. André Teixeira" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Observações</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
            </section>


            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button variant="ghost" onClick={() => setStep("select")}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={goToPayment} size="lg" className="shadow-md shadow-primary/20">
                Próximo: pagamento <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 3: PAGAMENTO ============ */}
      {step === "payment" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Award className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Confirmação de pagamento</span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {selectedRows.length} aluno(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Ajuste a taxa de graduação de cada aluno e marque como <b>Pago</b> ou deixe como <b>Pendente</b>.
              Um lançamento em <b>Contas a receber</b> será criado automaticamente no financeiro.
            </p>

            <div className="divide-y rounded-xl border bg-card">
              {selectedRows.map((s: any) => {
                const entry = perStudent[s.id] ?? { beltId: "", degree: 0, fee: "", paid: false };
                const belt = beltById.get(entry.beltId);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-4 p-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)] md:items-center md:gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {initials(s.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{s.full_name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {belt
                            ? `Nova: ${formatBeltName(belt.name, belt.modality)}${entry.degree ? ` · ${formatDegree(entry.degree, belt.modality, belt.name)}` : ""}`
                            : "Sem faixa definida"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Taxa (R$)</label>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9"
                        value={
                          (entry.fee ?? "").toString().trim() !== ""
                            ? (entry.fee ?? "")
                            : entry.beltId && priceByBelt[entry.beltId] != null
                              ? String(priceByBelt[entry.beltId])
                              : ""
                        }
                        onChange={(e) => setStudentFee(s.id, e.target.value)}
                      />
                      {entry.beltId && priceByBelt[entry.beltId] != null && (
                        <div className="text-[10px] text-muted-foreground">
                          padrão R$ {Number(priceByBelt[entry.beltId]).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Status</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStudentPaid(s.id, true)}
                          className={`h-9 flex-1 rounded-md border px-2 text-xs font-semibold transition ${
                            entry.paid
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Pago
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentPaid(s.id, false)}
                          className={`h-9 flex-1 rounded-md border px-2 text-xs font-semibold transition ${
                            !entry.paid
                              ? "border-amber-500 bg-amber-500/10 text-amber-700"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Pendente
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end text-right">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor</div>
                        <div className="text-lg font-bold tabular-nums">
                          R$ {(() => {
                            const raw = (entry.fee ?? "").toString().replace(",", ".").trim();
                            const fallback = entry.beltId && priceByBelt[entry.beltId] != null ? Number(priceByBelt[entry.beltId]) : 0;
                            return (raw === "" ? fallback : Number(raw) || 0).toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
              <div className="flex flex-col sm:block">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total geral</div>
                <div className="text-xl font-black tabular-nums">
                  R$ {paymentTotals.total.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col sm:block">
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Pago</div>
                <div className="text-xl font-black tabular-nums text-emerald-700">
                  R$ {paymentTotals.paid.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col sm:block">
                <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">A receber</div>
                <div className="text-xl font-black tabular-nums text-amber-700">
                  R$ {paymentTotals.pending.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button variant="ghost" onClick={() => setStep("grad")}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={submitGrad} size="lg" className="shadow-md shadow-primary/20">
                Confirmar e emitir certificados <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}



      {/* ============ STEP 3: CERTIFICADO ============ */}
      {step === "cert" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Award className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Emissão de certificados</span>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
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
                  <div key={g.id} className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 ${done ? "bg-emerald-500/5" : ""}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ${
                        done ? "bg-emerald-500 text-white ring-emerald-500/40" : "bg-muted text-foreground ring-border"
                      }`}>
                        {done ? <CheckCircle2 className="h-5 w-5" /> : initials(s?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-foreground">{s?.full_name}</div>
                        <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                          {(() => {
                            const rg = resolveStudentGrad(g.student_id);
                            return `${rg.belt?.name ?? ""}${degreeSuffix(rg.degree, rg.belt?.modality, " · ", rg.belt?.name)}`;
                          })()}
                        </div>
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

