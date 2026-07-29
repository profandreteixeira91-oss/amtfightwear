import { formatDegree, degreeSuffix, degreeUnit, formatBeltFull } from "@/lib/dojo/degree-label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  listDojoStudents,
  saveDojoStudent,
  deleteDojoStudent,
  listDojoBelts,
  listDojoUnits,
  listDojoPlans,
  enrollStudentWithPlan,
  bulkImportDojoStudents,
  addDojoGraduation,
} from "@/lib/dojo/dojo.functions";
import { paymentMethodLabel, normalizePlanPaymentMethods } from "@/lib/dojo/payment-methods";
import { getMyAsaasConfig } from "@/lib/asaas/asaas.functions";
import { isAsaasReady } from "@/lib/dojo/amt-pay-status";
import { getMyAcademySlug } from "@/lib/dojo/academy-public.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPhotoCapture } from "@/components/dojo/StudentPhotoCapture";
import { useDojoBranding } from "@/hooks/useDojoBranding";
import { downloadStudentsTemplate, parseStudentsFile, type ParsedStudentRow } from "@/lib/dojo/students-xlsx";
import autismIcon from "@/assets/autism-tea.png.asset.json";
import { printAllStudentSummaries } from "@/lib/dojo/students-bulk-print";
import { maskCPF, maskCEP, maskPhone, clampDueDay, isValidCPF, isValidCEP, isValidPhone } from "@/lib/br-masks";
import { toast } from "sonner";
import { Trash2, Pencil, UserPlus, FileDown, Upload, Printer, User, MapPin, Phone, Award, Wallet, HeartPulse, Camera, ShieldCheck, FileText, Users, UserCheck, Snowflake, UserX, Search, Sparkles, Link as LinkIcon, Copy, ExternalLink, Check } from "lucide-react";


export const Route = createFileRoute("/dojo/app/students/")({
  head: () => ({ meta: [{ title: "Alunos — AMT Dojo Manager" }] }),
  component: StudentsPage,
});

/** Metadados visuais das etapas do cadastro de aluno. */
const STEP_META: Record<string, { label: string; icon: ComponentType<{ className?: string }> }> = {
  dados: { label: "Dados", icon: User },
  endereco: { label: "Endereço", icon: MapPin },
  contato: { label: "Contatos", icon: Phone },
  dojo: { label: "Dojo", icon: Award },
  plano: { label: "Plano", icon: Wallet },
  anamnese: { label: "Anamnese", icon: HeartPulse },
  foto: { label: "Foto", icon: Camera },
  consent: { label: "Consentimentos", icon: ShieldCheck },
};

type StudentForm = {
  id?: string;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: string;
  nationality: string;
  marital_status: string;
  profession: string;
  blood_type: string;
  health_insurance: string;
  email: string;
  phone: string;
  zip: string;
  street: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  guardian_name: string;
  guardian_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  unit_id: string | null;
  current_belt_id: string | null;
  current_degree: number | string;
  modalities: Array<{ modality: string; belt_id: string; degree: number }>;
  status: "active" | "inactive" | "frozen";
  notes: string;
  photo_url: string | null;
  has_medical_clearance: boolean;
  medical_clearance_date: string;
  lgpd_consent: boolean;
  facial_recognition_consent: boolean;
  image_rights_consent: boolean;
  terms_accepted: boolean;
  anamnesis: {
    medical_conditions?: string;
    medications?: string;
    allergies?: string;
    surgeries?: string;
    injuries?: string;
    physical_activity_level?: string;
    objectives?: string;
    smoking?: boolean;
    alcohol?: boolean;
    heart_issues?: boolean;
    diabetes?: boolean;
    hypertension?: boolean;
    asthma?: boolean;
    pregnant?: boolean;
    other?: string;
  };
};

const emptyForm: StudentForm = {
  full_name: "",
  cpf: "",
  rg: "",
  birth_date: "",
  gender: "",
  nationality: "Brasileira",
  marital_status: "",
  profession: "",
  blood_type: "",
  health_insurance: "",
  email: "",
  phone: "",
  zip: "",
  street: "",
  address_number: "",
  address_complement: "",
  neighborhood: "",
  city: "",
  state: "",
  guardian_name: "",
  guardian_phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
  unit_id: null,
  current_belt_id: null,
  current_degree: 0,
  status: "active",
  notes: "",
  photo_url: null,
  has_medical_clearance: false,
  medical_clearance_date: "",
  lgpd_consent: false,
  facial_recognition_consent: false,
  image_rights_consent: false,
  terms_accepted: false,
  anamnesis: {},
  modalities: [],
};

