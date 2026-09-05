import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { listTeamSchedule, generateOccurrences } from "@/lib/dojo/team-schedule.functions";
import { CalendarClock, RefreshCw } from "lucide-react";
import {
  getTeamMember,
  upsertTeamMember,
  upsertPayrollConfig,
  listPayments,
  upsertPayment,
  markPaymentPaid,
  computeMemberEarnings,
  listTeamDocuments,
  addTeamDocument,
  archiveTeamDocument,
  listTeamHistory,
  deleteTeamMember,
} from "@/lib/dojo/team.functions";
import { listDojoBelts } from "@/lib/dojo/dojo.functions";
import { PermissionsTab } from "@/components/dojo/team/PermissionsTab";
import { TeamContracts } from "@/components/dojo/TeamContracts";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BeltAuto } from "@/components/dojo/BeltSpecVisual";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, FileText, History, Upload, Mail, Phone, MapPin, Briefcase, Award } from "lucide-react";
import { todayISO } from "@/lib/dates";

export const Route = createFileRoute("/dojo/app/team/$id")({
  head: () => ({ meta: [{ title: "Colaborador — Equipe" }] }),
  component: TeamMemberDetail,
});

const ROLE_OPTIONS = [
  ["teacher", "Professor"],
  ["instructor", "Instrutor"],
  ["assistant", "Auxiliar"],
  ["receptionist", "Recepção"],
  ["finance", "Financeiro"],
  ["admin", "Administrador"],
  ["manager", "Gerente"],
  ["other", "Outro"],
] as const;

const PAYMENT_TYPES = [
  ["fixed", "Salário fixo"],
  ["hourly", "Hora/aula"],
  ["per_class", "Por aula"],
  ["percentage", "Percentual"],
  ["commission", "Comissão"],
  ["contractor", "Prestador de serviço"],
  ["mei", "MEI"],
  ["autonomous", "Autônomo"],
  ["other", "Outro"],
] as const;

const PAYMENT_KINDS = [
  ["salary", "Salário"],
  ["advance", "Adiantamento"],
  ["discount", "Desconto"],
  ["bonus", "Bônus"],
  ["commission", "Comissão"],
  ["overtime", "Hora extra"],
  ["reimbursement", "Reembolso"],
  ["other", "Outro"],
] as const;

function TeamMemberDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getTeamMember);
  const saveFn = useServerFn(upsertTeamMember);
  const savePayrollFn = useServerFn(upsertPayrollConfig);
  const listPayFn = useServerFn(listPayments);
  const savePayFn = useServerFn(upsertPayment);
  const markPaidFn = useServerFn(markPaymentPaid);
  const computeFn = useServerFn(computeMemberEarnings);
  const listDocsFn = useServerFn(listTeamDocuments);
  const addDocFn = useServerFn(addTeamDocument);
  const archiveDocFn = useServerFn(archiveTeamDocument);
  const historyFn = useServerFn(listTeamHistory);
  const delFn = useServerFn(deleteTeamMember);

  const q = useQuery({ queryKey: ["team-member", id], queryFn: () => getFn({ data: { id } }) });
  const payments = useQuery({ queryKey: ["team-member-payments", id], queryFn: () => listPayFn({ data: { member_id: id } }) });
  const docs = useQuery({ queryKey: ["team-member-docs", id], queryFn: () => listDocsFn({ data: { member_id: id } }) });
  const history = useQuery({ queryKey: ["team-member-history", id], queryFn: () => historyFn({ data: { member_id: id } }) });
  const beltsFn = useServerFn(listDojoBelts);
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });

  const [profile, setProfile] = useState<any>({});
  const [payroll, setPayroll] = useState<any>({});

  useEffect(() => {
    if (q.data?.member) setProfile(q.data.member);
    if (q.data?.payroll) setPayroll(q.data.payroll);
  }, [q.data]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`team-member-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_team_members", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["team-member", id] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_team_payroll_config", filter: `member_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["team-member", id] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dojo_team_history", filter: `member_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["team-member-history", id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  const firstOfMonth = new Date().toISOString().slice(0, 8) + "01";
  const today = todayISO();
  const [newPay, setNewPay] = useState<any>({
    kind: "salary", amount: 0, status: "pending", description: "",
    from: firstOfMonth, to: today, hours_worked: null, classes_count: null,
    due_date: "", paid_at: "", payment_method: "",
  });
  const [calc, setCalc] = useState<any>(null);

  const saveProfile = async () => {
    try {
      await saveFn({ data: { ...profile, id, modalities: profile.modalities ?? [] } });
      toast.success("Perfil salvo");
      qc.invalidateQueries({ queryKey: ["team-member", id] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const savePayrollForm = async () => {
    try {
      await savePayrollFn({ data: { ...payroll, member_id: id, payment_type: payroll.payment_type ?? "fixed" } });
      toast.success("Configuração financeira salva");
      qc.invalidateQueries({ queryKey: ["team-member", id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const recalc = async () => {
    try {
      const r: any = await computeFn({ data: { member_id: id, from: newPay.from, to: newPay.to } });
      setCalc(r);
      setNewPay((s: any) => ({
        ...s,
        amount: r.suggested_amount,
        hours_worked: r.hours,
        classes_count: r.classes,
        description: s.description ||
          `Referente a ${new Date(newPay.from).toLocaleDateString("pt-BR")}–${new Date(newPay.to).toLocaleDateString("pt-BR")}`,
      }));
      toast.success(`Calculado: ${r.classes} aula(s) · ${r.hours}h`);
    } catch (e: any) { toast.error(e.message); }
  };

  const addPayment = async () => {
    if (!newPay.amount || newPay.amount <= 0) { toast.error("Informe o valor"); return; }
    try {
      await savePayFn({
        data: {
          member_id: id,
          kind: newPay.kind,
          amount: Number(newPay.amount),
          description: newPay.description || undefined,
          status: newPay.status,
          reference_month: newPay.from ? newPay.from.slice(0, 8) + "01" : new Date().toISOString().slice(0, 7) + "-01",
          hours_worked: newPay.hours_worked ?? null,
          classes_count: newPay.classes_count ?? null,
          due_date: newPay.due_date || null,
          paid_at: newPay.status === "paid" ? (newPay.paid_at || new Date().toISOString()) : null,
          payment_method: newPay.payment_method || null,
        },
      });
      toast.success(newPay.status === "paid"
        ? "Pagamento registrado e lançado em Financeiro"
        : "Lançamento registrado");
      setNewPay({
        kind: "salary", amount: 0, status: "pending", description: "",
        from: firstOfMonth, to: today, hours_worked: null, classes_count: null,
        due_date: "", paid_at: "", payment_method: "",
      });
      setCalc(null);
      qc.invalidateQueries({ queryKey: ["team-member-payments", id] });
      qc.invalidateQueries({ queryKey: ["dojo-expenses"] });
      qc.invalidateQueries({ queryKey: ["dojo-finance"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm("Arquivar este colaborador (desligamento)? O histórico permanece.")) return;
    await delFn({ data: { id } });
    toast.success("Colaborador desligado");
    nav({ to: "/dojo/app/team" });
  };

  const m = q.data?.member;
  if (q.isLoading) return <DojoPageShell title="Colaborador"><div className="p-8">Carregando...</div></DojoPageShell>;
  if (!m) return <DojoPageShell title="Colaborador"><div className="p-8">Não encontrado.</div></DojoPageShell>;

  const roleLabel = ROLE_OPTIONS.find(r => r[0] === m.role)?.[1] ?? "Colaborador";
  const currentBelt = (belts.data ?? []).find((b: any) => b.id === m.belt_id);
  const initials = (m.full_name ?? "?").split(" ").filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join("");

  return (
    <DojoPageShell>
      {/* HERO PREMIUM — Ruby Noir */}
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
            to="/dojo/app/team"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Equipe
          </Link>

          <div className="flex flex-col gap-5">
            <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="relative shrink-0">
                <div aria-hidden className="absolute -inset-1 rounded-full bg-gradient-to-br from-red-500/60 to-red-700/10 blur-md" />
                <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-neutral-800 shadow-[0_10px_30px_-8px_rgba(220,38,38,0.55)] sm:h-24 sm:w-24">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-neutral-300">{initials || "?"}</span>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
                  <Briefcase className="h-3 w-3" />
                  {roleLabel}
                </div>
                <h1 className="font-display break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
                  {m.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-300">
                  {currentBelt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <Award className="h-3 w-3 text-red-300" />
                      {currentBelt.modality ? `${currentBelt.modality} · ` : ""}{currentBelt.name}
                      {m.belt_grade ? ` · ${m.belt_grade}º` : ""}
                    </span>
                  )}
                  {m.email && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <Mail className="h-3 w-3 text-red-300" /> {m.email}
                    </span>
                  )}
                  {m.phone && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <Phone className="h-3 w-3 text-red-300" /> {m.phone}
                    </span>
                  )}
                  {m.city && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <MapPin className="h-3 w-3 text-red-300" /> {m.city}{m.state ? `/${m.state}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/dojo/app/team"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar</Link>
              </Button>
              {m.whatsapp && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={`https://wa.me/${m.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <Phone className="mr-1.5 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={doDelete}
                className="w-full border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white"
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Desligar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="personal" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full flex-nowrap gap-0.5 rounded-lg border bg-card p-1">
            <TabsTrigger value="personal">Pessoais</TabsTrigger>
            <TabsTrigger value="professional">Profissionais</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
        </div>


        {/* PERSONAL */}
        <TabsContent value="personal" className="mt-4">
          <Card><CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <Field label="Nome completo"><Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></Field>
            <Field label="CPF"><Input value={profile.cpf ?? ""} onChange={(e) => setProfile({ ...profile, cpf: e.target.value })} /></Field>
            <Field label="RG"><Input value={profile.rg ?? ""} onChange={(e) => setProfile({ ...profile, rg: e.target.value })} /></Field>
            <Field label="Data de nascimento"><Input type="date" value={profile.birth_date ?? ""} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} /></Field>
            <Field label="Sexo"><Input value={profile.gender ?? ""} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} /></Field>
            <Field label="Estado civil"><Input value={profile.marital_status ?? ""} onChange={(e) => setProfile({ ...profile, marital_status: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={profile.whatsapp ?? ""} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} /></Field>
            <Field label="E-mail"><Input value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="URL da foto"><Input value={profile.photo_url ?? ""} onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })} /></Field>
            <Field label="Endereço"><Input value={profile.address_street ?? ""} onChange={(e) => setProfile({ ...profile, address_street: e.target.value })} /></Field>
            <Field label="Número"><Input value={profile.address_number ?? ""} onChange={(e) => setProfile({ ...profile, address_number: e.target.value })} /></Field>
            <Field label="Bairro"><Input value={profile.address_neighborhood ?? ""} onChange={(e) => setProfile({ ...profile, address_neighborhood: e.target.value })} /></Field>
            <Field label="Cidade"><Input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
            <Field label="Estado"><Input value={profile.state ?? ""} onChange={(e) => setProfile({ ...profile, state: e.target.value })} /></Field>
            <Field label="CEP"><Input value={profile.zip_code ?? ""} onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })} /></Field>
            <Field label="Nacionalidade"><Input value={profile.nationality ?? ""} onChange={(e) => setProfile({ ...profile, nationality: e.target.value })} /></Field>
            <Field label="Escolaridade"><Input value={profile.education_level ?? ""} onChange={(e) => setProfile({ ...profile, education_level: e.target.value })} placeholder="Ensino Médio, Superior, Pós..." /></Field>
            <Field label="Nome da mãe"><Input value={profile.mother_name ?? ""} onChange={(e) => setProfile({ ...profile, mother_name: e.target.value })} /></Field>
            <Field label="Nome do pai"><Input value={profile.father_name ?? ""} onChange={(e) => setProfile({ ...profile, father_name: e.target.value })} /></Field>
            <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase text-muted-foreground">Contato de emergência</div>
            <Field label="Nome"><Input value={profile.emergency_contact_name ?? ""} onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={profile.emergency_contact_phone ?? ""} onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })} /></Field>
            <Field label="Grau de parentesco"><Input value={profile.emergency_contact_relation ?? ""} onChange={(e) => setProfile({ ...profile, emergency_contact_relation: e.target.value })} placeholder="Pai, mãe, cônjuge..." /></Field>
            <div className="md:col-span-2">
              <Field label="Observações"><Textarea rows={3} value={profile.notes ?? ""} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-2">
              <Button onClick={saveProfile}><Save className="mr-2 h-4 w-4" />Salvar dados pessoais</Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* PROFESSIONAL */}
        <TabsContent value="professional" className="mt-4">
          <Card><CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <Field label="Cargo">
              <Select value={profile.role ?? "teacher"} onValueChange={(v) => setProfile({ ...profile, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data de admissão"><Input type="date" value={profile.admission_date ?? ""} onChange={(e) => setProfile({ ...profile, admission_date: e.target.value })} /></Field>
            <Field label="Data de desligamento"><Input type="date" value={profile.termination_date ?? ""} onChange={(e) => setProfile({ ...profile, termination_date: e.target.value })} /></Field>
            <Field label="CREF / Registro profissional"><Input value={profile.professional_registry ?? ""} onChange={(e) => setProfile({ ...profile, professional_registry: e.target.value })} placeholder="CREF 000000-G/UF" /></Field>
            <Field label="Modalidades (separadas por vírgula)">
              <Input
                value={Array.isArray(profile.modalities) ? profile.modalities.join(", ") : ""}
                onChange={(e) => setProfile({ ...profile, modalities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                placeholder="Jiu-Jitsu, Judô, No-Gi, Kids..."
              />
            </Field>
            <Field label="Especialidades"><Input value={profile.specialties ?? ""} onChange={(e) => setProfile({ ...profile, specialties: e.target.value })} /></Field>

            {(profile.role === "teacher" || profile.role === "instructor") && (
              <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Graduação do professor / instrutor
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Faixa (fonte: Modalidades & Faixas)">
                    <Select
                      value={profile.belt_id ?? "none"}
                      onValueChange={(v) => setProfile({ ...profile, belt_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a faixa" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhuma —</SelectItem>
                        {(belts.data ?? []).map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.modality ? `${b.modality} · ` : ""}{b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Grau">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={profile.belt_grade ?? ""}
                      onChange={(e) => setProfile({ ...profile, belt_grade: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="0"
                    />
                  </Field>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prévia</Label>
                    <div className="rounded border bg-background p-2">
                      {(() => {
                        const belt = (belts.data ?? []).find((b: any) => b.id === profile.belt_id);
                        if (!belt) return <div className="text-xs text-muted-foreground">Selecione uma faixa para visualizar</div>;
                        return <BeltAuto belt={belt as any} degree={Number(profile.belt_grade ?? 0)} className="h-8" />;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">
                  Confederação / Federação
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Confederação / Federação">
                    <Input
                      value={profile.confederation_name ?? ""}
                      onChange={(e) => setProfile({ ...profile, confederation_name: e.target.value })}
                      placeholder="Ex.: CBJJ, IBJJF, CBJ, IJF..."
                    />
                  </Field>
                  <Field label="Número de registro">
                    <Input
                      value={profile.confederation_number ?? ""}
                      onChange={(e) => setProfile({ ...profile, confederation_number: e.target.value })}
                      placeholder="Ex.: 123456"
                    />
                  </Field>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <Field label="Biografia"><Textarea rows={4} value={profile.biography ?? ""} onChange={(e) => setProfile({ ...profile, biography: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Mini currículo"><Textarea rows={3} value={profile.mini_resume ?? ""} onChange={(e) => setProfile({ ...profile, mini_resume: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-2">
              <Button onClick={saveProfile}><Save className="mr-2 h-4 w-4" />Salvar dados profissionais</Button>
            </div>
          </CardContent></Card>
        </TabsContent>


        {/* PERMISSIONS */}
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab
            memberId={id}
            role={m.role}
            email={m.email}
            linkedUserId={m.user_id}
            initialPermissions={(m.permissions ?? {}) as Record<string, "none" | "read" | "write">}
          />
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="mt-4">
          <TeacherScheduleTab teacherId={id} />
        </TabsContent>


        {/* FINANCIAL CONFIG */}
        <TabsContent value="financial" className="mt-4">
          <Card><CardContent className="p-4 space-y-4">
            {(() => {
              const pt = (payroll.payment_type ?? "fixed") as string;
              // Campos relevantes por modalidade de pagamento
              const show = {
                base_salary: ["fixed", "contractor", "mei", "autonomous", "other"].includes(pt),
                hourly_rate: ["hourly", "contractor", "mei", "autonomous", "other"].includes(pt),
                per_class_rate: ["per_class", "contractor", "mei", "autonomous", "other"].includes(pt),
                commission_percent: ["percentage", "commission", "other"].includes(pt),
                commission_on_enrollment: ["commission", "percentage", "other"].includes(pt),
                commission_on_renewal: ["commission", "percentage", "other"].includes(pt),
                commission_on_sale: ["commission", "percentage", "other"].includes(pt),
                tax_id_required: ["contractor", "mei", "autonomous"].includes(pt),
              };
              const hints: Record<string, string> = {
                fixed: "Valor fixo mensal — informe o salário base.",
                hourly: "Pagamento por hora trabalhada — informe o valor da hora.",
                per_class: "Pagamento por aula ministrada — informe o valor por aula.",
                percentage: "Percentual sobre receita/matrículas — informe o % aplicado.",
                commission: "Comissões por matrícula, renovação e venda.",
                contractor: "Prestador PJ/RPA — informe CPF/CNPJ e valores contratados.",
                mei: "MEI — informe CNPJ e valores contratados.",
                autonomous: "Autônomo — informe CPF e valores acordados.",
                other: "Modalidade personalizada — preencha os campos aplicáveis.",
              };
              return (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Tipo de pagamento">
                      <Select value={pt} onValueChange={(v) => setPayroll({ ...payroll, payment_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground">{hints[pt] ?? ""}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {show.base_salary && (
                      <Field label="Salário base (R$)"><Input type="number" step="0.01" value={payroll.base_salary ?? ""} onChange={(e) => setPayroll({ ...payroll, base_salary: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.hourly_rate && (
                      <Field label="Valor por hora (R$)"><Input type="number" step="0.01" value={payroll.hourly_rate ?? ""} onChange={(e) => setPayroll({ ...payroll, hourly_rate: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.per_class_rate && (
                      <Field label="Valor por aula (R$)"><Input type="number" step="0.01" value={payroll.per_class_rate ?? ""} onChange={(e) => setPayroll({ ...payroll, per_class_rate: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.commission_percent && (
                      <Field label="Percentual (%)"><Input type="number" step="0.01" value={payroll.commission_percent ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_percent: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.commission_on_enrollment && (
                      <Field label="Comissão por matrícula (R$)"><Input type="number" step="0.01" value={payroll.commission_on_enrollment ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_enrollment: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.commission_on_renewal && (
                      <Field label="Comissão por renovação (R$)"><Input type="number" step="0.01" value={payroll.commission_on_renewal ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_renewal: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                    {show.commission_on_sale && (
                      <Field label="Comissão por venda (R$)"><Input type="number" step="0.01" value={payroll.commission_on_sale ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_sale: e.target.value ? Number(e.target.value) : null })} /></Field>
                    )}
                  </div>

                  <div className="pt-2">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados bancários</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="Banco"><Input value={payroll.bank_name ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_name: e.target.value })} /></Field>
                      <Field label="Agência"><Input value={payroll.bank_agency ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_agency: e.target.value })} /></Field>
                      <Field label="Conta"><Input value={payroll.bank_account ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_account: e.target.value })} /></Field>
                      <Field label="PIX"><Input value={payroll.pix_key ?? ""} onChange={(e) => setPayroll({ ...payroll, pix_key: e.target.value })} /></Field>
                      <Field label={show.tax_id_required ? "CPF/CNPJ *" : "CPF/CNPJ"}>
                        <Input value={payroll.tax_id ?? ""} onChange={(e) => setPayroll({ ...payroll, tax_id: e.target.value })} />
                      </Field>
                    </div>
                  </div>

                  <Field label="Observações financeiras"><Textarea rows={3} value={payroll.notes ?? ""} onChange={(e) => setPayroll({ ...payroll, notes: e.target.value })} /></Field>

                  <div>
                    <Button onClick={savePayrollForm}><Save className="mr-2 h-4 w-4" />Salvar configuração financeira</Button>
                  </div>
                </>
              );
            })()}
          </CardContent></Card>
        </TabsContent>


        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo lançamento</CardTitle>
              <p className="text-xs text-muted-foreground">
                Selecione o período — o valor é calculado automaticamente segundo a modalidade de pagamento
                ({PAYMENT_TYPES.find(([k]) => k === (payroll.payment_type ?? "fixed"))?.[1] ?? "—"})
                usando a agenda do colaborador. Pagamentos com status <b>Pago</b> geram uma despesa em Financeiro.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="De"><Input type="date" value={newPay.from} onChange={(e) => setNewPay({ ...newPay, from: e.target.value })} /></Field>
                <Field label="Até"><Input type="date" value={newPay.to} onChange={(e) => setNewPay({ ...newPay, to: e.target.value })} /></Field>
                <div className="flex items-end">
                  <Button variant="outline" onClick={recalc} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" /> Calcular pela agenda
                  </Button>
                </div>
                <Field label="Tipo">
                  <Select value={newPay.kind} onValueChange={(v) => setNewPay({ ...newPay, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_KINDS.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {calc && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                  <b>Base:</b> {calc.classes} aula(s) · {calc.hours}h ·
                  {" "}Hora R$ {calc.hourly_rate.toFixed(2)} · Aula R$ {calc.per_class_rate.toFixed(2)} · Fixo R$ {calc.base_salary.toFixed(2)}
                  {" "}→ Sugerido <b>R$ {calc.suggested_amount.toFixed(2)}</b>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Descrição"><Input value={newPay.description} onChange={(e) => setNewPay({ ...newPay, description: e.target.value })} /></Field>
                <Field label="Valor (R$)"><Input type="number" step="0.01" value={newPay.amount} onChange={(e) => setNewPay({ ...newPay, amount: e.target.value })} /></Field>
                <Field label="Horas"><Input type="number" step="0.01" value={newPay.hours_worked ?? ""} onChange={(e) => setNewPay({ ...newPay, hours_worked: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Nº aulas"><Input type="number" value={newPay.classes_count ?? ""} onChange={(e) => setNewPay({ ...newPay, classes_count: e.target.value ? Number(e.target.value) : null })} /></Field>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Status">
                  <Select value={newPay.status} onValueChange={(v) => setNewPay({ ...newPay, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vencimento"><Input type="date" value={newPay.due_date} onChange={(e) => setNewPay({ ...newPay, due_date: e.target.value })} /></Field>
                <Field label="Data do pagamento"><Input type="date" value={newPay.paid_at ? newPay.paid_at.slice(0,10) : ""} onChange={(e) => setNewPay({ ...newPay, paid_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></Field>
                <Field label="Forma">
                  <Select value={newPay.payment_method || "pix"} onValueChange={(v) => setNewPay({ ...newPay, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="flex justify-end">
                <Button onClick={addPayment}><Save className="mr-2 h-4 w-4" />Registrar lançamento</Button>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card">
            {(payments.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem lançamentos.</div>}
            {(payments.data ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {PAYMENT_KINDS.find(([k]) => k === p.kind)?.[1] ?? p.kind}
                    {p.description ? ` · ${p.description}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.reference_month ? new Date(p.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—"}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {Number(p.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
                <Badge variant={p.status === "paid" ? "default" : p.status === "canceled" ? "destructive" : "outline"}>
                  {p.status === "paid" ? "Pago" : p.status === "canceled" ? "Cancelado" : "Pendente"}
                </Badge>
                {p.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await markPaidFn({ data: { id: p.id } });
                    qc.invalidateQueries({ queryKey: ["team-member-payments", id] });
                  }}>Marcar pago</Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar documento</CardTitle></CardHeader>
            <CardContent>
              <DocumentUpload memberId={id} onSaved={() => qc.invalidateQueries({ queryKey: ["team-member-docs", id] })} onSave={addDocFn} />
            </CardContent>
          </Card>
          <div className="rounded-lg border bg-card">
            {(docs.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum documento anexado.</div>}
            {(docs.data ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{d.title}</a>
                  <div className="text-xs text-muted-foreground">{d.kind} · {new Date(d.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!confirm("Arquivar documento? O arquivo NÃO será apagado, apenas ocultado.")) return;
                  await archiveDocFn({ data: { id: d.id } });
                  qc.invalidateQueries({ queryKey: ["team-member-docs", id] });
                }}>Arquivar</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CONTRACTS */}
        <TabsContent value="contracts" className="mt-4">
          <TeamContracts teamMemberId={id} member={m} />
        </TabsContent>



        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-lg border bg-card">
            {(history.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem eventos ainda.</div>}
            {(history.data ?? []).map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 border-b p-3 last:border-0">
                <History className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{h.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("pt-BR")} · {h.event_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DojoPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function DocumentUpload({ memberId, onSaved, onSave }: {
  memberId: string;
  onSaved: () => void;
  onSave: (args: { data: any }) => Promise<any>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("other");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `team/${memberId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("ig-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ig-media").getPublicUrl(path);
      setUrl(data.publicUrl);
      if (!title) setTitle(file.name);
      toast.success("Arquivo enviado. Confirme para anexar.");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !url.trim()) { toast.error("Envie um arquivo ou informe um título e URL"); return; }
    try {
      await onSave({ data: { member_id: memberId, title, kind, file_url: url } });
      toast.success("Documento anexado");
      setTitle(""); setUrl(""); setKind("other");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Anexo de documentos é opcional. Envie um arquivo direto ou cole uma URL pública.
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contract">Contrato</SelectItem>
            <SelectItem value="rg">RG</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
            <SelectItem value="proof">Comprovante</SelectItem>
            <SelectItem value="certificate">Certificado</SelectItem>
            <SelectItem value="course">Curso</SelectItem>
            <SelectItem value="diploma">Diploma</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent">
          <Upload className="h-4 w-4" />
          <span className="truncate">{uploading ? "Enviando..." : "Escolher arquivo"}</span>
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button onClick={submit} disabled={uploading}>Anexar</Button>
      </div>
      {url && (
        <div className="text-xs text-muted-foreground truncate">
          Pré-visualização: <a className="underline" href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
      <Input
        placeholder="Ou cole uma URL pública"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
    </div>
  );
}

function TeacherScheduleTab({ teacherId }: { teacherId: string }) {
  const listFn = useServerFn(listTeamSchedule);
  const genFn = useServerFn(generateOccurrences);
  const qc = useQueryClient();

  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 27);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from: fmt(from), to: fmt(to) };
  }, []);

  const schedule = useQuery({
    queryKey: ["teacher-schedule", teacherId, range.from, range.to],
    queryFn: () => listFn({ data: { from: range.from, to: range.to, teacher_id: teacherId } }),
  });

  async function regenerate() {
    try {
      await genFn({ data: { from: range.from, to: range.to, teacher_id: teacherId } });
      await qc.invalidateQueries({ queryKey: ["teacher-schedule", teacherId] });
      toast.success("Ocorrências regeneradas.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao regenerar.");
    }
  }

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const o of (schedule.data ?? []) as any[]) {
      const k = o.occurrence_date as string;
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return map;
  }, [schedule.data]);

  const days = useMemo(() => {
    const arr: string[] = [];
    const [y, m, d] = range.from.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    for (let i = 0; i < 28; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      arr.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
    }
    return arr;
  }, [range.from]);

  const total = (schedule.data ?? []).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Próximas 4 semanas</p>
            <p className="text-xs text-muted-foreground">
              Turmas onde este colaborador é titular ou substituto. {total} ocorrência(s) encontrada(s).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={regenerate}>
              <RefreshCw className="mr-1 h-4 w-4" /> Regenerar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dojo/app/schedule">Abrir Agenda</Link>
            </Button>
          </div>
        </div>

        {schedule.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : total === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma turma agendada para este colaborador nas próximas 4 semanas.
            <br />
            Se você acabou de designá-lo(a), clique em <strong>Regenerar</strong> para materializar as ocorrências.
          </div>
        ) : (
          <div className="space-y-3">
            {days
              .filter((d) => byDay.get(d)?.length)
              .map((d) => {
                const items = byDay.get(d) ?? [];
                const [yy, mm, dd] = d.split("-").map(Number);
                const dt = new Date(yy, mm - 1, dd);
                return (
                  <div key={d} className="rounded-md border">
                    <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                      {dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </div>
                    <div className="divide-y">
                      {items.map((o: any) => {
                        const substituted = !!o.substitute_teacher_id;
                        return (
                          <div key={o.occurrence_id} className="flex flex-wrap items-center gap-3 p-3">
                            <div className="h-8 w-1 rounded" style={{ background: o.color || "hsl(var(--primary))" }} />
                            <div className="min-w-[80px] font-mono text-sm">
                              {String(o.start_time).slice(0, 5)}–{String(o.end_time).slice(0, 5)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{o.class_name}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {o.modality}{o.level ? ` · ${o.level}` : ""}{o.space_name ? ` · ${o.space_name}` : ""}
                              </div>
                            </div>
                            {substituted && (
                              <Badge variant="secondary" className="gap-1">
                                <CalendarClock className="h-3 w-3" /> Substituição
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

