import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getDojoStudent, listDojoBelts, listDojoPlans, listDojoUnits,
  addDojoGraduation, deleteDojoGraduation,
  saveDojoEnrollment, deleteDojoEnrollment,
  saveDojoInvoice, markDojoInvoicePaid, deleteDojoInvoice,
  deleteDojoStudent, saveDojoStudent,
} from "@/lib/dojo/dojo.functions";
import { listAttendance, regenerateStudentCodes } from "@/lib/dojo/attendance.functions";
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
  QrCode, RefreshCw, TrendingUp, ExternalLink, Sparkles, AlertTriangle,
} from "lucide-react";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";
import { openBrandedPrintDocument, escapeHtml, kvTable } from "@/lib/dojo/print-document";
import { useDojoBranding } from "@/hooks/useDojoBranding";

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

  const getFn = useServerFn(getDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const plansFn = useServerFn(listDojoPlans);
  const unitsFn = useServerFn(listDojoUnits);
  const attendanceFn = useServerFn(listAttendance);

  const delStudent = useServerFn(deleteDojoStudent);
  const addGrad = useServerFn(addDojoGraduation);
  const delGrad = useServerFn(deleteDojoGraduation);
  const saveEnroll = useServerFn(saveDojoEnrollment);
  const delEnroll = useServerFn(deleteDojoEnrollment);
  const saveInv = useServerFn(saveDojoInvoice);
  const payInv = useServerFn(markDojoInvoicePaid);
  const delInv = useServerFn(deleteDojoInvoice);
  const saveStudent = useServerFn(saveDojoStudent);

  const q = useQuery({ queryKey: ["dojo-student", id], queryFn: () => getFn({ data: { id } }) });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => plansFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const { data: branding } = useDojoBranding();
  const attendance = useQuery({
    queryKey: ["dojo-attendance", id],
    queryFn: () => attendanceFn({ data: { studentId: id, limit: 200 } }),
  });

  const [grad, setGrad] = useState({ belt_id: "", degree: 0, graduation_date: new Date().toISOString().slice(0, 10), evaluator: "", notes: "" });
  const [enroll, setEnroll] = useState({ plan_id: "", custom_amount: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10), status: "active" as const });
  const [inv, setInv] = useState({ description: "", amount: "", due_date: new Date().toISOString().slice(0, 10) });
  const [previewCert, setPreviewCert] = useState<any | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [activeTab, setActiveTab] = useState("pessoal");

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-student", id] });

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

  if (q.isLoading || !q.data || !s) return <LoadingState />;


  const onDeleteStudent = async () => {
    if (!confirm(`Excluir ${s.full_name}? Esta ação apaga histórico de graduações, mensalidades e certificados.`)) return;
    try {
      await delStudent({ data: { id } });
      toast.success("Aluno excluído");
      navigate({ to: "/dojo/app/students" });
    } catch (e: any) { toast.error("Erro ao excluir", { description: e.message }); }
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
    <div className="space-y-4">
      {/* Barra topo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/dojo/app/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Alunos
        </Link>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => {
            try { sessionStorage.setItem("dojo-edit-student", id); } catch {}
            navigate({ to: "/dojo/app/students" });
          }}>
            <Pencil className="h-4 w-4 mr-1.5" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={() => printStudentReport({
            student: s, branding, belts: belts.data ?? [], graduations, enrollments, invoices, certificates, attendanceRows,
            metrics: { daysTraining, attendanceThisMonth, paidInvoices, pendingInvoices, age, enrollmentDate, lastAttendance },
          })}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir
          </Button>
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4 mr-1.5" /> WhatsApp</Button>
            </a>
          )}
          {emailLink && (
            <a href={emailLink}>
              <Button size="sm" variant="outline"><MailIcon className="h-4 w-4 mr-1.5" /> E-mail</Button>
            </a>
          )}
          <Button size="sm" variant="destructive" onClick={onDeleteStudent}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
          </Button>
        </div>
      </div>

      {/* Layout: sidebar / conteúdo (timeline vai como card horizontal abaixo) */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">

        {/* ============ SIDEBAR ============ */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card className="dojo-card overflow-hidden">
            <div className="relative h-24 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
            <div className="-mt-12 flex flex-col items-center px-4 pb-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm">
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-semibold text-muted-foreground">
                    {s.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="mt-3 w-full text-center">
                <div className="truncate font-semibold text-base">{s.full_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {age != null ? `${age} anos` : "Idade não informada"}
                </div>
              </div>
              <StatusBadge status={s.status} className="mt-3" />
            </div>

            <Separator />

            {/* Faixa atual */}
            <div className="p-4 space-y-3 text-sm">
              {s.current_belt_id ? (
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Faixa atual</div>
                  {(() => {
                    const belt = (belts.data ?? []).find((b: any) => b.id === s.current_belt_id);
                    return belt ? (
                      <div className="flex flex-col items-center gap-2">
                        <BeltVisual name={belt.name} colorHex={belt.color_hex} stripeHex={belt.stripe_hex} degree={s.current_degree ?? 0} maxDegrees={belt.max_degrees ?? 4} />
                        <div className="min-w-0 text-center">
                          <div className="font-medium">{belt.name}</div>
                          <div className="text-xs text-muted-foreground">{s.current_degree ? `${s.current_degree}º grau` : "Sem grau"}</div>
                        </div>
                      </div>

                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Faixa ainda não registrada.</div>
              )}

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
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={Activity} label="Dias treinando" value={daysTraining || "—"} />
            <Kpi icon={CalendarCheck} label="Presença no mês" value={attendanceThisMonth} />
            <Kpi icon={Wallet} label="Pagas" value={paidInvoices} tint={paidInvoices > 0 ? "success" : undefined} />
            <Kpi icon={Wallet} label="Pendentes" value={pendingInvoices} tint={pendingInvoices > 0 ? "warning" : undefined} />
            <Kpi icon={GraduationCap} label="Graduações" value={graduations.length} />
            <Kpi icon={Award} label="Certificados" value={certificates.length} />
          </div>


          {/* Tabs */}
          <Tabs defaultValue="pessoal" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="flex w-max min-w-full flex-nowrap gap-0.5 rounded-lg border border-border bg-card p-1">
                <TabsTrigger value="pessoal">Dados</TabsTrigger>
                <TabsTrigger value="academia">Academia</TabsTrigger>
                <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
                <TabsTrigger value="lgpd">LGPD</TabsTrigger>
                <TabsTrigger value="graduacoes">Graduações</TabsTrigger>
                <TabsTrigger value="certificados">Certificados</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="competicoes">Competições</TabsTrigger>
                <TabsTrigger value="frequencia">Frequência</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="observacoes">Observações</TabsTrigger>
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

              <SectionCard title="Matrículas / Planos" icon={Wallet}>
                <div className="grid md:grid-cols-5 gap-2">
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={enroll.plan_id} onChange={(e) => setEnroll({ ...enroll, plan_id: e.target.value })}>
                    <option value="">Plano</option>
                    {(plans.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} · {brl(p.amount)}</option>)}
                  </select>
                  <Input type="number" step="0.01" placeholder="Valor custom" value={enroll.custom_amount} onChange={(e) => setEnroll({ ...enroll, custom_amount: e.target.value })} />
                  <Input type="number" min={1} max={28} placeholder="Dia venc." value={enroll.due_day} onChange={(e) => setEnroll({ ...enroll, due_day: Number(e.target.value) })} />
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
              </SectionCard>
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
                  <ConsentRow label="Consentimento para uso de imagem" granted={!!s.image_rights_consent} />
                  <ConsentRow label="Aceite dos termos" granted={!!s.terms_accepted} date={s.terms_accepted_date} />
                  <ConsentRow label="Consentimento para marketing" granted={!!s.marketing_consent} />
                </div>
                <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  <FileText className="mx-auto mb-1 h-5 w-5" />
                  Anexo de termo assinado (PDF) — em breve integrado ao módulo Documentos.
                </div>
              </SectionCard>
            </TabsContent>

            {/* --- Graduações --- */}
            <TabsContent value="graduacoes" className="mt-4 space-y-4">
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
                          <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>
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
                  <ol className="relative space-y-4 border-l-2 border-border pl-4">
                    {graduations.map((g: any) => (
                      <li key={g.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-card" />
                        <div className="flex flex-wrap items-center gap-3">
                          {g.belt?.color_hex && (
                            <BeltVisual name={g.belt.name} colorHex={g.belt.color_hex} stripeHex={g.belt.stripe_hex} degree={g.degree} maxDegrees={g.belt?.max_degrees ?? 4} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {g.belt?.name} <span className="text-muted-foreground font-normal">· {g.degree === 0 ? "Sem grau" : `${g.degree}º grau`}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fmtDate(g.graduation_date)} · {g.evaluator ?? "Avaliador não informado"}
                              {g.notes ? ` · ${g.notes}` : ""}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={async () => { await delGrad({ data: { id: g.id } }); refresh(); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
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
                          const hasTemplate = !!c.template?.background_url;
                          const beltLabel = c.graduation?.belt?.name
                            ? `${c.graduation.belt.name}${c.graduation.degree ? ` · ${c.graduation.degree}º grau` : ""}`
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

            {/* --- Financeiro --- */}
            <TabsContent value="financeiro" className="mt-4 space-y-4">
              <SectionCard title="Nova cobrança" icon={Wallet}>
                <div className="grid gap-2 md:grid-cols-5">
                  <Input placeholder="Descrição" value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="Valor" value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} />
                  <Input type="date" value={inv.due_date} onChange={(e) => setInv({ ...inv, due_date: e.target.value })} />
                  <Button onClick={doAddInv} className="md:col-span-2">Criar cobrança</Button>
                </div>
              </SectionCard>

              <SectionCard title="Histórico financeiro" icon={ClipboardList}>
                {invoices.length === 0 ? (
                  <EmptyState label="Sem cobranças registradas." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="p-2 text-left">Descrição</th>
                          <th className="p-2 text-right">Valor</th>
                          <th className="p-2 text-left">Vencimento</th>
                          <th className="p-2 text-left">Pagamento</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((i: any) => {
                          const isOverdue = i.status === "pending" && i.due_date && new Date(i.due_date) < new Date(new Date().toDateString());
                          const effective = i.status === "paid" ? "paid" : isOverdue ? "overdue" : i.status;
                          return (
                            <tr key={i.id} className="border-b border-border last:border-0">
                              <td className="p-2 font-medium truncate max-w-[240px]">{i.description}</td>
                              <td className="p-2 text-right">{brl(i.amount)}</td>
                              <td className="p-2 text-muted-foreground">{fmtDate(i.due_date)}</td>
                              <td className="p-2 text-muted-foreground">{i.paid_at ? fmtDate(i.paid_at) : "—"}</td>
                              <td className="p-2"><InvoiceStatus status={effective} /></td>
                              <td className="p-2 text-right">
                                <div className="inline-flex gap-1">
                                  {i.status !== "paid" && (
                                    <Button size="sm" variant="outline" onClick={async () => { await payInv({ data: { id: i.id, method: "cash" } }); refresh(); }}>
                                      Marcar pago
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" onClick={async () => { await delInv({ data: { id: i.id } }); refresh(); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* --- Competições --- */}
            <TabsContent value="competicoes" className="mt-4 space-y-4">
              <SectionCard title="Competições" icon={Trophy}>
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <Trophy className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Consulta ao vivo das competições e inscrições feitas diretamente nos sites dos organizadores.
                  </div>
                  <Link to="/dojo/app/competitions" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Ver todas as competições <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Disputadas</div>
                    <div className="mt-1 text-lg font-semibold">0</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Medalhas</div>
                    <div className="mt-1 text-lg font-semibold">0</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ranking</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Estrutura preparada para receber resultados e medalhas conforme forem sincronizados dos organizadores.
                </p>
              </SectionCard>
            </TabsContent>

            {/* --- Frequência --- */}
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
  const tintCls =
    tint === "success"
      ? "text-emerald-600"
      : tint === "warning"
        ? "text-amber-600"
        : "text-foreground";
  const iconWrap =
    tint === "success"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
      : tint === "warning"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : "bg-muted text-muted-foreground ring-border";
  return (
    <div className="dojo-card group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${iconWrap}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className={`text-2xl font-bold leading-none tracking-tight ${tintCls}`}>
          {value ?? "—"}
        </div>
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
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
    <Card className="dojo-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
      title: `Graduação · ${g.belt?.name ?? "faixa"}${g.degree ? ` (${g.degree}º grau)` : ""}`,
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

// ============ Impressão: Ficha do Aluno ============
function printStudentReport(p: {
  student: any;
  branding: any;
  belts: any[];
  graduations: any[];
  enrollments: any[];
  invoices: any[];
  certificates: any[];
  attendanceRows: any[];
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
  const { student: s, branding, belts, graduations, enrollments, invoices, certificates, attendanceRows, metrics } = p;
  const anamn = s?.anamnesis ?? {};
  const belt = belts.find((b) => b.id === s.current_belt_id);
  const currentEnroll = enrollments.find((e) => e.status === "active") ?? enrollments[0];

  const kpiHtml = [
    ["Dias treinando", metrics.daysTraining || "—"],
    ["Presença no mês", metrics.attendanceThisMonth],
    ["Mensalidades pagas", metrics.paidInvoices],
    ["Pendentes", metrics.pendingInvoices],
    ["Graduações", graduations.length],
    ["Certificados", certificates.length],
    ["Última presença", metrics.lastAttendance ? fmtDate(metrics.lastAttendance) : "—"],
    ["Faixa atual", belt ? `${belt.name}${s.current_degree ? ` · ${s.current_degree}º grau` : ""}` : "—"],
  ]
    .map(([l, v]) => `<div class="kpi"><div class="label">${escapeHtml(String(l))}</div><div class="value">${escapeHtml(String(v))}</div></div>`)
    .join("");

  const gradsRows = graduations.length
    ? graduations
        .map(
          (g: any) =>
            `<tr><td>${escapeHtml(fmtDate(g.graduation_date))}</td><td>${escapeHtml(g.belt?.name ?? "—")}</td><td>${escapeHtml(g.degree ? `${g.degree}º grau` : "Sem grau")}</td><td>${escapeHtml(g.evaluator ?? "—")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8">Sem graduações registradas</td></tr>`;

  const invRows = invoices.length
    ? invoices
        .slice(0, 20)
        .map(
          (i: any) =>
            `<tr><td>${escapeHtml(i.description ?? "—")}</td><td class="num">${escapeHtml(brl(i.amount))}</td><td>${escapeHtml(fmtDate(i.due_date))}</td><td>${escapeHtml(i.paid_at ? fmtDate(i.paid_at) : "—")}</td><td><span class="badge ${i.status === "paid" ? "success" : "warn"}">${escapeHtml(i.status)}</span></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8">Sem cobranças</td></tr>`;

  const alerts = [
    anamn.heart_issues && "Cardíaco",
    anamn.diabetes && "Diabetes",
    anamn.hypertension && "Hipertensão",
    anamn.asthma && "Asma",
    anamn.pregnant && "Gestante",
    anamn.smoking && "Fumante",
    anamn.alcohol && "Álcool",
  ].filter(Boolean) as string[];

  openBrandedPrintDocument({
    branding,
    title: "Ficha do Aluno",
    subtitle: s.full_name,
    documentId: s.id?.slice(0, 8).toUpperCase(),
    sections: [
      { title: "Resumo", html: `<div class="kpi-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${kpiHtml}</div>` },
      {
        title: "Identificação",
        html: kvTable([
          ["Nome completo", s.full_name],
          ["CPF", s.cpf],
          ["RG", s.rg],
          ["Nascimento", fmtDate(s.birth_date)],
          ["Idade", metrics.age != null ? `${metrics.age} anos` : "—"],
          ["Sexo", s.gender],
          ["Nacionalidade", s.nationality],
          ["Estado civil", s.marital_status],
          ["Profissão", s.profession],
        ]),
      },
      {
        title: "Contato",
        html: kvTable([
          ["Telefone", s.phone],
          ["E-mail", s.email],
          ["Endereço", [s.street, s.address_number, s.neighborhood].filter(Boolean).join(", ")],
          ["Cidade / UF", [s.city, s.state].filter(Boolean).join(" / ")],
          ["CEP", s.zip],
        ]),
      },
      {
        title: "Responsável e emergência",
        html: kvTable([
          ["Responsável", s.guardian_name],
          ["Tel. responsável", s.guardian_phone],
          ["Contato emergência", s.emergency_contact_name],
          ["Tel. emergência", s.emergency_contact_phone],
          ["Parentesco", s.emergency_contact_relationship],
        ]),
      },
      {
        title: "Academia e plano",
        html: kvTable([
          ["Matrícula", fmtDate(metrics.enrollmentDate)],
          ["Unidade", s.unit?.name],
          ["Plano atual", currentEnroll?.plan?.name],
          ["Valor mensal", currentEnroll ? brl(currentEnroll.custom_amount ?? currentEnroll.plan?.amount ?? 0) : "—"],
          ["Dia venc.", currentEnroll?.due_day],
          ["Status", s.status],
          ["Modalidade", anamn.modality],
        ]),
      },
      {
        title: "Anamnese",
        html: `${kvTable([
          ["Tipo sanguíneo", s.blood_type],
          ["Peso", anamn.weight ? `${anamn.weight} kg` : null],
          ["Altura", anamn.height ? `${anamn.height} m` : null],
          ["Plano de saúde", s.health_insurance],
          ["Atestado médico", s.has_medical_clearance ? `Sim (${fmtDate(s.medical_clearance_date)})` : "Não"],
          ["Medicações", anamn.medications],
          ["Alergias", anamn.allergies],
          ["Doenças", anamn.medical_conditions],
          ["Lesões anteriores", anamn.injuries],
          ["Objetivos", anamn.objectives],
        ])}${alerts.length ? `<div style="margin-top:8px" class="badges">${alerts.map((a) => `<span class="badge danger">${escapeHtml(a)}</span>`).join("")}</div>` : ""}`,
      },
      {
        title: "Graduações",
        html: `<table class="data"><thead><tr><th>Data</th><th>Faixa</th><th>Grau</th><th>Avaliador</th></tr></thead><tbody>${gradsRows}</tbody></table>`,
      },
      {
        title: "Histórico financeiro (últimos 20)",
        html: `<table class="data"><thead><tr><th>Descrição</th><th class="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th></tr></thead><tbody>${invRows}</tbody></table>`,
      },
      ...(s.notes
        ? [{ title: "Observações internas", html: `<div style="white-space:pre-wrap;font-size:11.5px">${escapeHtml(s.notes)}</div>` }]
        : []),
    ],
    footerLeft: `Ficha de ${s.full_name}`,
    footerRight: "Documento gerado pelo AMT Dojo Manager",
  });
  // uso para evitar warning quando attendanceRows não é referenciado
  void attendanceRows;
}
