import { formatDegree, degreeSuffix, degreeUnit, formatBeltName, formatBeltFull } from "@/lib/dojo/degree-label";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getDojoStudent, listDojoBelts, listDojoPlans, listDojoUnits,
  addDojoGraduation, deleteDojoGraduation,
  saveDojoEnrollment, deleteDojoEnrollment, changeStudentPlan,
  saveDojoInvoice, markDojoInvoicePaid, deleteDojoInvoice,
  deleteDojoStudent, saveDojoStudent, freezeDojoStudent, unfreezeDojoStudent, restoreDojoStudent,
} from "@/lib/dojo/dojo.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { listAttendance, regenerateStudentCodes } from "@/lib/dojo/attendance.functions";
import { listStudentClasses } from "@/lib/dojo/schedule.functions";
import { getStudentCompetitionHistory } from "@/lib/dojo/competitions/rankings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Trash2, Award, Eye, Printer, Pencil, ArrowLeft, MessageSquare, Mail as MailIcon,
  Wallet, CalendarCheck, GraduationCap, Trophy, FileText, ShieldCheck,
  Activity, Heart, User as UserIcon, MapPin, Phone, ClipboardList, Upload,
  QrCode, RefreshCw, TrendingUp, ExternalLink, Sparkles, AlertTriangle, Camera, Users, Clock, MapPin as PinIcon,
} from "lucide-react";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";
import { openBrandedPrintDocument, escapeHtml, kvTable } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";
import { StudentCorporateBenefitsSection } from "@/components/dojo/corporate-benefits/StudentCorporateBenefitsSection";
import { TuitionRow } from "@/components/dojo/finance/TuitionList";
import { StudentCompetitionHistory } from "@/components/dojo/competitions/StudentCompetitionHistory";
import { StudentContracts } from "@/components/dojo/StudentContracts";
import { addStudentReferencePhoto, deleteStudentReferencePhoto } from "@/lib/dojo/dojo.functions";