function StudentsPage() {
  const listFn = useServerFn(listDojoStudents);
  const saveFn = useServerFn(saveDojoStudent);
  const delFn = useServerFn(deleteDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const unitsFn = useServerFn(listDojoUnits);
  const plansFn = useServerFn(listDojoPlans);
  const enrollFn = useServerFn(enrollStudentWithPlan);
  const bulkImportFn = useServerFn(bulkImportDojoStudents);
  const addGradFn = useServerFn(addDojoGraduation);
  const { data: branding } = useDojoBranding();
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedStudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [beltFilter, setBeltFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [tab, setTab] = useState<string>("dados");
  const tabOrder = ["dados", "endereco", "contato", "dojo", "plano", "anamnese", "foto", "consent"];

  const tabIndex = Math.max(0, tabOrder.indexOf(tab));
  const isLastTab = tabIndex >= tabOrder.length - 1;
  useEffect(() => { if (open) setTab("dados"); }, [open]);
  const [enrollment, setEnrollment] = useState({
    plan_id: "",
    due_day: 5,
    start_date: new Date().toISOString().slice(0, 10),
    first_due_date: new Date().toISOString().slice(0, 10),
    include_enrollment_fee: true,
    payment_method: "manual" as string,
    custom_amount: "" as string,
  });

  const q = useQuery({ queryKey: ["dojo-students"], queryFn: () => listFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => plansFn() });
  const amtPayFn = useServerFn(getMyAsaasConfig);
  const amtPayCfg = useQuery({ queryKey: ["dojo-amtpay-status"], queryFn: () => amtPayFn(), staleTime: 60_000 });
  const amtPayActive = isAsaasReady((amtPayCfg.data as any)?.onboardingStatus);

  const slugFn = useServerFn(getMyAcademySlug);
  const slugQ = useQuery({ queryKey: ["dojo-my-slug"], queryFn: () => slugFn(), staleTime: 300_000 });
  const [enrollLinkOpen, setEnrollLinkOpen] = useState(false);
  const enrollUrl = (() => {
    const slug = (slugQ.data as any)?.slug;
    if (!slug) return "";
    if (typeof window === "undefined") return `/matricula/${slug}`;
    return `${window.location.origin}/matricula/${slug}`;
  })();


  useEffect(() => {
    if (!q.data) return;
    let editId: string | null = null;
    try { editId = sessionStorage.getItem("dojo-edit-student"); } catch {}
    if (!editId) return;
    const target = (q.data as any[]).find((s) => s.id === editId);
    if (target) {
      openEdit(target);
      try { sessionStorage.removeItem("dojo-edit-student"); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const filtered = (q.data ?? []).filter((s: any) => {
    if (status !== "all" && s.status !== status) return false;
    if (beltFilter !== "all" && s.current_belt_id !== beltFilter) return false;
    if (unitFilter !== "all" && s.unit_id !== unitFilter) return false;
    if (cityFilter && !(s.city ?? "").toLowerCase().includes(cityFilter.toLowerCase())) return false;
    if (search) {
      const term = search.toLowerCase();
      const hay = [s.full_name, s.email, s.phone, s.cpf, s.rg, s.guardian_name, s.belt?.name, s.unit?.name]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, status, beltFilter, unitFilter, cityFilter]);


  function set<K extends keyof StudentForm>(key: K, val: StudentForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function setAnamn<K extends keyof StudentForm["anamnesis"]>(key: K, val: StudentForm["anamnesis"][K]) {
    setForm((f) => ({ ...f, anamnesis: { ...f.anamnesis, [key]: val } }));
  }

  function openNew() {
    setForm(emptyForm);
    setEnrollment({
      plan_id: "",
      due_day: 5,
      start_date: new Date().toISOString().slice(0, 10),
      first_due_date: new Date().toISOString().slice(0, 10),
      include_enrollment_fee: true,
      payment_method: "manual",
      custom_amount: "",
    });
    setOpen(true);
  }
  function resetEnrollment() {
    setEnrollment({
      plan_id: "",
      due_day: 5,
      start_date: new Date().toISOString().slice(0, 10),
      first_due_date: new Date().toISOString().slice(0, 10),
      include_enrollment_fee: true,
      payment_method: "manual",
      custom_amount: "",
    });
  }
  function openEdit(s: any) {
    const modalities: StudentForm["modalities"] = [];
    if (s.current_belt_id) {
      modalities.push({
        modality: s.belt?.modality ?? "jiu-jitsu",
        belt_id: s.current_belt_id,
        degree: Number(s.current_degree ?? 0),
      });
    }
    setForm({
      ...emptyForm,
      ...s,
      current_degree: s.current_degree ?? 0,
      anamnesis: s.anamnesis ?? {},
      medical_clearance_date: s.medical_clearance_date ?? "",
      birth_date: s.birth_date ?? "",
      // Exibição já formatada nos padrões brasileiros
      cpf: maskCPF(s.cpf ?? ""),
      zip: maskCEP(s.zip ?? ""),
      phone: maskPhone(s.phone ?? ""),
      guardian_phone: maskPhone(s.guardian_phone ?? ""),
      emergency_contact_phone: maskPhone(s.emergency_contact_phone ?? ""),
      modalities,
    });
    setOpen(true);
  }

  const onSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }
    if (!form.lgpd_consent || !form.terms_accepted || !form.facial_recognition_consent) {
      toast.error("É necessário registrar o consentimento LGPD, Biometria Facial e o aceite dos termos");
      return;
    }
    // Ao criar novo aluno, exigir plano
    const isNew = !form.id;
    if (isNew && !enrollment.plan_id) {
      toast.error("Selecione um plano para o aluno na aba Plano & Cobrança");
      return;
    }
    try {
      // Multi-modalidade: a primeira linha vira a faixa "principal" do aluno;
      // as demais são registradas como graduações adicionais.
      const validMods = (form.modalities ?? []).filter((m) => m.modality && m.belt_id);
      const primary = validMods[0] ?? null;
      const payload: any = {
        ...form,
        current_belt_id: primary?.belt_id ?? form.current_belt_id ?? null,
        current_degree: Number(primary?.degree ?? form.current_degree ?? 0),
      };
      delete payload.modalities;
      const skip = new Set([
        "anamnesis", "status", "lgpd_consent", "image_rights_consent",
        "terms_accepted", "has_medical_clearance", "current_degree",
      ]);
      Object.keys(payload).forEach((k) => {
        if (!skip.has(k) && payload[k] === "") payload[k] = null;
      });
      const saved: any = await saveFn({ data: payload });
      const studentId = saved?.id ?? form.id;

      // Registrar graduações para modalidades adicionais (apenas em novo aluno)
      if (isNew && studentId && validMods.length > 1) {
        const today = new Date().toISOString().slice(0, 10);
        for (const m of validMods.slice(1)) {
          try {
            await addGradFn({
              data: {
                student_id: studentId,
                belt_id: m.belt_id,
                degree: Number(m.degree ?? 0),
                graduation_date: today,
                evaluator: null,
                notes: "Cadastro inicial (modalidade adicional)",
              },
            });
          } catch (e: any) {
            toast.error("Falha ao registrar modalidade adicional", { description: e?.message });
          }
        }
      }

      if (isNew && studentId && enrollment.plan_id) {
        const customAmt = enrollment.custom_amount.trim() === "" ? null : Number(enrollment.custom_amount);
        const res: any = await enrollFn({
          data: {
            student_id: studentId,
            plan_id: enrollment.plan_id,
            due_day: enrollment.due_day,
            start_date: enrollment.start_date,
            first_due_date: enrollment.first_due_date,
            include_enrollment_fee: enrollment.include_enrollment_fee,
            payment_method: enrollment.payment_method,
            custom_amount: Number.isFinite(customAmt as number) ? customAmt : null,
          },
        });
        if (res?.asaas_subscription_id) {
          toast.success("Aluno matriculado — assinatura AMT Pay criada");
          toast.info("As cobranças serão emitidas automaticamente pelo AMT Pay no ciclo do plano.");
        } else {
          toast.success("Aluno matriculado e 1ª mensalidade gerada");
          if (res?.payment_url) {
            window.open(res.payment_url, "_blank", "noopener,noreferrer");
            toast.info("Link de pagamento aberto em nova aba");
          }
        }
      } else {
        toast.success("Aluno salvo");
      }
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
      qc.invalidateQueries({ queryKey: ["dojo-invoices"] });
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    }
  };



  const onDelete = async (id: string) => {
    if (!confirm("Excluir aluno? Esta ação apaga histórico de graduações e mensalidades.")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-students"] });
  };

  const onPickFile = async (file: File) => {
    try {
      const rows = await parseStudentsFile(file);
      if (rows.length === 0) {
        toast.error("Nenhum aluno encontrado na planilha", {
          description: "Confira se a coluna 'Nome completo' está preenchida.",
        });
        return;
      }
      setImportRows(rows);
      setImportOpen(true);
    } catch (e: any) {
      toast.error("Falha ao ler planilha", { description: e?.message ?? String(e) });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onConfirmImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const result = await bulkImportFn({ data: { rows: importRows as any } });
      if (result.inserted > 0) toast.success(`${result.inserted} aluno(s) importado(s)`);
      if (result.errors.length) {
        toast.error(`${result.errors.length} linha(s) com erro`, {
          description: result.errors.slice(0, 3).map((e) => `${e.full_name}: ${e.message}`).join(" · "),
        });
      }
      setImportOpen(false);
      setImportRows([]);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
    } catch (e: any) {
      toast.error("Erro na importação", { description: e?.message ?? String(e) });
    } finally {
      setImporting(false);
    }
  };

  const onPrintAll = () => {
    const list = filtered;
    if (!list.length) {
      toast.error("Nenhum aluno para imprimir");
      return;
    }
    printAllStudentSummaries(list, branding);
  };


  const allStudents = (q.data ?? []) as any[];
  const kpiTotal = allStudents.length;
  const kpiActive = allStudents.filter((s) => s.status === "active").length;
  const kpiFrozen = allStudents.filter((s) => s.status === "frozen").length;
  const kpiInactive = allStudents.filter((s) => s.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Premium Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-red-950/40 bg-gradient-to-br from-[#1a0508] via-[#0f0304] to-black text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-red-900/30 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-red-500/40 blur-xl" />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-800 shadow-lg shadow-red-950/50 ring-1 ring-white/10">
                  <Users className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-300/80">
                  <Sparkles className="h-3 w-3" /> Gestão de Alunos
                </div>
                <h1 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-tight text-white">
                  Alunos do Dojo
                </h1>
              </div>
            </div>
          </div>

          <p className="w-full text-sm text-white/75 leading-relaxed">
            <span className="font-semibold text-white">
              {filtered.length} {filtered.length === 1 ? "aluno encontrado" : "alunos encontrados"}
            </span>
            {q.data && q.data.length !== filtered.length ? ` de ${q.data.length} no total` : ""}
            {" · "}Cadastro completo, anamnese, graduações e contratos em um único lugar.
          </p>


          <div className="flex flex-wrap gap-2 md:justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
              }}
            />
            <Button size="sm" variant="outline" className="h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => downloadStudentsTemplate()}>
              <FileDown className="h-4 w-4 mr-1" /> Modelo XLSX
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Importar
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={onPrintAll}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir fichas
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
              <Link to="/dojo/app/contracts">
                <FileText className="h-4 w-4 mr-1" /> Contratos
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setEnrollLinkOpen(true)}
            >
              <LinkIcon className="h-4 w-4 mr-1" /> Página de matrícula
            </Button>

            <Dialog open={enrollLinkOpen} onOpenChange={setEnrollLinkOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Página de matrícula do dojo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Compartilhe este link com potenciais alunos. A página é de acesso aberto —
                    o aluno preenche os dados, escolhe o plano e é direcionado à página de
                    pagamento configurada no dojo.
                  </p>
                  {slugQ.isLoading ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : !(slugQ.data as any)?.slug ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      Configure o <b>slug</b> do dojo em <b>Configurações → Academia</b> para
                      habilitar a página pública.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={enrollUrl} onFocus={(e) => e.currentTarget.select()} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(enrollUrl);
                              toast.success("Link copiado!");
                            } catch {
                              toast.error("Não foi possível copiar.");
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" asChild>
                          <a href={enrollUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                          </a>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dica: divulgue o link nas redes sociais, no rodapé do site ou por QR Code
                        na recepção da academia.
                      </p>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>


            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-tour="novo-aluno" size="sm" onClick={openNew} className="h-9 rounded-full bg-white px-4 font-semibold text-red-700 shadow-lg shadow-red-950/40 hover:bg-white/95">
                  <UserPlus className="h-4 w-4 mr-1" /> Novo aluno
                </Button>
              </DialogTrigger>

            <DialogContent data-tour="student-dialog" className="max-w-5xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden rounded-2xl border-neutral-200/80 shadow-2xl">
              <DialogHeader className="relative overflow-hidden px-6 pt-6 pb-5 text-left border-b border-white/10 bg-[linear-gradient(135deg,#1b0708_0%,#490d10_55%,#7f1417_100%)]">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-red-500/25 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-[-4rem] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex items-start gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      AMT Dojo Manager · Matrícula
                    </p>
                    <DialogTitle className="mt-1 text-lg font-semibold leading-tight text-white sm:text-xl">
                      {form.id ? "Editar aluno" : "Cadastrar novo aluno"}
                    </DialogTitle>
                    <p className="mt-1 text-xs leading-relaxed text-white/70">
                      Etapa {tabIndex + 1} de {tabOrder.length} · Campos com{" "}
                      <span className="text-red-300">*</span> são obrigatórios.
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-2 ring-1 ring-inset ring-white/15 sm:flex">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-white/55">Progresso</div>
                      <div className="text-lg font-bold tabular-nums text-white">
                        {Math.round(((tabIndex + 1) / tabOrder.length) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-400 to-white transition-all duration-500 ease-out"
                    style={{ width: `${((tabIndex + 1) / tabOrder.length) * 100}%` }}
                  />
                </div>
              </DialogHeader>

              <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col max-h-[calc(90vh-11rem)]">
                <div className="border-b bg-gradient-to-b from-muted/40 to-background px-4 py-3 sm:px-6">
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0">
                    {tabOrder.map((value, i) => {
                      const meta = STEP_META[value];
                      const done = i < tabIndex;
                      const active = i === tabIndex;
                      return (
                        <TabsTrigger
                          key={value}
                          value={value}
                          data-tour={`student-step-${value}`}
                          className={[
                            "group gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                            "data-[state=active]:border-primary/30 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm",
                            active
                              ? "border-primary/30"
                              : done
                                ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700"
                                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : done
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {done ? <Check className="h-3 w-3" /> : i + 1}
                          </span>
                          <meta.icon className="h-3.5 w-3.5" />
                          <span className="whitespace-nowrap">{meta.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <div className="overflow-y-auto px-6 py-5 flex-1 bg-[radial-gradient(900px_400px_at_100%_-10%,rgba(220,38,38,0.04),transparent_60%)]">



                {/* ============ DADOS PESSOAIS ============ */}
                <TabsContent value="dados" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Nome completo *" className="md:col-span-2">
                    <Input data-tour="student-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  </Field>
                  <Field label="CPF *">
                    <Input
                      data-tour="student-cpf"
                      value={form.cpf}
                      onChange={(e) => set("cpf", maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                    />
                    {form.cpf && !isValidCPF(form.cpf) && (
                      <p className="mt-1 text-[11px] text-destructive">CPF incompleto — use o formato 000.000.000-00.</p>
                    )}
                  </Field>
                  <Field label="RG">
                    <Input value={form.rg} onChange={(e) => set("rg", e.target.value)} />
                  </Field>
                  <Field label="Data de nascimento *">
                    <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
                  </Field>
                  <Field label="Gênero">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.gender}
                      onChange={(e) => set("gender", e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                      <option value="prefiro_nao_informar">Prefiro não informar</option>
                    </select>
                  </Field>
                  <Field label="Nacionalidade">
                    <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
                  </Field>
                  <Field label="Estado civil">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.marital_status}
                      onChange={(e) => set("marital_status", e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="solteiro">Solteiro(a)</option>
                      <option value="casado">Casado(a)</option>
                      <option value="uniao_estavel">União estável</option>
                      <option value="divorciado">Divorciado(a)</option>
                      <option value="viuvo">Viúvo(a)</option>
                    </select>
                  </Field>
                  <Field label="Profissão">
                    <Input value={form.profession} onChange={(e) => set("profession", e.target.value)} />
                  </Field>
                  <Field label="Tipo sanguíneo">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.blood_type}
                      onChange={(e) => set("blood_type", e.target.value)}
                    >
                      <option value="">—</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Plano de saúde" className="md:col-span-2">
                    <Input value={form.health_insurance} onChange={(e) => set("health_insurance", e.target.value)} />
                  </Field>
                </TabsContent>

                {/* ============ ENDEREÇO ============ */}
                <TabsContent value="endereco" className="mt-4 grid gap-3 md:grid-cols-6">
                  <Field label="CEP" className="md:col-span-2">
                    <Input
                      name="cep"
                      data-tour="student-cep"
                      placeholder="00000-000"
                      value={form.zip}
                      onChange={(e) => set("zip", maskCEP(e.target.value))}
                      inputMode="numeric"
                      maxLength={9}
                    />
                    {form.zip && !isValidCEP(form.zip) && (
                      <p className="mt-1 text-[11px] text-destructive">CEP incompleto — use o formato 00000-000.</p>
                    )}
                  </Field>
                  <Field label="Rua" className="md:col-span-4">
                    <Input name="logradouro" value={form.street} onChange={(e) => set("street", e.target.value)} />
                  </Field>
                  <Field label="Número" className="md:col-span-1">
                    <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
                  </Field>
                  <Field label="Complemento" className="md:col-span-3">
                    <Input name="complemento" value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
                  </Field>
                  <Field label="Bairro" className="md:col-span-2">
                    <Input name="bairro" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
                  </Field>
                  <Field label="Cidade" className="md:col-span-4">
                    <Input name="cidade" value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </Field>
                  <Field label="UF" className="md:col-span-2">
                    <Input name="uf" value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={2} />
                  </Field>

                </TabsContent>

                {/* ============ CONTATOS ============ */}
                <TabsContent value="contato" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="E-mail">
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <Input
                      value={form.phone}
                      onChange={(e) => set("phone", maskPhone(e.target.value))}
                      placeholder="(11)99999-9999"
                      inputMode="tel"
                      maxLength={14}
                    />
                    {form.phone && !isValidPhone(form.phone) && (
                      <p className="mt-1 text-[11px] text-destructive">Telefone incompleto — use (XX)XXXXX-XXXX.</p>
                    )}
                  </Field>
                  <div className="md:col-span-2 mt-2 text-sm font-semibold">Responsável legal (menores de 18 anos)</div>
                  <Field label="Nome do responsável">
                    <Input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
                  </Field>
                  <Field label="Telefone do responsável">
                    <Input value={form.guardian_phone} onChange={(e) => set("guardian_phone", maskPhone(e.target.value))} placeholder="(11)99999-9999" inputMode="tel" maxLength={14} />
                  </Field>
                  <div className="md:col-span-2 mt-2 text-sm font-semibold">Contato de emergência</div>
                  <Field label="Nome">
                    <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                  </Field>
                  <Field label="Telefone">
                    <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", maskPhone(e.target.value))} placeholder="(11)99999-9999" inputMode="tel" maxLength={14} />
                  </Field>
                  <Field label="Parentesco" className="md:col-span-2">
                    <Input value={form.emergency_contact_relationship} onChange={(e) => set("emergency_contact_relationship", e.target.value)} placeholder="Ex.: cônjuge, mãe, irmão" />
                  </Field>
                </TabsContent>

                {/* ============ DOJO ============ */}
                <TabsContent value="dojo" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Unidade" className="md:col-span-2">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.unit_id ?? ""}
                      onChange={(e) => set("unit_id", e.target.value || null)}
                    >
                      <option value="">— Selecionar —</option>
                      {(units.data ?? []).map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="md:col-span-2 rounded-md border border-dashed p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Modalidades e faixas</div>
                        <p className="text-[11px] text-muted-foreground">
                          Selecione a modalidade e a faixa atual do aluno. Adicione linhas para cadastrar em mais de uma modalidade.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const modalitiesAvail = Array.from(
                            new Set(((belts.data ?? []) as any[]).map((b) => b.modality).filter(Boolean)),
                          );
                          const firstMod = form.modalities[0]?.modality ?? modalitiesAvail[0] ?? "jiu-jitsu";
                          set("modalities", [
                            ...form.modalities,
                            { modality: firstMod, belt_id: "", degree: 0 },
                          ]);
                        }}
                      >
                        + Adicionar modalidade
                      </Button>
                    </div>

                    {form.modalities.length === 0 && (
                      <div className="text-xs text-muted-foreground border rounded p-3 bg-muted/40">
                        Nenhuma modalidade selecionada. Clique em <strong>Adicionar modalidade</strong> para vincular a faixa atual do aluno.
                      </div>
                    )}

                    {form.modalities.map((m, idx) => {
                      const modalitiesAvail = Array.from(
                        new Set(((belts.data ?? []) as any[]).map((b) => b.modality).filter(Boolean)),
                      );
                      const beltsForMod = ((belts.data ?? []) as any[])
                        .filter((b) => b.modality === m.modality)
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                      const selectedBelt = beltsForMod.find((b) => b.id === m.belt_id);
                      const maxDeg = Number(selectedBelt?.max_degrees ?? 10);
                      const update = (patch: Partial<typeof m>) => {
                        const next = form.modalities.slice();
                        next[idx] = { ...next[idx], ...patch };
                        set("modalities", next);
                      };
                      return (
                        <div key={idx} className="grid gap-2 md:grid-cols-12 items-end border rounded p-2 bg-background">
                          <div className="md:col-span-4">
                            <label className="text-[11px] text-muted-foreground">Modalidade</label>
                            <select
                              className="border rounded p-2 bg-background w-full"
                              value={m.modality}
                              onChange={(e) => update({ modality: e.target.value, belt_id: "" })}
                            >
                              {modalitiesAvail.map((mod) => (
                                <option key={mod} value={mod}>{mod}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-5">
                            <label className="text-[11px] text-muted-foreground">Graduação atual</label>
                            <select
                              className="border rounded p-2 bg-background w-full"
                              value={m.belt_id}
                              onChange={(e) => update({ belt_id: e.target.value, degree: 0 })}
                            >
                              <option value="">— Selecionar faixa —</option>
                              {beltsForMod.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[11px] text-muted-foreground">
                              {selectedBelt ? degreeUnit(selectedBelt.modality) : "Grau"}
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={maxDeg}
                              value={m.degree}
                              onChange={(e) => update({ degree: Number(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const next = form.modalities.slice();
                                next.splice(idx, 1);
                                set("modalities", next);
                              }}
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                          {idx === 0 && form.modalities.length > 1 && (
                            <p className="md:col-span-12 text-[11px] text-muted-foreground">
                              A primeira modalidade é considerada a <strong>faixa principal</strong> do aluno e aparecerá no cabeçalho da ficha.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Field label="Status">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.status}
                      onChange={(e) => set("status", e.target.value as StudentForm["status"])}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="frozen">Trancado</option>
                    </select>
                  </Field>
                  <Field label="Observações" className="md:col-span-2">
                    <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                  </Field>
                </TabsContent>

                {/* ============ PLANO & COBRANÇA ============ */}
                {!form.id && (
                  <TabsContent value="plano" className="mt-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Selecione o plano do aluno. Uma matrícula é criada automaticamente e a 1ª mensalidade é gerada com base no plano.
                      As mensalidades seguintes são criadas mensalmente no Financeiro.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Plano *" className="md:col-span-2">
                        <select
                          className="border rounded p-2 bg-background w-full"
                          data-tour="student-plan"
                          value={enrollment.plan_id}
                          onChange={(e) => setEnrollment((s) => ({ ...s, plan_id: e.target.value }))}
                        >
                          <option value="">— Selecionar plano —</option>
                          {(plans.data ?? [])
                            .filter((p: any) => p.active !== false)
                            .map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — R$ {Number(p.amount ?? 0).toFixed(2)}
                                {Number(p.enrollment_fee ?? 0) > 0
                                  ? ` (+ matrícula R$ ${Number(p.enrollment_fee).toFixed(2)})`
                                  : ""}
                              </option>
                            ))}
                        </select>
                        {(plans.data ?? []).length === 0 && (
                          <p className="text-xs text-destructive mt-1">
                            Nenhum plano cadastrado.{" "}
                            <Link to="/dojo/app/plans" className="underline">
                              Cadastre um plano
                            </Link>{" "}
                            antes de matricular o aluno.
                          </p>
                        )}
                      </Field>
                      <Field label="Data de início">
                        <Input
                          type="date"
                          value={enrollment.start_date}
                          onChange={(e) => setEnrollment((s) => ({ ...s, start_date: e.target.value }))}
                        />
                      </Field>
                      <Field label="Dia de vencimento (1-31)" hint="Meses mais curtos usam o último dia disponível.">
                        <Input
                          inputMode="numeric"
                          maxLength={2}
                          placeholder="05"
                          value={String(enrollment.due_day)}
                          onChange={(e) =>
                            setEnrollment((s) => ({ ...s, due_day: clampDueDay(e.target.value, s.due_day) }))
                          }
                          onBlur={(e) =>
                            setEnrollment((s) => ({ ...s, due_day: clampDueDay(e.target.value, 5) }))
                          }
                        />
                      </Field>
                      <Field label="Vencimento da 1ª mensalidade">
                        <Input
                          type="date"
                          value={enrollment.first_due_date}
                          onChange={(e) => setEnrollment((s) => ({ ...s, first_due_date: e.target.value }))}
                        />
                      </Field>
                      <Field label="Valor customizado (opcional)">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Deixe vazio para usar o valor do plano"
                          value={enrollment.custom_amount}
                          onChange={(e) => setEnrollment((s) => ({ ...s, custom_amount: e.target.value }))}
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <BoolChk
                          label="Cobrar taxa de matrícula na 1ª fatura (se o plano tiver)"
                          checked={enrollment.include_enrollment_fee}
                          onChange={(v) => setEnrollment((s) => ({ ...s, include_enrollment_fee: v }))}
                        />
                      </div>
                      <Field label="Forma de pagamento da matrícula" className="md:col-span-2">
                        {(() => {
                          const selectedPlan = (plans.data as any[] | undefined)?.find(
                            (p) => p.id === enrollment.plan_id,
                          );
                          const planMethods = selectedPlan
                            ? normalizePlanPaymentMethods(selectedPlan.payment_methods).filter((m) => m.enabled)
                            : [];
                          const gatewayCodes = new Set(["pix", "boleto", "credit_card", "debit_card", "payment_link", "recurring"]);

                          // AMT Pay desativado → tudo é manual, esconde os demais métodos.
                          if (!amtPayActive) {
                            if (enrollment.payment_method !== "manual") {
                              setTimeout(() => setEnrollment((s) => ({ ...s, payment_method: "manual" })), 0);
                            }
                            return (
                              <>
                                <select
                                  className="border rounded p-2 bg-background w-full"
                                  value="manual"
                                  disabled
                                >
                                  <option value="manual">Registrar manualmente</option>
                                </select>
                                <p className="text-xs text-amber-600 mt-1">
                                  AMT Pay desativado — todas as cobranças deste dojo são registradas manualmente.
                                  Ative o AMT Pay em Menu → AMT Pay para emitir PIX, boleto e cartão automaticamente.
                                </p>
                              </>
                            );
                          }

                          // AMT Pay ativo → mostra métodos habilitados no plano.
                          const isGateway = gatewayCodes.has(enrollment.payment_method);
                          return (
                            <>
                              <select
                                className="border rounded p-2 bg-background w-full"
                                value={enrollment.payment_method}
                                onChange={(e) =>
                                  setEnrollment((s) => ({ ...s, payment_method: e.target.value }))
                                }
                              >
                                {planMethods.length === 0 && (
                                  <option value="manual">Registrar manualmente</option>
                                )}
                                {planMethods.map((m) => (
                                  <option key={m.code} value={m.code}>
                                    {paymentMethodLabel(m.code)}
                                  </option>
                                ))}
                              </select>
                              {isGateway && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  AMT Pay ativo — o AMT Pay emitirá as cobranças automaticamente no ciclo do plano.
                                  O aluno recebe a fatura por e-mail e as cobranças aparecem no Financeiro.
                                </p>
                              )}
                              {!isGateway && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cobrança manual: a 1ª fatura é criada no sistema e as próximas são geradas conforme a frequência do plano.
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </Field>

                    </div>
                  </TabsContent>
                )}



                {/* ============ ANAMNESE ============ */}
                <TabsContent value="anamnese" className="mt-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Ficha de anamnese — informações essenciais para prescrição segura da prática.
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <BoolChk label="Problemas cardíacos" checked={!!form.anamnesis.heart_issues} onChange={(v) => setAnamn("heart_issues", v)} />
                    <BoolChk label="Hipertensão" checked={!!form.anamnesis.hypertension} onChange={(v) => setAnamn("hypertension", v)} />
                    <BoolChk label="Diabetes" checked={!!form.anamnesis.diabetes} onChange={(v) => setAnamn("diabetes", v)} />
                    <BoolChk label="Asma / bronquite" checked={!!form.anamnesis.asthma} onChange={(v) => setAnamn("asthma", v)} />
                    <BoolChk label="Fumante" checked={!!form.anamnesis.smoking} onChange={(v) => setAnamn("smoking", v)} />
                    <BoolChk label="Consumo de álcool" checked={!!form.anamnesis.alcohol} onChange={(v) => setAnamn("alcohol", v)} />
                    <BoolChk label="Gestante" checked={!!form.anamnesis.pregnant} onChange={(v) => setAnamn("pregnant", v)} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Doenças / condições diagnosticadas" className="md:col-span-2">
                      <Textarea rows={2} value={form.anamnesis.medical_conditions ?? ""} onChange={(e) => setAnamn("medical_conditions", e.target.value)} />
                    </Field>
                    <Field label="Medicamentos em uso" className="md:col-span-2">
                      <Textarea rows={2} value={form.anamnesis.medications ?? ""} onChange={(e) => setAnamn("medications", e.target.value)} />
                    </Field>
                    <Field label="Alergias">
                      <Textarea rows={2} value={form.anamnesis.allergies ?? ""} onChange={(e) => setAnamn("allergies", e.target.value)} />
                    </Field>
                    <Field label="Cirurgias anteriores">
                      <Textarea rows={2} value={form.anamnesis.surgeries ?? ""} onChange={(e) => setAnamn("surgeries", e.target.value)} />
                    </Field>
                    <Field label="Lesões / dores atuais" className="md:col-span-2">
                      <Textarea rows={2} value={form.anamnesis.injuries ?? ""} onChange={(e) => setAnamn("injuries", e.target.value)} />
                    </Field>
                    <Field label="Nível de atividade física">
                      <select
                        className="border rounded p-2 bg-background w-full"
                        value={form.anamnesis.physical_activity_level ?? ""}
                        onChange={(e) => setAnamn("physical_activity_level", e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="sedentario">Sedentário</option>
                        <option value="leve">Leve (1-2x/semana)</option>
                        <option value="moderado">Moderado (3-4x/semana)</option>
                        <option value="intenso">Intenso (5+x/semana)</option>
                      </select>
                    </Field>
                    <Field label="Objetivos com a prática">
                      <Input value={form.anamnesis.objectives ?? ""} onChange={(e) => setAnamn("objectives", e.target.value)} placeholder="Ex.: saúde, competição, defesa pessoal" />
                    </Field>
                    <Field label="Outras observações" className="md:col-span-2">
                      <Textarea rows={2} value={form.anamnesis.other ?? ""} onChange={(e) => setAnamn("other", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 border-t pt-3">
                    <BoolChk
                      label="Possui liberação médica para atividade física"
                      checked={form.has_medical_clearance}
                      onChange={(v) => set("has_medical_clearance", v)}
                    />
                    <Field label="Data da liberação">
                      <Input
                        type="date"
                        value={form.medical_clearance_date}
                        onChange={(e) => set("medical_clearance_date", e.target.value)}
                        disabled={!form.has_medical_clearance}
                      />
                    </Field>
                  </div>
                </TabsContent>

                {/* ============ FOTO ============ */}
                <TabsContent value="foto" className="mt-4">
                  <StudentPhotoCapture value={form.photo_url} onChange={(url) => set("photo_url", url)} />
                </TabsContent>

                {/* ============ CONSENTIMENTOS ============ */}
                <TabsContent value="consent" className="mt-4 space-y-3">
                  <BoolChk
                    label="Autorizo o tratamento dos meus dados pessoais conforme a LGPD (Lei nº 13.709/2018) para fins de matrícula, controle acadêmico e comunicação da academia."
                    checked={form.lgpd_consent}
                    onChange={(v) => set("lgpd_consent", v)}
                  />
                  <BoolChk
                    label="Autorizo a coleta e processamento de biometria facial para identificação automática em check-ins por foto (Reconhecimento Facial)."
                    checked={form.facial_recognition_consent}
                    onChange={(v) => set("facial_recognition_consent", v)}
                  />
                  <BoolChk
                    label="Autorizo o uso da minha imagem em fotos e vídeos para divulgação da academia (redes sociais, site e materiais internos)."
                    checked={form.image_rights_consent}
                    onChange={(v) => set("image_rights_consent", v)}
                  />
                  <BoolChk
                    label="Declaro estar ciente dos riscos inerentes à prática esportiva e aceito o regulamento interno e o termo de responsabilidade da academia."
                    checked={form.terms_accepted}
                    onChange={(v) => set("terms_accepted", v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Os consentimentos são registrados com data e hora conforme exigido pela LGPD.
                  </p>
                </TabsContent>
                </div>
              </Tabs>

              <div className="flex flex-col gap-3 border-t bg-gradient-to-b from-background to-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="hidden items-center gap-1 sm:flex">
                    {tabOrder.map((v, i) => (
                      <span
                        key={v}
                        className={[
                          "h-1.5 rounded-full transition-all duration-300",
                          i === tabIndex ? "w-6 bg-primary" : i < tabIndex ? "w-3 bg-emerald-500/70" : "w-3 bg-muted-foreground/20",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {form.id ? "Alterações salvas ao clicar em Salvar." : "Ao salvar, o aluno será matriculado no plano selecionado."}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancelar</Button>
                  {!isLastTab && (
                    <Button variant="outline" className="rounded-xl" onClick={() => setTab(tabOrder[tabIndex - 1])} disabled={tabIndex === 0}>
                      Voltar
                    </Button>
                  )}
                  {isLastTab ? (
                    <Button data-tour="student-save" onClick={onSave} className="rounded-xl px-5 shadow-sm transition-transform active:scale-[0.98]">
                      {form.id ? "Salvar alterações" : "Cadastrar aluno"}
                    </Button>
                  ) : (
                    <Button data-tour="student-next" onClick={() => setTab(tabOrder[tabIndex + 1])} className="rounded-xl px-5 shadow-sm transition-transform active:scale-[0.98]">
                      Continuar
                    </Button>
                  )}
                </div>
              </div>

            </DialogContent>
          </Dialog>

          <Dialog open={importOpen} onOpenChange={(v) => { if (!importing) setImportOpen(v); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar alunos ({importRows.length})</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Revise as primeiras linhas antes de confirmar. Todas serão criadas com status ativo por padrão.
              </p>
              <div className="mt-3 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">CPF</th>
                      <th className="text-left p-2">Nascimento</th>
                      <th className="text-left p-2">Telefone</th>
                      <th className="text-left p-2">E-mail</th>
                      <th className="text-left p-2">Cidade/UF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 25).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.full_name}</td>
                        <td className="p-2">{r.cpf ?? ""}</td>
                        <td className="p-2">{r.birth_date ?? ""}</td>
                        <td className="p-2">{r.phone ?? ""}</td>
                        <td className="p-2">{r.email ?? ""}</td>
                        <td className="p-2">{[r.city, r.state].filter(Boolean).join("/")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 25 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    + {importRows.length - 25} linha(s) não exibidas
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancelar</Button>
                <Button onClick={onConfirmImport} disabled={importing}>
                  {importing ? "Importando…" : `Importar ${importRows.length} aluno(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StudentKpi icon={Users} label="Total de alunos" value={kpiTotal} accent="from-red-500 to-red-700" />
        <StudentKpi icon={UserCheck} label="Ativos" value={kpiActive} accent="from-emerald-500 to-teal-600" />
        <StudentKpi icon={Snowflake} label="Trancados" value={kpiFrozen} accent="from-amber-500 to-orange-600" />
        <StudentKpi icon={UserX} label="Inativos" value={kpiInactive} accent="from-neutral-500 to-neutral-700" />
      </div>

      {/* Filtros ampliados */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 md:p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-10 rounded-full"
              placeholder="Buscar por nome, telefone, CPF, e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="frozen">Trancados</option>
          </select>
          <select className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm" value={beltFilter} onChange={(e) => setBeltFilter(e.target.value)}>
            <option value="all">Todas as faixas</option>
            {(belts.data ?? []).map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="all">Todas as unidades</option>
            {(units.data ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <Input className="h-10 w-full rounded-full" placeholder="Cidade" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />

        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm divide-y divide-neutral-100">

        {pageItems.map((s: any) => {
          const statusLabel = s.status === "active" ? "Ativo" : s.status === "frozen" ? "Trancado" : "Inativo";
          const statusClass =
            s.status === "active"
              ? "bg-green-100 text-green-800"
              : s.status === "frozen"
                ? "bg-amber-100 text-amber-800"
                : "bg-muted text-muted-foreground";
          const meta = [
            s.belt?.name && formatBeltFull(s.belt.name, s.belt?.modality, s.current_degree),
            s.unit?.name,
            s.email ?? s.phone,
          ].filter(Boolean).join(" · ") || "Sem dados adicionais";
          return (
            <div
              key={s.id}
              className="p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
            >
              {/* Header (avatar + nome + status mobile) */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">
                      {s.full_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium">
                    {s.anamnesis?.autism ? (
                      <img
                        src={autismIcon.url}
                        alt="TEA"
                        title="Aluno TEA (Transtorno do Espectro Autista)"
                        className="h-4 w-4 shrink-0"
                      />
                    ) : null}
                    <span className="break-words">{s.full_name}</span>
                  </div>
                  <div className="mt-0.5 break-words text-xs text-muted-foreground">
                    {meta}
                  </div>
                </div>
                {/* Status inline no mobile */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:hidden ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Status desktop */}
              <span
                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${statusClass}`}
              >
                {statusLabel}
              </span>

              {/* Ações */}
              <div className="mt-3 flex flex-wrap items-center gap-1 sm:mt-0 sm:justify-self-end sm:flex-nowrap">
                <Link to="/dojo/app/students/$id" params={{ id: s.id }}>
                  <Button size="sm" variant="outline">Abrir</Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Editar aluno">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(s.id)} aria-label="Excluir aluno">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno.</div>
        )}

      </div>


      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </div>
          <PaginationBar page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function PaginationBar({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const go = (p: number) => onChange(Math.min(Math.max(1, p), totalPages));
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button size="sm" variant="outline" onClick={() => go(1)} disabled={page === 1} aria-label="Primeira página">«</Button>
      <Button size="sm" variant="outline" onClick={() => go(page - 1)} disabled={page === 1} aria-label="Página anterior">‹</Button>
      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === page ? "default" : "outline"}
          onClick={() => go(p)}
          className="min-w-9"
        >
          {p}
        </Button>
      ))}
      <Button size="sm" variant="outline" onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="Próxima página">›</Button>
      <Button size="sm" variant="outline" onClick={() => go(totalPages)} disabled={page === totalPages} aria-label="Última página">»</Button>
    </div>
  );

}


function Field({
  label,
  className,
  children,
  hint,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label.endsWith("*") ? (
          <>
            {label.slice(0, -1)}
            <span className="text-destructive">*</span>
          </>
        ) : (
          label
        )}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BoolChk({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm rounded-md border border-transparent hover:border-border hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function StudentKpi({ icon: Icon, label, value, accent = "from-red-500 to-red-700" }: { icon: any; label: string; value: any; accent?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] blur-2xl group-hover:opacity-[0.14] transition-opacity`} />
      <div className="relative flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md ring-1 ring-white/20`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-black tracking-tight tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}
