import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getTeamMember,
  upsertTeamMember,
  upsertPayrollConfig,
  listPayments,
  upsertPayment,
  markPaymentPaid,
  listTeamDocuments,
  addTeamDocument,
  archiveTeamDocument,
  listTeamHistory,
  deleteTeamMember,
} from "@/lib/dojo/team.functions";
import { listDojoBelts } from "@/lib/dojo/dojo.functions";
import { PermissionsTab } from "@/components/dojo/team/PermissionsTab";
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
import { ArrowLeft, Save, Trash2, FileText, History, Upload } from "lucide-react";

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

  const [newPay, setNewPay] = useState<any>({ kind: "salary", amount: 0, status: "pending", description: "" });

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
          reference_month: new Date().toISOString().slice(0, 7) + "-01",
        },
      });
      toast.success("Lançamento registrado");
      setNewPay({ kind: "salary", amount: 0, status: "pending", description: "" });
      qc.invalidateQueries({ queryKey: ["team-member-payments", id] });
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

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <Link to="/dojo/app/team"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
      </Button>
      <Button variant="destructive" onClick={doDelete}>
        <Trash2 className="mr-2 h-4 w-4" /> Desligar
      </Button>
    </div>
  );

  return (
    <DojoPageShell title={m.full_name} description={ROLE_OPTIONS.find(r => r[0] === m.role)?.[1]} actions={actions}>
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
          <Card><CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              A agenda individual deste colaborador é reflexo direto do módulo Agenda / Turmas. Cadastre horários e turmas centralmente e eles aparecerão automaticamente aqui.
            </p>
            <Button variant="outline" asChild>
              <Link to="/dojo/app/schedule">Abrir Agenda / Turmas</Link>
            </Button>
          </CardContent></Card>
        </TabsContent>

        {/* FINANCIAL CONFIG */}
        <TabsContent value="financial" className="mt-4">
          <Card><CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <Field label="Tipo de pagamento">
              <Select value={payroll.payment_type ?? "fixed"} onValueChange={(v) => setPayroll({ ...payroll, payment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Salário base (R$)"><Input type="number" step="0.01" value={payroll.base_salary ?? ""} onChange={(e) => setPayroll({ ...payroll, base_salary: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Valor por hora (R$)"><Input type="number" step="0.01" value={payroll.hourly_rate ?? ""} onChange={(e) => setPayroll({ ...payroll, hourly_rate: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Valor por aula (R$)"><Input type="number" step="0.01" value={payroll.per_class_rate ?? ""} onChange={(e) => setPayroll({ ...payroll, per_class_rate: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Percentual (%)"><Input type="number" step="0.01" value={payroll.commission_percent ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_percent: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Comissão por matrícula (R$)"><Input type="number" step="0.01" value={payroll.commission_on_enrollment ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_enrollment: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Comissão por renovação (R$)"><Input type="number" step="0.01" value={payroll.commission_on_renewal ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_renewal: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Comissão por venda (R$)"><Input type="number" step="0.01" value={payroll.commission_on_sale ?? ""} onChange={(e) => setPayroll({ ...payroll, commission_on_sale: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Banco"><Input value={payroll.bank_name ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_name: e.target.value })} /></Field>
            <Field label="Agência"><Input value={payroll.bank_agency ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_agency: e.target.value })} /></Field>
            <Field label="Conta"><Input value={payroll.bank_account ?? ""} onChange={(e) => setPayroll({ ...payroll, bank_account: e.target.value })} /></Field>
            <Field label="PIX"><Input value={payroll.pix_key ?? ""} onChange={(e) => setPayroll({ ...payroll, pix_key: e.target.value })} /></Field>
            <Field label="CPF/CNPJ"><Input value={payroll.tax_id ?? ""} onChange={(e) => setPayroll({ ...payroll, tax_id: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Field label="Observações financeiras"><Textarea rows={3} value={payroll.notes ?? ""} onChange={(e) => setPayroll({ ...payroll, notes: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-2">
              <Button onClick={savePayrollForm}><Save className="mr-2 h-4 w-4" />Salvar configuração financeira</Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo lançamento</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Select value={newPay.kind} onValueChange={(v) => setNewPay({ ...newPay, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_KINDS.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Descrição" value={newPay.description} onChange={(e) => setNewPay({ ...newPay, description: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Valor" value={newPay.amount} onChange={(e) => setNewPay({ ...newPay, amount: e.target.value })} />
              <div className="flex gap-2">
                <Select value={newPay.status} onValueChange={(v) => setNewPay({ ...newPay, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addPayment}>Adicionar</Button>
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