export const Route = createFileRoute("/dojo/app/students/$id")({
  head: () => ({ meta: [{ title: "Aluno — AMT Dojo Manager" }] }),
  component: StudentDetail,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return String(v); }
};
const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return String(v); }
};

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== `/dojo/app/students/${id}`;



  const getFn = useServerFn(getDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const plansFn = useServerFn(listDojoPlans);
  const unitsFn = useServerFn(listDojoUnits);
  const attendanceFn = useServerFn(listAttendance);

  const delStudent = useServerFn(deleteDojoStudent);
  const freezeStudent = useServerFn(freezeDojoStudent);
  const unfreezeStudent = useServerFn(unfreezeDojoStudent);
  const restoreStudent = useServerFn(restoreDojoStudent);
  const addGrad = useServerFn(addDojoGraduation);
  const delGrad = useServerFn(deleteDojoGraduation);
  const saveEnroll = useServerFn(saveDojoEnrollment);
  const delEnroll = useServerFn(deleteDojoEnrollment);
  const doChangePlanFn = useServerFn(changeStudentPlan);
  const saveInv = useServerFn(saveDojoInvoice);
  const payInv = useServerFn(markDojoInvoicePaid);
  const delInv = useServerFn(deleteDojoInvoice);
  const saveStudent = useServerFn(saveDojoStudent);
  const addRefPhoto = useServerFn(addStudentReferencePhoto);
  const delRefPhoto = useServerFn(deleteStudentReferencePhoto);

  const q = useQuery({ queryKey: ["dojo-student", id], queryFn: () => getFn({ data: { id } }) });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => plansFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const { data: branding } = useDojoBranding();
  const attendance = useQuery({
    queryKey: ["dojo-attendance", id],
    queryFn: () => attendanceFn({ data: { studentId: id, limit: 200 } }),
  });
  const studentClassesFn = useServerFn(listStudentClasses);
  const studentClasses = useQuery({
    queryKey: ["dojo-student-classes", id],
    queryFn: () => studentClassesFn({ data: { studentId: id } }),
    staleTime: 30_000,
  });
  const compHistoryFn = useServerFn(getStudentCompetitionHistory);
  const competitionHistory = useQuery({
    queryKey: ["dojo-student-comp-history", id],
    queryFn: () => compHistoryFn({ data: { student_id: id } }),
    staleTime: 60_000,
  });

  const [grad, setGrad] = useState({ belt_id: "", degree: 0, graduation_date: new Date().toISOString().slice(0, 10), evaluator: "", notes: "" });
  const [enroll, setEnroll] = useState({ plan_id: "", custom_amount: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10), status: "active" as const });
  const [inv, setInv] = useState({ description: "", amount: "", due_date: new Date().toISOString().slice(0, 10) });
  const [previewCert, setPreviewCert] = useState<any | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [activeTab, setActiveTab] = useState("pessoal");
  const [changePlan, setChangePlan] = useState({ open: false, plan_id: "", custom_amount: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10) });
  const [changingPlan, setChangingPlan] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; mode: "cancel" | "freeze"; frozen_until: string }>({ open: false, mode: "cancel", frozen_until: "" });
  const [cancelBusy, setCancelBusy] = useState(false);

  const refresh = () => {
    // Invalida tudo que depende de graduações para que a exclusão reflita
    // no perfil, na listagem, nos certificados e no app do aluno.
    qc.invalidateQueries({ queryKey: ["dojo-student", id] });
    qc.invalidateQueries({ queryKey: ["dojo-students"] });
    qc.invalidateQueries({ queryKey: ["dojo-graduations"] });
    qc.invalidateQueries({ queryKey: ["dojo-certificates"] });
    qc.invalidateQueries({ queryKey: ["graduation-progress"] });
  };


  const doAddGrad = async () => {
    if (!grad.belt_id) return toast.error("Escolha a faixa");
    try {
      await addGrad({ data: { student_id: id, ...grad, degree: Number(grad.degree) } });
      toast.success("Graduação registrada");
      refresh();
      setGrad({ ...grad, evaluator: "", notes: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const doAddEnroll = async () => {
    if (!enroll.plan_id) return toast.error("Escolha o plano");
    try {
      await saveEnroll({ data: {
        student_id: id, plan_id: enroll.plan_id,
        custom_amount: enroll.custom_amount ? Number(enroll.custom_amount) : null,
        due_day: Number(enroll.due_day), start_date: enroll.start_date, status: enroll.status,
      }});
      toast.success("Matrícula salva");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const doChangePlan = async () => {
    if (!changePlan.plan_id) return toast.error("Escolha o novo plano");
    setChangingPlan(true);
    try {
      const res = await doChangePlanFn({ data: {
        student_id: id,
        plan_id: changePlan.plan_id,
        custom_amount: changePlan.custom_amount ? Number(changePlan.custom_amount) : null,
        due_day: Number(changePlan.due_day),
        start_date: changePlan.start_date,
      }});
      const nextDate = (res as any)?.next_billing_date
        ? new Date((res as any).next_billing_date + "T00:00:00").toLocaleDateString("pt-BR")
        : null;
      toast.success(
        nextDate
          ? `Plano alterado. Novo valor entra em vigor em ${nextDate}.`
          : "Plano alterado. Novo valor entra em vigor na próxima cobrança."
      );
      setChangePlan({ ...changePlan, open: false, plan_id: "", custom_amount: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao alterar plano");
    } finally {
      setChangingPlan(false);
    }
  };




  const doAddInv = async () => {
    if (!inv.amount) return toast.error("Informe o valor");
    try {
      await saveInv({ data: {
        student_id: id, description: inv.description || "Mensalidade",
        amount: Number(inv.amount), due_date: inv.due_date,
      }});
      toast.success("Cobrança criada");
      refresh();
      setInv({ description: "", amount: "", due_date: new Date().toISOString().slice(0, 10) });
    } catch (e: any) { toast.error(e.message); }
  };

  const s = (q.data?.student ?? null) as any;
  const graduations = q.data?.graduations ?? [];
  const enrollments = q.data?.enrollments ?? [];
  const invoices = q.data?.invoices ?? [];
  const certificates = q.data?.certificates ?? [];
  const attendanceRows = (attendance.data ?? []) as any[];

  const currentEnrollment = enrollments.find((e: any) => e.status === "active") ?? enrollments[0];
  const anamn = s?.anamnesis ?? {};

  // === Métricas ===
  const enrollmentDate = s?.created_at ?? currentEnrollment?.start_date ?? null;
  const daysTraining = enrollmentDate
    ? Math.max(0, Math.floor((Date.now() - new Date(enrollmentDate).getTime()) / 86400000))
    : 0;
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const attendanceThisMonth = attendanceRows.filter((a) => new Date(a.checked_in_at) >= startMonth).length;
  const lastAttendance = attendanceRows[0]?.checked_in_at ?? null;
  const pendingInvoices = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").length;
  const paidInvoices = invoices.filter((i: any) => i.status === "paid").length;
  const age = s?.birth_date
    ? Math.floor((Date.now() - new Date(s.birth_date).getTime()) / (365.25 * 86400000))
    : null;

  // === Timeline === (hook chamado incondicionalmente para respeitar Rules of Hooks)
  const timeline = useMemo(
    () => (s ? buildTimeline({ graduations, invoices, certificates, attendanceRows, student: s }) : []),
    [graduations, invoices, certificates, attendanceRows, s],
  );

  if (isChildRoute) return <Outlet />;
  if (q.isLoading || !q.data || !s) return <LoadingState />;


  const openCancelDialog = () => setCancelDialog({ open: true, mode: "cancel", frozen_until: "" });
  const confirmCancelAction = async () => {
    setCancelBusy(true);
    try {
      if (cancelDialog.mode === "freeze") {
        await freezeStudent({ data: { id, frozen_until: cancelDialog.frozen_until || null } });
        toast.success("Matrícula congelada", { description: "Cobranças e fluxo do aluno foram pausados." });
        setCancelDialog((d) => ({ ...d, open: false }));
        refresh();
      } else {
        await delStudent({ data: { id } });
        toast.success("Matrícula cancelada", { description: "Dados preservados por 30 dias." });
        setCancelDialog((d) => ({ ...d, open: false }));
        navigate({ to: "/dojo/app/students" });
      }
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setCancelBusy(false);
    }
  };
  const doUnfreeze = async () => {
    try {
      await unfreezeStudent({ data: { id } });
      toast.success("Matrícula reativada");
      refresh();
    } catch (e: any) { toast.error("Erro ao reativar", { description: e.message }); }
  };
  const doRestore = async () => {
    try {
      await restoreStudent({ data: { id } });
      toast.success("Matrícula restaurada");
      refresh();
    } catch (e: any) { toast.error("Erro ao restaurar", { description: e.message }); }
  };

  const saveNote = async () => {
    const newNotes = [s.notes, manualNote ? `[${new Date().toLocaleDateString("pt-BR")}] ${manualNote}` : ""]
      .filter(Boolean).join("\n\n");
    try {
      await saveStudent({ data: { id, full_name: s.full_name, notes: newNotes } });
      toast.success("Observação adicionada");
      setManualNote("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const whatsappLink = s.phone ? `https://wa.me/${String(s.phone).replace(/\D/g, "")}` : null;
  const emailLink = s.email ? `mailto:${s.email}` : null;

  return (
    <div className="space-y-5">

      {/* HERO PREMIUM */}
      <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-white shadow-[0_30px_80px_-30px_rgba(220,38,38,0.45)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7 md:p-8">
          <Link
            to="/dojo/app/students"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Alunos
          </Link>

          <div className="flex flex-col gap-5">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div aria-hidden className="absolute -inset-1 rounded-full bg-gradient-to-br from-red-500/60 to-red-700/10 blur-md" />
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/30 bg-neutral-800 shadow-[0_10px_30px_-8px_rgba(220,38,38,0.55)] sm:h-24 sm:w-24">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl font-bold text-neutral-300">
                      {s.full_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
                  <UserIcon className="h-3 w-3" />
                  Perfil do aluno
                </div>
                <h1 className="font-display text-2xl font-black leading-tight tracking-tight break-words sm:text-3xl md:text-4xl">
                  {s.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-300">
                  <HeroChip>{age != null ? `${age} anos` : "Idade não informada"}</HeroChip>
                  {s.unit?.name && <HeroChip icon={MapPin}>{s.unit.name}</HeroChip>}
                  {currentEnrollment?.plan?.name && <HeroChip icon={Wallet}>{currentEnrollment.plan.name}</HeroChip>}
                  <HeroStatusPill status={s.status} />
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Button
                size="sm"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => navigate({ to: "/dojo/app/students/$id/analysis", params: { id } })}
              >
                <Activity className="mr-1.5 h-4 w-4" /> Performance
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  try { sessionStorage.setItem("dojo-edit-student", id); } catch {}
                  navigate({ to: "/dojo/app/students" });
                }}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => printStudentReport({
                  student: s, branding, belts: belts.data ?? [], graduations, enrollments, invoices, certificates,
                  attendanceRows, competitions: competitionHistory.data ?? [],
                  currentBelts: (q.data as any)?.current_belts ?? [],
                  metrics: { daysTraining, attendanceThisMonth, paidInvoices, pendingInvoices, age, enrollmentDate, lastAttendance },
                })}
              >
                <Printer className="mr-1.5 h-4 w-4" /> PDF
              </Button>
              {whatsappLink && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-1.5 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {emailLink && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={emailLink}>
                    <MailIcon className="mr-1.5 h-4 w-4" /> E-mail
                  </a>
                </Button>
              )}
              {s.status === "frozen" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={doUnfreeze}
                  className="w-full border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:text-white"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Reativar matrícula
                </Button>
              ) : s.status === "cancelled" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={doRestore}
                  className="w-full border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:text-white"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Restaurar matrícula
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openCancelDialog}
                  className="w-full border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Cancelar matrícula
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Diálogo: cancelar / congelar matrícula */}
      <Dialog open={cancelDialog.open} onOpenChange={(v) => setCancelDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar ou congelar matrícula</DialogTitle>
            <DialogDescription>
              Escolha como deseja encerrar o vínculo do aluno <strong>{s.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label
              className={`block cursor-pointer rounded-xl border p-3 transition ${
                cancelDialog.mode === "freeze"
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                  : "border-neutral-200 hover:border-amber-300 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="cancel-mode"
                  className="mt-1"
                  checked={cancelDialog.mode === "freeze"}
                  onChange={() => setCancelDialog((d) => ({ ...d, mode: "freeze" }))}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Congelar matrícula</div>
                  <div className="text-xs text-muted-foreground">
                    Pausa cobranças, lembretes e demais fluxos. O aluno permanece cadastrado e pode ser reativado a qualquer momento.
                  </div>
                  {cancelDialog.mode === "freeze" && (
                    <div className="mt-2">
                      <label className="text-xs font-medium">Reativar automaticamente em (opcional)</label>
                      <Input
                        type="date"
                        value={cancelDialog.frozen_until}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setCancelDialog((d) => ({ ...d, frozen_until: e.target.value }))}
                        className="mt-1"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Deixe em branco para congelar por tempo indeterminado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </label>

            <label
              className={`block cursor-pointer rounded-xl border p-3 transition ${
                cancelDialog.mode === "cancel"
                  ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                  : "border-neutral-200 hover:border-red-300 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="cancel-mode"
                  className="mt-1"
                  checked={cancelDialog.mode === "cancel"}
                  onChange={() => setCancelDialog((d) => ({ ...d, mode: "cancel" }))}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-700 dark:text-red-300">Cancelar definitivamente</div>
                  <div className="text-xs text-muted-foreground">
                    Encerra a matrícula. Os dados do aluno ficam preservados por 30 dias — dentro desse prazo você pode restaurar o cadastro sem perdas.
                  </div>
                </div>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelDialog((d) => ({ ...d, open: false }))} disabled={cancelBusy}>
              Voltar
            </Button>
            <Button
              onClick={confirmCancelAction}
              disabled={cancelBusy}
              className={cancelDialog.mode === "cancel" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}
            >
              {cancelBusy ? "Processando..." : cancelDialog.mode === "freeze" ? "Congelar matrícula" : "Cancelar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Layout: sidebar / conteúdo (timeline vai como card horizontal abaixo) */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">

        {/* ============ SIDEBAR ============ */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card className="dojo-card relative overflow-hidden border-neutral-200/70 bg-white shadow-sm">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-600" />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />


            {/* Faixas atuais (uma por modalidade) */}
            <div className="p-4 space-y-3 text-sm">
              {(() => {
                const currentBelts: any[] = (q.data as any)?.current_belts ?? [];
                if (currentBelts.length === 0 && s.current_belt_id) {
                  const belt = (belts.data ?? []).find((b: any) => b.id === s.current_belt_id);
                  if (belt) {
                    currentBelts.push({ modality: belt.modality, belt, degree: s.current_degree ?? 0 });
                  }
                }
                if (currentBelts.length === 0) {
                  return <div className="text-xs text-muted-foreground">Faixa ainda não registrada.</div>;
                }
                return (
                  <div>
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {currentBelts.length > 1 ? "Faixas atuais" : "Faixa atual"}
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      {currentBelts.map((b: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <BeltAuto
                            belt={b.belt}
                            degree={b.degree ?? 0}
                            className="w-[220px]"
                          />
                          <div className="min-w-0 text-center">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {b.belt.modality ?? "jiu-jitsu"}
                            </div>
                            <div className="font-medium text-sm">{formatBeltName(b.belt.name, b.belt?.modality)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDegree(b.degree, b.belt?.modality, b.belt?.name)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}



              <SidebarField icon={MapPin} label="Unidade" value={s.unit?.name} />
              <SidebarField icon={UserIcon} label="Modalidade" value={anamn.modality ?? "—"} />
              <SidebarField icon={Wallet} label="Plano" value={currentEnrollment?.plan?.name ?? "—"} />
              <SidebarField icon={CalendarCheck} label="Matrícula" value={fmtDate(enrollmentDate)} />
              <SidebarField icon={TrendingUp} label="Tempo de academia" value={enrollmentDate ? `${Math.floor(daysTraining / 30)} meses` : "—"} />
            </div>
          </Card>

          {/* Códigos de check-in */}
          <CheckinCodesCard student={s} onUpdated={() => q.refetch()} />
        </aside>

        {/* ============ ÁREA PRINCIPAL ============ */}
        <main className="min-w-0 space-y-4">
          {/* Alerta: aluno sem plano cadastrado */}
          {enrollments.length === 0 && (
            <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-background">
              <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Este aluno ainda não possui um plano</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Cadastre um plano para iniciar o ciclo financeiro. A primeira cobrança será gerada automaticamente pelo AMT Pay.
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setActiveTab("academia");
                    setTimeout(() => {
                      document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="shrink-0"
                >
                  <Wallet className="h-4 w-4 mr-1.5" /> Cadastrar Plano
                </Button>
              </CardContent>
            </Card>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={Activity} label="Matriculado a (dias)" value={daysTraining || "—"} />
            <Kpi icon={CalendarCheck} label="Presença no mês" value={attendanceThisMonth} />
            <Kpi icon={Wallet} label="Pagas" value={paidInvoices} tint={paidInvoices > 0 ? "success" : undefined} />
            <Kpi icon={Wallet} label="Pendentes" value={pendingInvoices} tint={pendingInvoices > 0 ? "warning" : undefined} />
            <Kpi icon={GraduationCap} label="Graduações" value={graduations.length} />
            <Kpi icon={Award} label="Certificados" value={certificates.length} />
          </div>


          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="flex w-max min-w-full flex-nowrap gap-0.5 rounded-2xl border border-neutral-200/70 bg-white p-1 shadow-sm ring-1 ring-red-400/10">
                <TabsTrigger value="pessoal">Dados</TabsTrigger>
                <TabsTrigger value="academia">Academia</TabsTrigger>
                <TabsTrigger value="plano">Plano</TabsTrigger>
                <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
                <TabsTrigger value="lgpd">LGPD</TabsTrigger>
                <TabsTrigger value="graduacoes">Graduações</TabsTrigger>
                <TabsTrigger value="certificados">Certificados</TabsTrigger>
                <TabsTrigger value="contratos">Contratos</TabsTrigger>
                
                <TabsTrigger value="competicoes">Competições</TabsTrigger>
                <TabsTrigger value="turmas">Turmas</TabsTrigger>
                <TabsTrigger value="frequencia">Frequência</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="observacoes">Observações</TabsTrigger>
                <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
              </TabsList>
            </div>

            {/* --- Dados Pessoais --- */}
            <TabsContent value="pessoal" className="mt-4 space-y-4">
              <SectionCard title="Identificação" icon={UserIcon}>
                <InfoGrid>
                  <Info label="CPF" value={s.cpf} />
                  <Info label="RG" value={s.rg} />
                  <Info label="Nascimento" value={fmtDate(s.birth_date)} />
                  <Info label="Sexo" value={s.gender} />
                  <Info label="Nacionalidade" value={s.nationality} />
                  <Info label="Estado civil" value={s.marital_status} />
                  <Info label="Profissão" value={s.profession} />
                  <Info label="Idade" value={age != null ? `${age} anos` : null} />
                </InfoGrid>
              </SectionCard>

              <SectionCard title="Contato" icon={Phone}>
                <InfoGrid>
                  <Info label="Telefone" value={s.phone} />
                  <Info label="WhatsApp" value={s.phone} />
                  <Info label="E-mail" value={s.email} />
                </InfoGrid>
              </SectionCard>

              <SectionCard title="Endereço" icon={MapPin}>
                <InfoGrid>
                  <Info label="Logradouro" value={s.street} />
                  <Info label="Número" value={s.address_number} />
                  <Info label="Complemento" value={s.address_complement} />
                  <Info label="Bairro" value={s.neighborhood} />
                  <Info label="Cidade" value={s.city} />
                  <Info label="Estado" value={s.state} />
                  <Info label="CEP" value={s.zip} />
                </InfoGrid>
              </SectionCard>

              <SectionCard title="Filiação e responsáveis" icon={UserIcon}>
                <InfoGrid>
                  <Info label="Responsável" value={s.guardian_name} />
                  <Info label="Tel. responsável" value={s.guardian_phone} />
                  <Info label="Contato emergência" value={s.emergency_contact_name} />
                  <Info label="Tel. emergência" value={s.emergency_contact_phone} />
                  <Info label="Parentesco" value={s.emergency_contact_relationship} />
                </InfoGrid>
              </SectionCard>
            </TabsContent>

            {/* --- Dados da Academia --- */}
            <TabsContent value="academia" className="mt-4 space-y-4">
              <SectionCard title="Matrícula" icon={GraduationCap}>
                <InfoGrid>
                  <Info label="Nº matrícula" value={s.id?.slice(0, 8).toUpperCase()} />
                  <Info label="Unidade" value={s.unit?.name} />
                  <Info label="Data de matrícula" value={fmtDate(enrollmentDate)} />
                  <Info label="Status" value={statusLabel(s.status)} />
                  <Info label="Plano" value={currentEnrollment?.plan?.name} />
                  <Info label="Situação financeira" value={pendingInvoices > 0 ? `${pendingInvoices} pendente(s)` : "Em dia"} />
                  <Info label="Origem" value={s.source ?? "—"} />
                  <Info label="Observações internas" value={s.notes} />
                </InfoGrid>
              </SectionCard>

              <div id="plans-section"><SectionCard title="Matrículas / Planos" icon={Wallet}>
                <div className="grid md:grid-cols-5 gap-2">
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={enroll.plan_id} onChange={(e) => setEnroll({ ...enroll, plan_id: e.target.value })}>
                    <option value="">Plano</option>
                    {(plans.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} · {brl(p.amount)}</option>)}
                  </select>
                  <Input type="number" step="0.01" placeholder="Valor custom" value={enroll.custom_amount} onChange={(e) => setEnroll({ ...enroll, custom_amount: e.target.value })} />
                  <Input type="number" min={1} max={31} placeholder="Dia venc." value={enroll.due_day} onChange={(e) => setEnroll({ ...enroll, due_day: Number(e.target.value) })} />
                  <Input type="date" value={enroll.start_date} onChange={(e) => setEnroll({ ...enroll, start_date: e.target.value })} />
                  <Button onClick={doAddEnroll}>Salvar</Button>
                </div>
                <div className="mt-3 rounded-lg border border-border">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 border-b border-border last:border-0 text-sm">
                      <div className="min-w-0 flex-1 truncate">
                        {e.plan?.name} · {brl(e.custom_amount ?? e.plan?.amount)} · venc. dia {e.due_day} · <Badge variant="outline">{e.status}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={async () => { await delEnroll({ data: { id: e.id } }); refresh(); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {enrollments.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem matrículas ativas.</div>}
                </div>
              </SectionCard></div>
            </TabsContent>

            {/* --- Plano atual + Troca de plano --- */}
            <TabsContent value="plano" className="mt-4 space-y-4">
              <SectionCard title="Plano atual" icon={Wallet}>
                {currentEnrollment ? (
                  <>
                    <InfoGrid>
                      <Info label="Plano" value={currentEnrollment.plan?.name ?? "—"} />
                      <Info
                        label="Valor mensal"
                        value={brl(currentEnrollment.custom_amount ?? currentEnrollment.plan?.amount ?? 0)}
                      />
                      <Info label="Dia de vencimento" value={`Dia ${currentEnrollment.due_day ?? "—"}`} />
                      <Info label="Início" value={fmtDate(currentEnrollment.start_date)} />
                      <Info label="Status" value={<Badge variant="outline">{currentEnrollment.status}</Badge>} />
                      <Info
                        label="Recorrência"
                        value={(currentEnrollment.plan as any)?.billing_cycle ?? (currentEnrollment.plan as any)?.recurrence ?? "Mensal"}
                      />
                    </InfoGrid>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => setChangePlan({
                          open: true, plan_id: "", custom_amount: "",
                          due_day: currentEnrollment.due_day ?? 5,
                          start_date: new Date().toISOString().slice(0, 10),
                        })}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Trocar de plano
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Este aluno ainda não possui plano ativo.
                    </div>
                    <Button
                      onClick={() => setChangePlan({
                        open: true, plan_id: "", custom_amount: "", due_day: 5,
                        start_date: new Date().toISOString().slice(0, 10),
                      })}
                    >
                      <Wallet className="mr-2 h-4 w-4" /> Matricular em um plano
                    </Button>
                  </div>
                )}
              </SectionCard>

              {changePlan.open && (
                <SectionCard title={currentEnrollment ? "Trocar de plano" : "Novo plano"} icon={RefreshCw}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Novo plano</label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={changePlan.plan_id}
                        onChange={(e) => setChangePlan({ ...changePlan, plan_id: e.target.value })}
                      >
                        <option value="">Selecione um plano</option>
                        {(plans.data ?? [])
                          .filter((p: any) => p.id !== currentEnrollment?.plan_id)
                          .map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} · {brl(p.amount)}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Valor personalizado (opcional)</label>
                      <Input
                        type="number" step="0.01" placeholder="Deixe em branco para usar valor do plano"
                        value={changePlan.custom_amount}
                        onChange={(e) => setChangePlan({ ...changePlan, custom_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Dia de vencimento</label>
                      <Input
                        type="number" min={1} max={28}
                        value={changePlan.due_day}
                        onChange={(e) => setChangePlan({ ...changePlan, due_day: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Início da nova vigência</label>
                      <Input
                        type="date"
                        value={changePlan.start_date}
                        onChange={(e) => setChangePlan({ ...changePlan, start_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                    O novo valor <strong>entra em vigor na próxima cobrança</strong>. Faturas já emitidas
                    do ciclo atual mantêm o valor anterior. Assinaturas em vigor no gateway são canceladas automaticamente.
                  </div>
                  {currentEnrollment && (
                    <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                      A matrícula atual será encerrada (histórico preservado) e a nova passará a gerar as cobranças recorrentes via AMT Pay.
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button onClick={doChangePlan} disabled={changingPlan || !changePlan.plan_id}>
                      {changingPlan ? "Processando..." : "Confirmar"}
                    </Button>
                    <Button variant="ghost" onClick={() => setChangePlan({ ...changePlan, open: false })}>
                      Cancelar
                    </Button>
                  </div>
                </SectionCard>
              )}

              {enrollments.length > 0 && (
                <SectionCard title="Histórico de planos" icon={ClipboardList}>
                  <div className="rounded-lg border border-border">
                    {enrollments.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between border-b border-border p-3 text-sm last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{e.plan?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {brl(e.custom_amount ?? e.plan?.amount ?? 0)} · início {fmtDate(e.start_date)} · venc. dia {e.due_day}
                          </div>
                        </div>
                        <Badge variant={e.status === "active" ? "default" : "outline"}>{e.status}</Badge>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>



            {/* --- Anamnese --- */}
            <TabsContent value="anamnese" className="mt-4 space-y-4">
              <SectionCard title="Ficha de saúde" icon={Heart}>
                <InfoGrid>
                  <Info label="Tipo sanguíneo" value={s.blood_type} />
                  <Info label="Plano de saúde" value={s.health_insurance} />
                  <Info label="Nº carteirinha" value={anamn.health_card_number} />
                  <Info label="Contato médico" value={anamn.doctor_contact} />
                  <Info label="Peso" value={anamn.weight ? `${anamn.weight} kg` : null} />
                  <Info label="Altura" value={anamn.height ? `${anamn.height} m` : null} />
                  <Info label="Atestado médico" value={s.has_medical_clearance ? `Sim (${fmtDate(s.medical_clearance_date)})` : "Não"} />
                  <Info label="Nível de atividade" value={anamn.physical_activity_level} />
                </InfoGrid>
              </SectionCard>

              <SectionCard title="Histórico clínico" icon={ClipboardList}>
                <InfoGrid>
                  <Info label="Medicações" value={anamn.medications} />
                  <Info label="Alergias" value={anamn.allergies} />
                  <Info label="Doenças" value={anamn.medical_conditions} />
                  <Info label="Lesões anteriores" value={anamn.injuries} />
                  <Info label="Cirurgias" value={anamn.surgeries} />
                  <Info label="Restrições físicas" value={anamn.restrictions ?? anamn.other} />
                  <Info label="Objetivos" value={anamn.objectives} />
                </InfoGrid>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    anamn.heart_issues && "Cardíaco",
                    anamn.diabetes && "Diabetes",
                    anamn.hypertension && "Hipertensão",
                    anamn.asthma && "Asma",
                    anamn.pregnant && "Gestante",
                    anamn.smoking && "Fumante",
                    anamn.alcohol && "Álcool",
                  ].filter(Boolean).map((tag) => (
                    <Badge key={String(tag)} variant="destructive" className="text-[10px]">
                      <AlertDot /> {tag}
                    </Badge>
                  ))}
                </div>
              </SectionCard>
            </TabsContent>

            {/* --- LGPD --- */}
            <TabsContent value="lgpd" className="mt-4 space-y-4">
              <SectionCard title="Termos e consentimentos" icon={ShieldCheck}>
                <div className="space-y-3">
                  <ConsentRow label="Consentimento para uso de dados (LGPD)" granted={!!s.lgpd_consent} date={s.lgpd_consent_date} />
                  <ConsentRow label="Reconhecimento Facial (Check-in Inteligente)" granted={!!s.facial_recognition_consent} date={s.facial_recognition_consent_at} />
                  <ConsentRow label="Consentimento para uso de imagem" granted={!!s.image_rights_consent} />
                  <ConsentRow label="Aceite dos termos" granted={!!s.terms_accepted} date={s.terms_accepted_date} />
                  <ConsentRow label="Consentimento para marketing" granted={!!s.marketing_consent} />
                </div>
                
                <div className="mt-6 space-y-4 border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Fotos de Referência</h4>
                      <p className="text-xs text-muted-foreground">Utilizadas para identificação no check-in por foto.</p>
                    </div>
                    {s.facial_recognition_consent && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const url = window.prompt("URL da foto de referência:");
                        if (url) {
                          addRefPhoto({ data: { studentId: id, photoUrl: url } })
                            .then(() => { toast.success("Foto adicionada"); refresh(); })
                            .catch(e => toast.error(e.message));
                        }
                      }}>
                        <Camera className="mr-1.5 h-4 w-4" /> Adicionar
                      </Button>
                    )}
                  </div>

                  {!s.facial_recognition_consent ? (
                    <div className="rounded-lg bg-muted/50 p-4 text-center text-xs text-muted-foreground">
                      <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                      Autorize o reconhecimento facial acima para gerenciar fotos de referência.
                    </div>
                  ) : (q.data as any)?.referencePhotos?.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Nenhuma foto de referência cadastrada.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {(q.data as any)?.referencePhotos?.map((p: any) => (
                        <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                          <img src={p.photo_url} alt="Referência" className="h-full w-full object-cover" />
                          <button 
                            onClick={() => {
                              if (confirm("Excluir esta foto?")) {
                                delRefPhoto({ data: { id: p.id } })
                                  .then(() => { toast.success("Foto removida"); refresh(); })
                                  .catch(e => toast.error(e.message));
                              }
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  <FileText className="mx-auto mb-1 h-5 w-5" />
                  Anexo de termo assinado (PDF) — em breve integrado ao módulo Documentos.
                </div>
              </SectionCard>
            </TabsContent>

            {/* --- Graduações --- */}
            <TabsContent value="graduacoes" className="mt-4 space-y-4">
              <GraduationCriteriaCard
                student={s}
                belts={belts.data ?? []}
                graduations={graduations}
                attendanceRows={attendanceRows}
                onSaved={refresh}
                saveStudent={saveStudent}
              />

              <SectionCard title="Nova graduação" icon={GraduationCap}>
                <div className="grid gap-2 md:grid-cols-6">
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={grad.belt_id} onChange={(e) => setGrad({ ...grad, belt_id: e.target.value, degree: 0 })}>
                    <option value="">Faixa</option>
                    {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {(() => {
                    const selBelt = (belts.data ?? []).find((b: any) => b.id === grad.belt_id);
                    const maxDeg = selBelt?.max_degrees ?? 4;
                    return (
                      <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={grad.degree} onChange={(e) => setGrad({ ...grad, degree: Number(e.target.value) })} disabled={!selBelt}>
                        {Array.from({ length: maxDeg + 1 }).map((_, i) => (
                          <option key={i} value={i}>{formatDegree(i, selBelt?.modality, selBelt?.name)}</option>
                        ))}
                      </select>
                    );
                  })()}
                  <Input type="date" value={grad.graduation_date} onChange={(e) => setGrad({ ...grad, graduation_date: e.target.value })} />
                  <Input placeholder="Avaliador" value={grad.evaluator} onChange={(e) => setGrad({ ...grad, evaluator: e.target.value })} />
                  <Input placeholder="Obs." value={grad.notes} onChange={(e) => setGrad({ ...grad, notes: e.target.value })} />
                  <Button onClick={doAddGrad}>Registrar</Button>
                </div>
              </SectionCard>

              <SectionCard title="Linha do tempo" icon={TrendingUp}>
                {graduations.length === 0 ? (
                  <EmptyState label="Sem graduações registradas." />
                ) : (
                  (() => {
                    // Uma linha do tempo por modalidade
                    const groups = new Map<string, any[]>();
                    for (const g of graduations) {
                      const mod = (g.belt?.modality ?? "jiu-jitsu").toString();
                      const arr = groups.get(mod) ?? [];
                      arr.push(g);
                      groups.set(mod, arr);
                    }
                    const entries = Array.from(groups.entries());
                    return (
                      <div className="space-y-6">
                        {entries.map(([mod, items]) => (
                          <div key={mod}>
                            {entries.length > 1 && (
                              <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                  {mod}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {items.length} {items.length === 1 ? "graduação" : "graduações"}
                                </span>
                              </div>
                            )}
                            <ol className="relative space-y-4 border-l-2 border-border pl-4">
                              {items.map((g: any) => (
                                <li key={g.id} className="relative">
                                  <span className="absolute -left-[21px] top-5 h-3 w-3 rounded-full border-2 border-primary bg-card" />
                                  <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
                                    {/* Ilustração — tamanho padronizado (220x32 escalado) */}
                                    <div className="h-[26px] w-[176px] shrink-0 overflow-hidden">
                                      <div className="h-8 w-[220px] origin-top-left scale-[0.8]">
                                        {g.belt ? <BeltAuto belt={g.belt} degree={g.degree} className="w-full" /> : null}
                                      </div>
                                    </div>
                                    {/* Modalidade */}
                                    <div className="w-full shrink-0 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:w-28">
                                      {g.belt?.modality ?? "—"}
                                    </div>
                                    {/* Nome da graduação */}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">
                                        {formatBeltFull(g.belt?.name ?? "", g.belt?.modality, g.degree)}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {fmtDate(g.graduation_date)} · {g.evaluator ?? "Avaliador não informado"}
                                        {g.notes ? ` · ${g.notes}` : ""}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1.5 text-xs"
                                        onClick={() => setCertIssue({ open: true, grad: g, template_id: "" })}
                                      >
                                        <Award className="h-3.5 w-3.5" /> Emitir certificado
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={async () => {
                                        if (!confirm("Excluir esta graduação? Ela será removida de todo o sistema, incluindo certificados emitidos e o app do aluno.")) return;
                                        try {
                                          await delGrad({ data: { id: g.id } });
                                          refresh();
                                          toast.success("Graduação excluída de todo o sistema");
                                        } catch (e: any) {
                                          toast.error(e?.message ?? "Não foi possível excluir a graduação");
                                        }
                                      }}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>

                                  </div>
                                </li>


                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </SectionCard>

            </TabsContent>

            {/* --- Certificados --- */}
            <TabsContent value="certificados" className="mt-4 space-y-4">
              <SectionCard title="Certificados emitidos" icon={Award}>
                {certificates.length === 0 ? (
                  <EmptyState label="Sem certificados. Emita a partir da aba de Graduações." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="p-2 text-left">Tipo</th>
                          <th className="p-2 text-left">Data</th>
                          <th className="p-2 text-left">Faixa/Grau</th>
                          <th className="p-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certificates.map((c: any) => {
                          const hasTemplate = !!c.template && (!!c.template.background_url || (Array.isArray(c.template.fields) && c.template.fields.length > 0));
                          const beltLabel = c.graduation?.belt?.name
                            ? formatBeltFull(c.graduation.belt.name, c.graduation.belt?.modality, c.graduation.degree)
                            : (c.values?.belt ?? "—");

                          return (
                            <tr key={c.id} className="border-b border-border last:border-0">
                              <td className="p-2 font-medium">{c.template?.name ?? "Certificado"}</td>
                              <td className="p-2 text-muted-foreground">{fmtDate(c.issued_at)}</td>
                              <td className="p-2 text-muted-foreground">{beltLabel}</td>
                              <td className="p-2 text-right">
                                <div className="inline-flex gap-1">
                                  <Button size="sm" variant="outline" disabled={!hasTemplate} onClick={() => setPreviewCert(c)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" disabled={!hasTemplate}
                                    onClick={() => openCertificatePrint([{ template: c.template as CertificateTemplate, values: c.values ?? {} }])}>
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="contratos" className="mt-4 space-y-4">
              <SectionCard title="Contratos do aluno" icon={FileText}>
                <StudentContracts studentId={id} student={s} />
              </SectionCard>
            </TabsContent>

            {/* --- Competições --- */}
            <TabsContent value="competicoes" className="mt-4 space-y-4">
              <SectionCard title="Competições" icon={Trophy}>
                <StudentCompetitionHistory studentId={id} />
              </SectionCard>
            </TabsContent>

            {/* --- Turmas --- */}
            <TabsContent value="turmas" className="mt-4 space-y-4">
              <SectionCard title="Turmas do aluno" icon={Users}>
                {studentClasses.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !studentClasses.data || studentClasses.data.length === 0 ? (
                  <EmptyState label="Este aluno ainda não está matriculado em nenhuma turma. Adicione-o pela Agenda." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {studentClasses.data.map((row: any) => {
                      const cls = row.dojo_classes;
                      if (!cls) return null;
                      const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                      const schedules = (cls.schedules ?? []).slice().sort((a: any, b: any) => (a.weekday - b.weekday) || String(a.start_time).localeCompare(String(b.start_time)));
                      const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "—");
                      const isActive = (row.status ?? "active") === "active";
                      return (
                        <Link
                          key={row.id}
                          to="/dojo/app/schedule/$id"
                          params={{ id: cls.id }}
                          className="group rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-red-300 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                              style={{ background: cls.color || "#dc2626" }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-neutral-900">{cls.name}</p>
                                <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                                  {isActive ? "Ativo" : row.status ?? "—"}
                                </Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                                {cls.modality ? <span>{cls.modality}</span> : null}
                                {cls.level ? <span>· {cls.level}</span> : null}
                                {cls.teacher_name ? <span>· Prof. {cls.teacher_name}</span> : null}
                              </div>
                              {(cls.dojo_units?.name || cls.dojo_spaces?.name) ? (
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                                  <PinIcon className="h-3 w-3" />
                                  <span className="truncate">
                                    {[cls.dojo_units?.name, cls.dojo_spaces?.name].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                              ) : null}
                              {schedules.length > 0 ? (
                                <ul className="mt-2 space-y-0.5">
                                  {schedules.map((sc: any) => (
                                    <li key={sc.id} className="flex items-center gap-1 text-[11px] text-neutral-600">
                                      <Clock className="h-3 w-3 text-neutral-400" />
                                      <span className="font-medium">{weekdays[Number(sc.weekday)] ?? "—"}</span>
                                      <span className="text-neutral-500">{hhmm(sc.start_time)} – {hhmm(sc.end_time)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-[11px] text-neutral-400">Sem horários cadastrados</p>
                              )}
                              <p className="mt-2 text-[10px] uppercase tracking-wide text-neutral-400">
                                Matriculado em {fmtDate(row.enrolled_at)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </TabsContent>


            <TabsContent value="frequencia" className="mt-4 space-y-4">
              <SectionCard title="Presença" icon={CalendarCheck}>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <MiniStat label="Este mês" value={attendanceThisMonth} />
                  <MiniStat label="Total" value={attendanceRows.length} />
                  <MiniStat label="Última presença" value={lastAttendance ? fmtDate(lastAttendance) : "—"} />
                  <MiniStat label="Frequência semanal" value={weeklyFrequency(attendanceRows)} />
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">Últimos 30 dias</div>
                  <AttendanceHeatmap rows={attendanceRows} />
                </div>

                <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-border">
                  {attendanceRows.length === 0 ? (
                    <EmptyState label="Sem check-ins registrados." compact />
                  ) : attendanceRows.slice(0, 40).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border p-2 text-xs last:border-0">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                        <span>{fmtDateTime(a.checked_in_at)}</span>
                      </div>
                      <span className="text-muted-foreground">{a.dojo_units?.name ?? a.method ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </TabsContent>

            {/* --- Documentos --- */}
            <TabsContent value="documentos" className="mt-4 space-y-4">
              <SectionCard title="Documentos anexados" icon={FileText}>
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">Arraste arquivos aqui</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, imagens, atestados, contratos e autorizações — em breve.
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" disabled>
                    <Upload className="h-4 w-4 mr-1.5" /> Enviar arquivo
                  </Button>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Estrutura preparada para categorização, download e exclusão de documentos por aluno.
                </p>
              </SectionCard>
            </TabsContent>

            {/* --- Observações --- */}
            <TabsContent value="observacoes" className="mt-4 space-y-4">
              <SectionCard title="Nova observação" icon={ClipboardList}>
                <Textarea rows={3} placeholder="Registre uma observação sobre o aluno…" value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={saveNote} disabled={!manualNote.trim()}>Adicionar</Button>
                </div>
              </SectionCard>

              <SectionCard title="Histórico do aluno" icon={Sparkles}>
                {timeline.length === 0 ? (
                  <EmptyState label="Nenhuma movimentação registrada ainda." />
                ) : (
                  <ol className="space-y-3">
                    {timeline.slice(0, 40).map((ev, idx) => (
                      <li key={idx} className="flex gap-3">
                        <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <ev.Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{ev.title}</div>
                          {ev.description && <div className="text-xs text-muted-foreground">{ev.description}</div>}
                          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{fmtDate(ev.date)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {s.notes && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Observações internas</div>
                    {s.notes}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* --- Benefícios Corporativos --- */}
            <TabsContent value="beneficios" className="mt-4 space-y-4">
              <SectionCard title="Benefícios Corporativos" icon={ShieldCheck}>
                <p className="text-xs text-muted-foreground mb-3">
                  Vincule o aluno a plataformas de benefícios corporativos. A validação de check-in acontece automaticamente no módulo Check-in.
                </p>
                <StudentCorporateBenefitsSection studentId={id} />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </main>
      </div>


      {/* ============ MOVIMENTAÇÃO (card horizontal, largura total) ============ */}
      <Card className="dojo-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Movimentação
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {timeline.length === 0 ? (
            <EmptyState label="Sem eventos registrados." compact />
          ) : (
            <div className="-mx-2 overflow-x-auto pb-2">
              <ol className="flex min-w-full gap-3 px-2">
                {timeline.slice(0, 30).map((ev, idx) => (
                  <li
                    key={idx}
                    className="relative flex w-56 shrink-0 flex-col gap-1 rounded-lg border border-border bg-card/60 p-3 text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <ev.Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </div>
                    {ev.description && (
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{ev.description}</div>
                    )}
                    <div className="mt-auto text-[10px] uppercase tracking-widest text-muted-foreground">
                      {relativeTime(ev.date)}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <CertificatePreviewDialog
        open={!!previewCert}
        onOpenChange={(v) => { if (!v) setPreviewCert(null); }}
        template={previewCert?.template ?? null}
        values={previewCert?.values ?? {}}
        title={previewCert ? `Certificado — ${s.full_name}` : undefined}
      />

    </div>
  );
}

// ============ HELPERS ============
function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full" />
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />

    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: any; label: string; value: React.ReactNode; tint?: "success" | "warning" }) {
  const ring =
    tint === "success" ? "ring-emerald-400/30" : tint === "warning" ? "ring-amber-400/30" : "ring-red-400/25";
  const glow =
    tint === "success" ? "from-emerald-500/20 to-emerald-500/5"
      : tint === "warning" ? "from-amber-500/20 to-amber-500/5"
      : "from-red-500/15 to-red-500/5";
  const iconTone =
    tint === "success" ? "text-emerald-600 bg-emerald-50"
      : tint === "warning" ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";
  const valueTone =
    tint === "success" ? "text-emerald-700" : tint === "warning" ? "text-amber-700" : "text-neutral-900";
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-3.5 shadow-sm ring-1 ${ring} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${glow} blur-2xl`} />
      <div className="relative flex items-center justify-between gap-2">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className={`font-display text-2xl font-black leading-none tracking-tight ${valueTone}`}>
          {value ?? "—"}
        </div>
      </div>
      <div className="relative mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}


function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    inactive: { label: "Inativo", cls: "bg-muted text-muted-foreground border-border" },
    frozen: { label: "Trancado", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    trial: { label: "Experimental", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  };
  const cfg = map[status ?? ""] ?? map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls} ${className ?? ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {cfg.label}
    </span>
  );
}

function statusLabel(s?: string) {
  return s === "active" ? "Ativo" : s === "frozen" ? "Trancado" : s === "inactive" ? "Inativo" : s ?? "—";
}

function SidebarField({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="dojo-card relative overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-red-500 via-red-400 to-red-600 opacity-80" />
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100">
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-display tracking-tight">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function HeroChip({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur">
      {Icon ? <Icon className="h-3 w-3 text-red-300" /> : null}
      {children}
    </span>
  );
}

function HeroStatusPill({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    active: { label: "Ativo", cls: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100", dot: "bg-emerald-400" },
    inactive: { label: "Inativo", cls: "border-white/20 bg-white/5 text-neutral-300", dot: "bg-neutral-400" },
    frozen: { label: "Trancado", cls: "border-amber-300/40 bg-amber-500/15 text-amber-100", dot: "bg-amber-400" },
    trial: { label: "Experimental", cls: "border-sky-300/40 bg-sky-500/15 text-sky-100", dot: "bg-sky-400" },
  };
  const cfg = map[status ?? ""] ?? map.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shadow-[0_0_0_3px_rgba(255,255,255,0.06)]`} /> {cfg.label}
    </span>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">{children}</dl>;
}

function Info({ label, value }: { label: string; value: any }) {
  const v = value === true ? "Sim" : value === false ? "Não" : value;
  const display = v === null || v === undefined || v === "" ? "—" : String(v);
  return (
    <div className="flex gap-2 border-b border-dashed border-border py-1.5 text-sm last:border-0">
      <dt className="min-w-[8rem] text-xs text-muted-foreground">{label}</dt>
      <dd className="flex-1 break-words">{display}</dd>
    </div>
  );
}

function EmptyState({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div className={`text-center text-muted-foreground ${compact ? "p-3 text-xs" : "p-6 text-sm"}`}>{label}</div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function ConsentRow({ label, granted, date }: { label: string; granted: boolean; date?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {date && <div className="mt-0.5 text-[11px] text-muted-foreground">Assinado em {fmtDate(date)}</div>}
      </div>
      <Badge variant={granted ? "default" : "outline"} className={granted ? "bg-emerald-100 text-emerald-800" : ""}>
        {granted ? "Autorizado" : "Pendente"}
      </Badge>
    </div>
  );
}

function InvoiceStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Paga", cls: "bg-emerald-100 text-emerald-800" },
    overdue: { label: "Vencida", cls: "bg-red-100 text-red-800" },
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  };
  const cfg = map[status] ?? map.pending;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function AlertDot() {
  return <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />;
}

function AttendanceHeatmap({ rows }: { rows: any[] }) {
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    return d;
  });
  const set = new Set(rows.map((r) => new Date(r.checked_in_at).toISOString().slice(0, 10)));
  return (
    <div className="flex gap-0.5">
      {days.map((d) => {
        const key = d.toISOString().slice(0, 10);
        const present = set.has(key);
        return (
          <div
            key={key}
            title={`${d.toLocaleDateString("pt-BR")}${present ? " — presença" : ""}`}
            className={`h-6 flex-1 rounded-sm ${present ? "bg-primary" : "bg-muted"}`}
          />
        );
      })}
    </div>
  );
}

function weeklyFrequency(rows: any[]): string {
  if (rows.length === 0) return "—";
  const startWeek = new Date();
  startWeek.setDate(startWeek.getDate() - 28);
  const recent = rows.filter((r) => new Date(r.checked_in_at) >= startWeek);
  const weekly = recent.length / 4;
  return `${weekly.toFixed(1)}/sem`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < day) return "Hoje";
  if (diff < 2 * day) return "Ontem";
  if (diff < 7 * day) return `${Math.floor(diff / day)} dias atrás`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} sem atrás`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} meses atrás`;
  return `${Math.floor(diff / (365 * day))} anos atrás`;
}

type TimelineEvent = { date: string; title: string; description?: string; Icon: any };

function buildTimeline({ graduations, invoices, certificates, attendanceRows, student }: {
  graduations: any[]; invoices: any[]; certificates: any[]; attendanceRows: any[]; student: any;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (student.created_at) {
    events.push({ date: student.created_at, title: "Aluno cadastrado", description: "Registro inicial no dojo", Icon: UserIcon });
  }

  for (const g of graduations) {
    events.push({
      date: g.graduation_date,
      title: `Graduação · ${g.belt?.name ?? "faixa"}${g.degree ? ` (${g.degree}º ${degreeUnit(g.belt?.modality)})` : ""}`,
      description: g.evaluator ? `Avaliador: ${g.evaluator}` : undefined,
      Icon: GraduationCap,
    });
  }
  for (const c of certificates) {
    events.push({
      date: c.issued_at,
      title: `Certificado emitido`,
      description: c.template?.name,
      Icon: Award,
    });
  }
  for (const i of invoices) {
    if (i.status === "paid" && i.paid_at) {
      events.push({ date: i.paid_at, title: "Mensalidade paga", description: `${i.description} · ${brl(i.amount)}`, Icon: Wallet });
    }
  }
  for (const a of attendanceRows.slice(0, 10)) {
    events.push({ date: a.checked_in_at, title: "Presença na aula", description: a.dojo_units?.name ?? undefined, Icon: CalendarCheck });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

// ============ CHECK-IN CODES ============
function CheckinCodesCard({ student, onUpdated }: { student: any; onUpdated: () => void }) {
  const regen = useServerFn(regenerateStudentCodes);
  const [busy, setBusy] = useState(false);
  async function run(kind: "pin" | "qr" | "both") {
    setBusy(true);
    try {
      await regen({ data: { studentId: student.id, resetPin: kind !== "qr", resetQr: kind !== "pin" } });
      toast.success("Códigos atualizados");
      onUpdated();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  return (
    <Card className="dojo-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4 text-primary" /> Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PIN</div>
          <div className="mt-0.5 font-mono text-lg">{student.checkin_pin ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Token QR</div>
          <div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">{student.qr_token ?? "—"}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run("pin")}>
            <RefreshCw className="h-3 w-3 mr-1" /> PIN
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run("qr")}>
            <RefreshCw className="h-3 w-3 mr-1" /> QR
          </Button>
          <Button size="sm" disabled={busy} onClick={() => run("both")}>Gerar ambos</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Impressão: Ficha Cadastral do Aluno (padrão A4 premium) ============
function printStudentReport(p: {
  student: any;
  branding: any;
  belts: any[];
  graduations: any[];
  enrollments: any[];
  invoices: any[];
  certificates: any[];
  attendanceRows: any[];
  competitions: any[];
  currentBelts: any[];
  metrics: {
    daysTraining: number;
    attendanceThisMonth: number;
    paidInvoices: number;
    pendingInvoices: number;
    age: number | null;
    enrollmentDate: string | null;
    lastAttendance: string | null;
  };
}) {
  const {
    student: s, branding, belts, graduations, enrollments, invoices, certificates,
    attendanceRows, competitions, currentBelts, metrics,
  } = p;
  const anamn = s?.anamnesis ?? {};
  const currentEnroll = enrollments.find((e: any) => e.status === "active") ?? enrollments[0];
  const primary = branding?.brand_primary || "#dc2626";
  const now = new Date();
  const printedAt = now.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const academyName = branding?.trade_name || branding?.legal_name || "AMT Dojo Manager";
  const cnpj = (branding as any)?.cnpj || (branding as any)?.tax_id || null;
  const bAddress = [
    (branding as any)?.address_street, (branding as any)?.address_number,
    (branding as any)?.address_neighborhood, (branding as any)?.address_city,
    (branding as any)?.address_state,
  ].filter(Boolean).join(", ");
  const bPhone = (branding as any)?.phone;
  const bEmail = (branding as any)?.email;
  const studentCode = String(s.id ?? "").slice(0, 8).toUpperCase();

  // ---- Status financeiro ----
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = invoices.filter((i: any) =>
    i.status !== "paid" && i.status !== "cancelled" && i.due_date && new Date(i.due_date) < today);
  const pending = invoices.filter((i: any) =>
    i.status !== "paid" && i.status !== "cancelled" && (!i.due_date || new Date(i.due_date) >= today));
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
  const totalOverdue = overdue.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
  const finState: { label: string; tone: "ok" | "warn" | "danger" } =
    overdue.length > 0 ? { label: "Em atraso", tone: "danger" }
    : pending.length > 0 ? { label: "Cobrança pendente", tone: "warn" }
    : { label: "Adimplente", tone: "ok" };

  // ---- Frequência: últimos 6 meses ----
  const monthBuckets: Array<{ key: string; label: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    monthBuckets.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), count: 0 });
  }
  attendanceRows.forEach((a: any) => {
    if (!a.checked_in_at) return;
    const d = new Date(a.checked_in_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = monthBuckets.find((x) => x.key === k);
    if (b) b.count += 1;
  });
  const attMax = Math.max(1, ...monthBuckets.map((b) => b.count));
  const totalCheckins = attendanceRows.length;

  // ---- Competições: estatísticas ----
  const compStats = competitions.reduce(
    (acc: any, r: any) => {
      acc.total += 1;
      if (r.medal === "gold") acc.gold += 1;
      else if (r.medal === "silver") acc.silver += 1;
      else if (r.medal === "bronze") acc.bronze += 1;
      acc.wins += Number(r.wins ?? 0);
      acc.losses += Number(r.losses ?? 0);
      return acc;
    },
    { total: 0, gold: 0, silver: 0, bronze: 0, wins: 0, losses: 0 },
  );

  // ---- Helpers de linha ----
  const rowSafe = (label: string, value: any) => {
    const v = value == null || value === "" ? "—" : String(value);
    return `<div class="fd"><div class="fd-l">${escapeHtml(label)}</div><div class="fd-v">${escapeHtml(v)}</div></div>`;
  };
  const gridBlock = (rows: Array<[string, any]>) =>
    `<div class="grid-2">${rows.map(([k, v]) => rowSafe(k, v)).join("")}</div>`;

  // ---- Header repetido ----
  const logoImg = branding?.logo_url
    ? `<img src="${escapeHtml(branding.logo_url)}" crossorigin="anonymous" alt="${escapeHtml(academyName)}"/>`
    : `<div class="rh-fallback">${escapeHtml(academyName.slice(0,1).toUpperCase())}</div>`;
  const headerHtml = `
    <div class="rh">
      <div class="rh-brand">
        <div class="rh-logo">${logoImg}</div>
        <div>
          <div class="rh-eyebrow">Ficha Cadastral</div>
          <div class="rh-name">${escapeHtml(academyName)}</div>
        </div>
      </div>
      <div class="rh-meta">
        <span class="rh-tag">${escapeHtml(s.full_name)}</span>
        <span>Cód. ${escapeHtml(studentCode)}</span>
      </div>
    </div>`;
  const footerHtml = `
    <div class="rf">
      <span>Documento gerado pelo AMT Dojo Manager</span>
      <span>${escapeHtml(printedAt)}</span>
      <span>Página {{pagina_atual}} de {{total_paginas}}</span>
    </div>`;

  // ---- Cover / hero ----
  const photo = s.photo_url
    ? `<img src="${escapeHtml(s.photo_url)}" crossorigin="anonymous" alt="${escapeHtml(s.full_name)}"/>`
    : `<div class="ph-fallback">${escapeHtml((s.full_name ?? "?").slice(0, 1).toUpperCase())}</div>`;

  const statusTone = s.status === "active" ? "ok" : (s.status === "inactive" ? "muted" : "warn");
  const statusLabel = s.status === "active" ? "Ativo" : (s.status === "inactive" ? "Inativo" : (s.status ?? "—"));

  const heroChips = [
    ["Código", studentCode],
    ["Unidade", s.unit?.name || "—"],
    ["Modalidade", anamn.modality || "—"],
    ["Matrícula", fmtDate(metrics.enrollmentDate)],
    ["Idade", metrics.age != null ? `${metrics.age} anos` : "—"],
  ]
    .map(([k, v]) => `<div class="chip"><span>${escapeHtml(String(k))}</span><strong>${escapeHtml(String(v ?? "—"))}</strong></div>`)
    .join("");

  // ---- Graduações ----
  const gradsRows = graduations.length
    ? graduations
        .map((g: any) =>
          `<tr>
            <td>${escapeHtml(fmtDate(g.graduation_date))}</td>
            <td>${escapeHtml(g.belt?.name ?? "—")}</td>
            <td>${escapeHtml(formatDegree(g.degree, g.belt?.modality, g.belt?.name))}</td>
            <td>${escapeHtml(g.belt?.modality ?? "—")}</td>
            <td>${escapeHtml(g.evaluator ?? "—")}</td>
          </tr>`)
        .join("")
    : `<tr><td colspan="5" class="empty">Sem graduações registradas.</td></tr>`;

  // ---- Competições ----
  const medalMap: Record<string, string> = { gold: "🥇 Ouro", silver: "🥈 Prata", bronze: "🥉 Bronze", participation: "🎗 Participação" };
  const compRows = competitions.length
    ? competitions
        .map((c: any) => `<tr>
            <td>${escapeHtml(fmtDate(c.competition_start_at))}</td>
            <td>${escapeHtml(c.competition_name ?? "—")}</td>
            <td>${escapeHtml(c.category ?? "—")}</td>
            <td>${escapeHtml(c.belt_name ?? "—")}</td>
            <td>${c.medal ? `<span class="pill pill-${c.medal}">${escapeHtml(medalMap[c.medal] ?? c.medal)}</span>` : "—"}</td>
            <td class="num">${escapeHtml(String(c.wins ?? 0))}–${escapeHtml(String(c.losses ?? 0))}</td>
          </tr>`)
        .join("")
    : `<tr><td colspan="6" class="empty">Sem participações registradas.</td></tr>`;

  // ---- Certificados ----
  const certRows = certificates.length
    ? certificates
        .map((c: any) => `<tr>
            <td>${escapeHtml(fmtDate(c.issued_at ?? c.created_at))}</td>
            <td>${escapeHtml(c.title ?? c.template_name ?? "—")}</td>
            <td>${escapeHtml((c as any).certificate_code ?? c.id?.slice(0, 8)?.toUpperCase() ?? "—")}</td>
          </tr>`)
        .join("")
    : `<tr><td colspan="3" class="empty">Sem certificados emitidos.</td></tr>`;

  // ---- Frequência: últimas presenças ----
  const attendanceRecent = attendanceRows.slice(0, 12);
  const attendanceRowsHtml = attendanceRecent.length
    ? attendanceRecent
        .map((a: any) => `<tr>
            <td>${escapeHtml(fmtDate(a.checked_in_at))}</td>
            <td>${escapeHtml(a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—")}</td>
            <td>${escapeHtml(a.class_name ?? a.dojo_class?.name ?? "—")}</td>
          </tr>`)
        .join("")
    : `<tr><td colspan="3" class="empty">Sem presenças recentes.</td></tr>`;

  // ---- Financeiro ----
  const invRows = invoices.length
    ? invoices
        .slice(0, 24)
        .map((i: any) => {
          const isPaid = i.status === "paid";
          const isOver = !isPaid && i.status !== "cancelled" && i.due_date && new Date(i.due_date) < today;
          const cls = isPaid ? "pill-ok" : isOver ? "pill-danger" : "pill-warn";
          const label = isPaid ? "Paga" : isOver ? "Atrasada" : (i.status === "cancelled" ? "Cancelada" : "Pendente");
          return `<tr>
            <td>${escapeHtml(i.description ?? "Mensalidade")}</td>
            <td class="num">${escapeHtml(brl(i.amount))}</td>
            <td>${escapeHtml(fmtDate(i.due_date))}</td>
            <td>${escapeHtml(i.paid_at ? fmtDate(i.paid_at) : "—")}</td>
            <td><span class="pill ${cls}">${label}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" class="empty">Sem cobranças lançadas.</td></tr>`;

  // ---- Anamnese: alerts ----
  const alerts = [
    anamn.heart_issues && "Cardíaco",
    anamn.diabetes && "Diabetes",
    anamn.hypertension && "Hipertensão",
    anamn.asthma && "Asma",
    anamn.pregnant && "Gestante",
    anamn.smoking && "Fumante",
    anamn.alcohol && "Álcool",
  ].filter(Boolean) as string[];

  // ---- Documentos ----
  const docItems: Array<{ label: string; status: "ok" | "off" | "muted"; note?: string }> = [
    { label: "Foto do aluno", status: s.photo_url ? "ok" : "off" },
    { label: "CPF cadastrado", status: s.cpf ? "ok" : "off" },
    { label: "RG cadastrado", status: s.rg ? "ok" : "off" },
    { label: "Atestado médico", status: s.has_medical_clearance ? "ok" : "off",
      note: s.has_medical_clearance && s.medical_clearance_date ? `Validade ${fmtDate(s.medical_clearance_date)}` : undefined },
    { label: "Contrato assinado", status: (s as any).contract_signed_at ? "ok" : "muted",
      note: (s as any).contract_signed_at ? fmtDate((s as any).contract_signed_at) : undefined },
    { label: "Termo de responsabilidade", status: (s as any).liability_waiver_signed ? "ok" : "muted" },
  ];
  const docsHtml = `<div class="doc-list">${docItems.map((d) => `
    <div class="doc-item">
      <span class="doc-dot doc-dot-${d.status}"></span>
      <div class="doc-item-text">
        <strong>${escapeHtml(d.label)}</strong>
        ${d.note ? `<span class="doc-item-note">${escapeHtml(d.note)}</span>` : ""}
      </div>
      <span class="doc-item-status doc-item-status-${d.status}">${d.status === "ok" ? "Entregue" : d.status === "muted" ? "—" : "Pendente"}</span>
    </div>`).join("")}</div>`;

  // ---- Faixas atuais / graduação atual ----
  const beltList = (currentBelts.length ? currentBelts : (s.current_belt_id
    ? [{ belt: belts.find((b: any) => b.id === s.current_belt_id), degree: s.current_degree ?? 0 }]
    : []));
  const currentBeltHtml = beltList.length
    ? `<div class="belt-list">${beltList.map((b: any) => `
        <div class="belt-item">
          <div class="belt-swatch" style="background:${escapeHtml(b.belt?.color ?? "#111827")}"></div>
          <div>
            <div class="belt-name">${escapeHtml(b.belt?.name ?? "—")}</div>
            <div class="belt-sub">${escapeHtml(b.belt?.modality ?? "—")} · ${escapeHtml(formatDegree(b.degree ?? 0, b.belt?.modality, b.belt?.name))}</div>
          </div>
        </div>`).join("")}</div>`
    : `<div class="empty-block">Faixa ainda não registrada.</div>`;

  const attendanceChartHtml = `
    <div class="chart">
      ${monthBuckets.map((b) => `
        <div class="chart-col">
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${Math.max(4, Math.round((b.count / attMax) * 100))}%"></div>
          </div>
          <div class="chart-label">${escapeHtml(b.label)}</div>
          <div class="chart-value">${b.count}</div>
        </div>`).join("")}
    </div>`;

  // ---- Body HTML ----
  const section = (title: string, inner: string) => `
    <section class="ficha-section">
      <div class="ficha-section-head">
        <h2>${escapeHtml(title)}</h2>
        <div class="ficha-section-line"></div>
      </div>
      <div class="ficha-section-body">${inner}</div>
    </section>`;

  const bodyHtml = `
    <style>
      /* ============ FICHA CADASTRAL — estilos escopados ============ */
      main.doc-body { padding: 0 12mm 6mm !important; }
      .doc-title-block { display:none !important; }
      .ficha-cover {
        display:grid; grid-template-columns: 34mm 1fr; gap: 8mm;
        padding: 6mm 0 6mm; border-bottom: 1px solid #e2e8f0;
        break-inside: avoid; page-break-inside: avoid;
      }
      .ficha-photo {
        width: 34mm; height: 44mm; border-radius: 4mm; overflow: hidden;
        background: #f1f5f9; border: 1px solid #e2e8f0; position: relative;
      }
      .ficha-photo img { width:100%; height:100%; object-fit: cover; display:block; }
      .ph-fallback { display:grid; place-items:center; width:100%; height:100%; font-size: 40pt; font-weight: 800; color: ${primary}; background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%); }
      .ficha-head-main h1 { font-size: 20pt; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 2mm; color: #0f172a; line-height: 1.15; }
      .ficha-head-main .ficha-doc-title { font-size: 8pt; text-transform: uppercase; letter-spacing: .22em; color: ${primary}; font-weight: 700; margin-bottom: 2mm; }
      .ficha-head-inst {
        display:grid; grid-template-columns: 1fr; gap: 1mm;
        color: #475569; font-size: 8.5pt; margin-top: 1mm;
      }
      .ficha-head-inst div { display: flex; gap: 6px; align-items: flex-start; }
      .ficha-head-inst strong { color:#0f172a; font-weight: 600; }
      .ficha-chips { display:grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; margin-top: 4mm; }
      .chip { border:1px solid #e2e8f0; border-radius: 3mm; padding: 2mm 3mm; background: #fafbfc; }
      .chip span { display:block; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 600; }
      .chip strong { display:block; font-size: 9pt; font-weight: 700; color: #0f172a; margin-top: 1px; }
      .chip.status-ok strong { color: #15803d; }
      .chip.status-warn strong { color: #a16207; }
      .chip.status-muted strong { color: #64748b; }

      .ficha-section { margin-top: 5mm; break-inside: avoid; page-break-inside: avoid; }
      .ficha-section-head { display:flex; align-items:center; gap: 3mm; margin-bottom: 2.5mm; break-after: avoid; page-break-after: avoid; }
      .ficha-section-head h2 {
        margin: 0; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
        color: ${primary};
        display:flex; align-items:center; gap: 2mm;
      }
      .ficha-section-head h2::before { content:""; width: 6mm; height: 1.2mm; background: ${primary}; border-radius: 1mm; }
      .ficha-section-line { flex: 1; height: 1px; background: #e2e8f0; }
      .ficha-section-body { break-inside: avoid; page-break-inside: avoid; }
      /* seções grandes (tabelas) permitem quebra interna */
      .ficha-section.flow { break-inside: auto; page-break-inside: auto; }

      .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; }
      .fd { display:grid; grid-template-columns: 30mm 1fr; gap: 2mm; padding: 1.5mm 0; border-bottom: 1px dashed #edf2f7; break-inside: avoid; }
      .fd-l { font-size: 8pt; text-transform: uppercase; letter-spacing: .1em; color: #64748b; font-weight: 500; padding-top: 1px; }
      .fd-v { font-size: 9.5pt; color: #0f172a; font-weight: 600; word-break: break-word; }

      /* Tabelas de dados */
      table.tbl { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 3mm; overflow: hidden; font-size: 8.5pt; }
      table.tbl thead th { background: #0f172a; color: #fff; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; font-size: 7pt; padding: 2.4mm 3mm; text-align: left; }
      table.tbl tbody td { padding: 2.2mm 3mm; border-top: 1px solid #eef2f7; color: #0f172a; }
      table.tbl tbody tr:nth-child(odd) td { background: #fafbfc; }
      table.tbl tbody tr:first-child td { border-top: 0; }
      table.tbl td.num { text-align: right; font-variant-numeric: tabular-nums; }
      table.tbl td.empty { text-align: center; color: #94a3b8; padding: 4mm; font-style: italic; }
      table.tbl { break-inside: auto; page-break-inside: auto; }
      table.tbl thead { display: table-header-group; }
      table.tbl tr { break-inside: avoid; page-break-inside: avoid; }

      .pill { display:inline-block; padding: 0.6mm 2mm; border-radius: 999px; font-size: 7.5pt; font-weight: 600; border:1px solid transparent; }
      .pill-ok { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
      .pill-warn { background:#fef3c7; color:#854d0e; border-color:#fde68a; }
      .pill-danger { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
      .pill-gold { background:#fef3c7; color:#854d0e; border-color:#fde68a; }
      .pill-silver { background:#f1f5f9; color:#334155; border-color:#e2e8f0; }
      .pill-bronze { background:#fed7aa; color:#9a3412; border-color:#fdba74; }
      .pill-participation { background:#e0e7ff; color:#3730a3; border-color:#c7d2fe; }

      .fin-status { display:flex; gap: 3mm; padding: 3mm; border-radius: 3mm; margin-bottom: 3mm; align-items:center; }
      .fin-status-ok { background:#f0fdf4; border:1px solid #bbf7d0; }
      .fin-status-warn { background:#fffbeb; border:1px solid #fde68a; }
      .fin-status-danger { background:#fef2f2; border:1px solid #fecaca; }
      .fin-dot { width: 3mm; height: 3mm; border-radius: 999px; flex:0 0 auto; }
      .fin-dot-ok { background:#16a34a; } .fin-dot-warn { background:#d97706; } .fin-dot-danger { background:#dc2626; }
      .fin-status strong { font-size: 10pt; }
      .fin-status .fin-sub { color:#475569; font-size: 8.5pt; margin-top: 0.5mm; display:block; }
      .fin-kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 3mm; }
      .fin-kpi { border:1px solid #e2e8f0; border-radius: 3mm; padding: 2.5mm 3mm; background: #fff; }
      .fin-kpi .l { font-size: 7pt; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 600; }
      .fin-kpi .v { font-size: 12pt; font-weight: 800; color: #0f172a; margin-top: 1mm; letter-spacing: -0.01em; }
      .fin-kpi.accent .v { color: ${primary}; }
      .fin-kpi.ok .v { color: #15803d; }
      .fin-kpi.danger .v { color: #b91c1c; }

      /* Chart de frequência */
      .att-kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin-bottom: 3mm; }
      .att-kpi { border:1px solid #e2e8f0; border-radius: 3mm; padding: 2.5mm 3mm; background: #fafbfc; }
      .att-kpi .l { font-size: 7pt; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 600; }
      .att-kpi .v { font-size: 14pt; font-weight: 800; color: #0f172a; margin-top: 1mm; letter-spacing: -0.02em; }
      .chart { display:grid; grid-template-columns: repeat(6, 1fr); gap: 2mm; height: 32mm; margin-bottom: 3mm; padding: 2mm; border: 1px solid #e2e8f0; border-radius: 3mm; background: #fafbfc; }
      .chart-col { display:flex; flex-direction: column; justify-content: flex-end; align-items: center; }
      .chart-bar-wrap { width: 100%; height: 22mm; display:flex; align-items: flex-end; justify-content: center; }
      .chart-bar { width: 70%; background: linear-gradient(180deg, ${primary} 0%, ${primary}bb 100%); border-radius: 1.5mm 1.5mm 0 0; min-height: 1mm; }
      .chart-label { font-size: 7pt; color: #64748b; text-transform: uppercase; letter-spacing: .1em; margin-top: 1mm; }
      .chart-value { font-size: 8pt; font-weight: 700; color: #0f172a; }

      /* Faixas atuais */
      .belt-list { display:grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; }
      .belt-item { display:flex; align-items:center; gap: 3mm; border: 1px solid #e2e8f0; border-radius: 3mm; padding: 2.5mm 3mm; background: #fff; }
      .belt-swatch { width: 8mm; height: 8mm; border-radius: 2mm; border: 1px solid #e2e8f0; flex: 0 0 auto; box-shadow: inset 0 -2px 4px rgba(0,0,0,.1); }
      .belt-name { font-size: 10pt; font-weight: 700; color: #0f172a; }
      .belt-sub { font-size: 8pt; color: #64748b; }

      /* Documentos */
      .doc-list { display:grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 3mm; }
      .doc-item { display:flex; align-items:center; gap: 3mm; padding: 2mm 3mm; border:1px solid #e2e8f0; border-radius: 2.5mm; background: #fff; }
      .doc-item-text { flex: 1; }
      .doc-item-text strong { display:block; font-size: 9pt; color: #0f172a; font-weight: 600; }
      .doc-item-note { display:block; font-size: 7.5pt; color: #64748b; margin-top: 0.5mm; }
      .doc-dot { width: 2.5mm; height: 2.5mm; border-radius: 999px; flex: 0 0 auto; }
      .doc-dot-ok { background:#16a34a; }
      .doc-dot-off { background:#dc2626; }
      .doc-dot-muted { background:#cbd5e1; }
      .doc-item-status { font-size: 7pt; padding: 0.6mm 2mm; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
      .doc-item-status-ok { background:#dcfce7; color:#166534; }
      .doc-item-status-off { background:#fee2e2; color:#991b1b; }
      .doc-item-status-muted { background:#f1f5f9; color:#64748b; }

      /* Anamnese alerts */
      .alerts { display:flex; flex-wrap: wrap; gap: 1.5mm; margin-top: 2.5mm; }
      .alerts .pill { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }

      /* Observações */
      .notes-box { padding: 3mm 4mm; background: #fafbfc; border: 1px solid #e2e8f0; border-left: 3px solid ${primary}; border-radius: 2mm; font-size: 9pt; color: #0f172a; white-space: pre-wrap; line-height: 1.55; }
      .empty-block { padding: 4mm; text-align: center; color: #94a3b8; font-style: italic; font-size: 9pt; border: 1px dashed #e2e8f0; border-radius: 2mm; }

      /* Header/Footer repetidos */
      .rh { display:flex; align-items:center; justify-content: space-between; gap: 4mm; padding: 2mm 0 3mm; border-bottom: 2px solid ${primary}; }
      .rh-brand { display:flex; align-items:center; gap: 3mm; }
      .rh-logo { width: 12mm; height: 12mm; border-radius: 2mm; overflow: hidden; background:#fff; border:1px solid #e2e8f0; display:grid; place-items:center; }
      .rh-logo img { width: 100%; height: 100%; object-fit: contain; }
      .rh-fallback { font-weight: 800; color: ${primary}; font-size: 14pt; }
      .rh-eyebrow { font-size: 7pt; text-transform: uppercase; letter-spacing: .22em; color: #64748b; font-weight: 700; }
      .rh-name { font-size: 11pt; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
      .rh-meta { display:flex; flex-direction: column; align-items: flex-end; gap: 1mm; font-size: 8pt; color: #64748b; }
      .rh-tag { color: #0f172a; font-weight: 600; }
      .rf { display:flex; justify-content: space-between; gap: 4mm; padding-top: 2mm; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #94a3b8; font-variant-numeric: tabular-nums; }

      /* Print */
      @media print {
        main.doc-body { padding: 0 !important; }
        .ficha-cover { padding-top: 2mm; }
      }
    </style>

    <div class="ficha-cover">
      <div class="ficha-photo">${photo}</div>
      <div class="ficha-head-main">
        <div class="ficha-doc-title">Ficha Cadastral do Aluno</div>
        <h1>${escapeHtml(s.full_name)}</h1>
        <div class="ficha-head-inst">
          <div><strong>${escapeHtml(academyName)}</strong>${cnpj ? ` · <span>CNPJ ${escapeHtml(cnpj)}</span>` : ""}</div>
          ${bAddress ? `<div>${escapeHtml(bAddress)}</div>` : ""}
          ${(bPhone || bEmail) ? `<div>${bPhone ? escapeHtml(String(bPhone)) : ""}${bPhone && bEmail ? " · " : ""}${bEmail ? escapeHtml(String(bEmail)) : ""}</div>` : ""}
          <div>Emitido em <strong>${escapeHtml(printedAt)}</strong></div>
        </div>
        <div class="ficha-chips">
          ${heroChips}
          <div class="chip status-${statusTone}"><span>Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
        </div>
      </div>
    </div>

    ${section("Dados Pessoais", gridBlock([
      ["Nome completo", s.full_name],
      ["CPF", s.cpf],
      ["RG", s.rg],
      ["Data de nascimento", fmtDate(s.birth_date)],
      ["Idade", metrics.age != null ? `${metrics.age} anos` : null],
      ["Sexo", s.gender],
      ["Nacionalidade", s.nationality],
      ["Estado civil", s.marital_status],
      ["Profissão", s.profession],
      ["Tipo sanguíneo", s.blood_type],
    ]))}

    ${section("Contato", gridBlock([
      ["Telefone", s.phone],
      ["Celular", (s as any).mobile_phone],
      ["E-mail", s.email],
      ["Instagram", (s as any).instagram],
    ]))}

    ${section("Endereço Completo", gridBlock([
      ["Logradouro", s.street],
      ["Número", s.address_number],
      ["Complemento", (s as any).address_complement],
      ["Bairro", s.neighborhood],
      ["Cidade", s.city],
      ["Estado (UF)", s.state],
      ["CEP", s.zip],
      ["País", (s as any).country ?? "Brasil"],
    ]))}

    ${section("Responsáveis", gridBlock([
      ["Responsável legal", s.guardian_name],
      ["Telefone do responsável", s.guardian_phone],
      ["CPF do responsável", (s as any).guardian_cpf],
      ["Parentesco", (s as any).guardian_relationship],
      ["Contato de emergência", s.emergency_contact_name],
      ["Telefone de emergência", s.emergency_contact_phone],
      ["Parentesco (emergência)", s.emergency_contact_relationship],
    ]))}

    ${section("Informações da Modalidade", gridBlock([
      ["Modalidade principal", anamn.modality],
      ["Unidade", s.unit?.name],
      ["Plano atual", currentEnroll?.plan?.name],
      ["Valor mensal", currentEnroll ? brl(currentEnroll.custom_amount ?? currentEnroll.plan?.amount ?? 0) : null],
      ["Dia de vencimento", currentEnroll?.due_day],
      ["Data de matrícula", fmtDate(metrics.enrollmentDate)],
      ["Status atual", statusLabel],
      ["Matriculado a (dias)", metrics.daysTraining],
    ]))}

    ${section("Graduação Atual", currentBeltHtml)}

    ${section("Histórico Completo de Graduações",
      `<table class="tbl"><thead><tr>
          <th>Data</th><th>Faixa</th><th>Grau</th><th>Modalidade</th><th>Avaliador</th>
        </tr></thead><tbody>${gradsRows}</tbody></table>`)}

    ${section("Histórico de Competições", `
      <div class="fin-kpis" style="grid-template-columns: repeat(6, 1fr)">
        <div class="fin-kpi"><div class="l">Total</div><div class="v">${compStats.total}</div></div>
        <div class="fin-kpi ok"><div class="l">Vitórias</div><div class="v">${compStats.wins}</div></div>
        <div class="fin-kpi danger"><div class="l">Derrotas</div><div class="v">${compStats.losses}</div></div>
        <div class="fin-kpi"><div class="l">🥇 Ouro</div><div class="v">${compStats.gold}</div></div>
        <div class="fin-kpi"><div class="l">🥈 Prata</div><div class="v">${compStats.silver}</div></div>
        <div class="fin-kpi"><div class="l">🥉 Bronze</div><div class="v">${compStats.bronze}</div></div>
      </div>
      <table class="tbl"><thead><tr>
        <th>Data</th><th>Evento</th><th>Categoria</th><th>Faixa</th><th>Resultado</th><th class="num">V–D</th>
      </tr></thead><tbody>${compRows}</tbody></table>`)}

    ${section("Certificados Emitidos",
      `<table class="tbl"><thead><tr>
          <th>Emitido em</th><th>Título / modelo</th><th>Código</th>
        </tr></thead><tbody>${certRows}</tbody></table>`)}

    ${section("Frequência", `
      <div class="att-kpis">
        <div class="att-kpi"><div class="l">Presenças totais</div><div class="v">${totalCheckins}</div></div>
        <div class="att-kpi"><div class="l">No mês atual</div><div class="v">${metrics.attendanceThisMonth}</div></div>
        <div class="att-kpi"><div class="l">Última presença</div><div class="v" style="font-size:11pt">${escapeHtml(metrics.lastAttendance ? fmtDate(metrics.lastAttendance) : "—")}</div></div>
      </div>
      ${attendanceChartHtml}
      <table class="tbl"><thead><tr>
        <th>Data</th><th>Horário</th><th>Turma</th>
      </tr></thead><tbody>${attendanceRowsHtml}</tbody></table>`)}

    ${section("Financeiro", `
      <div class="fin-status fin-status-${finState.tone}">
        <span class="fin-dot fin-dot-${finState.tone}"></span>
        <div>
          <strong>Situação financeira: ${escapeHtml(finState.label)}</strong>
          <span class="fin-sub">
            ${overdue.length} em atraso · ${pending.length} pendente(s) · ${metrics.paidInvoices} paga(s)
          </span>
        </div>
      </div>
      <div class="fin-kpis">
        <div class="fin-kpi ok"><div class="l">Total pago</div><div class="v">${escapeHtml(brl(totalPaid))}</div></div>
        <div class="fin-kpi accent"><div class="l">Mensalidade</div><div class="v">${escapeHtml(currentEnroll ? brl(currentEnroll.custom_amount ?? currentEnroll.plan?.amount ?? 0) : "—")}</div></div>
        <div class="fin-kpi"><div class="l">Pendente</div><div class="v">${pending.length}</div></div>
        <div class="fin-kpi danger"><div class="l">Em atraso</div><div class="v">${escapeHtml(brl(totalOverdue))}</div></div>
      </div>
      <table class="tbl"><thead><tr>
        <th>Descrição</th><th class="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th>
      </tr></thead><tbody>${invRows}</tbody></table>`)}

    ${section("Anamnese", `
      ${gridBlock([
        ["Peso", anamn.weight ? `${anamn.weight} kg` : null],
        ["Altura", anamn.height ? `${anamn.height} m` : null],
        ["Plano de saúde", s.health_insurance],
        ["Atestado médico", s.has_medical_clearance ? `Válido${s.medical_clearance_date ? ` até ${fmtDate(s.medical_clearance_date)}` : ""}` : "Não apresentado"],
        ["Medicações em uso", anamn.medications],
        ["Alergias", anamn.allergies],
        ["Doenças / condições", anamn.medical_conditions],
        ["Lesões anteriores", anamn.injuries],
        ["Cirurgias", (anamn as any).surgeries],
        ["Objetivos", anamn.objectives],
      ])}
      ${alerts.length ? `<div class="alerts">${alerts.map((a) => `<span class="pill">${escapeHtml(a)}</span>`).join("")}</div>` : ""}`)}

    ${section("Documentos", docsHtml)}

    ${section("Observações", s.notes
      ? `<div class="notes-box">${escapeHtml(s.notes)}</div>`
      : `<div class="empty-block">Nenhuma observação registrada.</div>`)}
  `;

  openBrandedPrintDocument({
    branding,
    title: "Ficha Cadastral do Aluno",
    subtitle: s.full_name,
    documentId: studentCode,
    headerHtml,
    footerHtml,
    bodyHtml,
    marginMm: 14,
  });
}


// ============ Critério de graduação (aluno) ============
function GraduationCriteriaCard({
  student, belts, graduations, attendanceRows, onSaved, saveStudent,
}: {
  student: any; belts: any[]; graduations: any[]; attendanceRows: any[];
  onSaved: () => void; saveStudent: (args: any) => Promise<any>;
}) {
  const lastGrad = graduations[0];
  const currentBelt =
    (lastGrad?.belt as any) ??
    (student?.current_belt_id ? belts.find((b: any) => b.id === student.current_belt_id) : null);

  const sinceDate = lastGrad?.graduation_date
    ? new Date(lastGrad.graduation_date)
    : (student?.created_at ? new Date(student.created_at) : new Date(0));
  const attendanceSince = attendanceRows.filter(
    (a: any) => a?.checked_in_at && new Date(a.checked_in_at) >= sinceDate,
  ).length;
  const monthsSince = Math.floor(
    (Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
  );

  const hasOverride = Boolean(
    student?.graduation_criteria_mode ||
    student?.graduation_min_classes != null ||
    student?.graduation_min_months != null,
  );

  const [useOverride, setUseOverride] = useState<boolean>(hasOverride);
  const [mode, setMode] = useState<string>(
    student?.graduation_criteria_mode ?? currentBelt?.criteria_mode ?? "time",
  );
  const [minClasses, setMinClasses] = useState<string>(
    student?.graduation_min_classes != null
      ? String(student.graduation_min_classes)
      : (currentBelt?.min_classes != null ? String(currentBelt.min_classes) : ""),
  );
  const [minMonths, setMinMonths] = useState<string>(
    student?.graduation_min_months != null
      ? String(student.graduation_min_months)
      : (currentBelt?.min_months != null ? String(currentBelt.min_months) : ""),
  );
  const [saving, setSaving] = useState(false);

  const effectiveMode = useOverride ? mode : (currentBelt?.criteria_mode ?? "time");
  const effectiveMinClasses = useOverride
    ? (minClasses.trim() === "" ? null : Number(minClasses))
    : (currentBelt?.min_classes ?? null);
  const effectiveMinMonths = useOverride
    ? (minMonths.trim() === "" ? null : Number(minMonths))
    : (currentBelt?.min_months ?? null);

  const save = async () => {
    setSaving(true);
    try {
      await saveStudent({ data: {
        id: student.id,
        full_name: student.full_name,
        graduation_criteria_mode: useOverride ? (mode as any) : null,
        graduation_min_classes: useOverride
          ? (minClasses.trim() === "" ? null : Number(minClasses))
          : null,
        graduation_min_months: useOverride
          ? (minMonths.trim() === "" ? null : Number(minMonths))
          : null,
      }});
      toast.success("Critério do aluno atualizado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar critério");
    } finally {
      setSaving(false);
    }
  };

  const classesPct = effectiveMinClasses && effectiveMinClasses > 0
    ? Math.min(100, Math.round((attendanceSince / effectiveMinClasses) * 100)) : 0;
  const monthsPct = effectiveMinMonths && effectiveMinMonths > 0
    ? Math.min(100, Math.round((monthsSince / effectiveMinMonths) * 100)) : 0;

  return (
    <SectionCard title="Critério para próxima graduação" icon={TrendingUp}>
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Faixa atual: <strong>{currentBelt?.name ?? "—"}</strong>
          {" · "}Desde {sinceDate.getTime() > 0 ? sinceDate.toLocaleDateString("pt-BR") : "—"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(effectiveMode === "classes" || effectiveMode === "time") && effectiveMinClasses != null && (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Aulas realizadas</span>
                <span className="font-mono">{attendanceSince}/{effectiveMinClasses}</span>
              </div>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${classesPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {attendanceSince >= effectiveMinClasses ? "Meta atingida" : `${effectiveMinClasses - attendanceSince} restantes`}
              </div>
            </div>
          )}
          {(effectiveMode === "time" || effectiveMode === "classes") && effectiveMinMonths != null && (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tempo de permanência</span>
                <span className="font-mono">{monthsSince}/{effectiveMinMonths} meses</span>
              </div>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${monthsPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {monthsSince >= effectiveMinMonths ? "Carência cumprida" : `${effectiveMinMonths - monthsSince} meses restantes`}
              </div>
            </div>
          )}
          {effectiveMode === "evaluation" && (
            <div className="rounded-md border p-3 text-xs sm:col-span-2">
              Critério: <strong>mediante avaliação</strong>. A promoção depende do resultado de uma avaliação registrada pelo instrutor.
            </div>
          )}
          {effectiveMode === "merit" && (
            <div className="rounded-md border p-3 text-xs sm:col-span-2">
              Critério: <strong>por mérito</strong>. A promoção é decidida pelo instrutor, sem meta objetiva.
            </div>
          )}
        </div>

        <div className="rounded-md border border-dashed p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
            <span>Sobrescrever critério para este aluno (caso a caso)</span>
          </label>
          {!useOverride && (
            <p className="text-[11px] text-muted-foreground">
              Sem sobrescrita, vale o critério universal da faixa atual
              ({currentBelt?.criteria_mode === "classes" ? "por aulas" :
                currentBelt?.criteria_mode === "evaluation" ? "por avaliação" :
                currentBelt?.criteria_mode === "merit" ? "por mérito" : "por tempo"}).
            </p>
          )}
          {useOverride && (
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-2 text-sm sm:col-span-3"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="time">Tempo mínimo</option>
                <option value="classes">Mínimo de aulas</option>
                <option value="evaluation">Mediante avaliação</option>
                <option value="merit">Por mérito</option>
              </select>
              <Input
                type="number" min={0} placeholder="Meses mínimos"
                value={minMonths} onChange={(e) => setMinMonths(e.target.value)}
                disabled={mode === "evaluation" || mode === "merit"}
              />
              <Input
                type="number" min={0} placeholder="Aulas mínimas"
                value={minClasses} onChange={(e) => setMinClasses(e.target.value)}
                disabled={mode === "evaluation" || mode === "merit"}
              />
              <div className="flex justify-end sm:col-span-1">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar critério"}
                </Button>
              </div>
            </div>
          )}
          {!useOverride && (
            <Button size="sm" variant="outline" onClick={save} disabled={saving}>
              {hasOverride ? "Remover sobrescrita" : "Salvar"}
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
