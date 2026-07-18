import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getDojoStudent, listDojoBelts, listDojoPlans,
  addDojoGraduation, deleteDojoGraduation,
  saveDojoEnrollment, deleteDojoEnrollment,
  saveDojoInvoice, markDojoInvoicePaid, deleteDojoInvoice,
  deleteDojoStudent,
} from "@/lib/dojo/dojo.functions";
import { regenerateStudentCodes } from "@/lib/dojo/attendance.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Award, Eye, Printer, Pencil, ArrowLeft } from "lucide-react";
import { BeltVisual } from "@/components/dojo/BeltVisual";
import { CertificatePreviewDialog, openCertificatePrint, type CertificateTemplate } from "@/components/dojo/CertificatePreview";

export const Route = createFileRoute("/dojo/app/students/$id")({
  component: StudentDetail,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const delStudent = useServerFn(deleteDojoStudent);
  const getFn = useServerFn(getDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const plansFn = useServerFn(listDojoPlans);
  const addGrad = useServerFn(addDojoGraduation);
  const delGrad = useServerFn(deleteDojoGraduation);
  const saveEnroll = useServerFn(saveDojoEnrollment);
  const delEnroll = useServerFn(deleteDojoEnrollment);
  const saveInv = useServerFn(saveDojoInvoice);
  const payInv = useServerFn(markDojoInvoicePaid);
  const delInv = useServerFn(deleteDojoInvoice);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["dojo-student", id], queryFn: () => getFn({ data: { id } }) });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const plans = useQuery({ queryKey: ["dojo-plans"], queryFn: () => plansFn() });

  const [grad, setGrad] = useState({ belt_id: "", degree: 0, graduation_date: new Date().toISOString().slice(0,10), evaluator: "", notes: "" });
  const [enroll, setEnroll] = useState({ plan_id: "", custom_amount: "", due_day: 5, start_date: new Date().toISOString().slice(0,10), status: "active" as const });
  const [inv, setInv] = useState({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10) });
  const [previewCert, setPreviewCert] = useState<any | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-student", id] });

  const doAddGrad = async () => {
    if (!grad.belt_id) return toast.error("Escolha a faixa");
    await addGrad({ data: { student_id: id, ...grad, degree: Number(grad.degree) } });
    toast.success("Graduação registrada"); refresh();
    setGrad({ ...grad, evaluator: "", notes: "" });
  };

  const doAddEnroll = async () => {
    if (!enroll.plan_id) return toast.error("Escolha o plano");
    await saveEnroll({ data: {
      student_id: id, plan_id: enroll.plan_id,
      custom_amount: enroll.custom_amount ? Number(enroll.custom_amount) : null,
      due_day: Number(enroll.due_day), start_date: enroll.start_date, status: enroll.status,
    }});
    toast.success("Matrícula salva"); refresh();
  };

  const doAddInv = async () => {
    if (!inv.amount) return toast.error("Informe o valor");
    await saveInv({ data: {
      student_id: id, description: inv.description || "Mensalidade",
      amount: Number(inv.amount), due_date: inv.due_date,
    }});
    toast.success("Cobrança criada"); refresh();
    setInv({ description: "", amount: "", due_date: new Date().toISOString().slice(0,10) });
  };

  if (!q.data) return <div>Carregando…</div>;
  const s = q.data.student as any;

  const onDeleteStudent = async () => {
    if (!confirm(`Excluir ${s.full_name}? Esta ação apaga histórico de graduações, mensalidades e certificados.`)) return;
    try {
      await delStudent({ data: { id } });
      toast.success("Aluno excluído");
      navigate({ to: "/dojo/app/students" });
    } catch (e: any) { toast.error("Erro ao excluir", { description: e.message }); }
  };

  const addr = [s.street, s.address_number, s.neighborhood, s.city && `${s.city}/${s.state ?? ""}`, s.zip]
    .filter(Boolean).join(", ");
  const anamn = s.anamnesis ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/dojo/app/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Alunos
        </Link>
        <div className="flex gap-2">
          <Link to="/dojo/app/students" search={{ edit: id } as any}>
            <Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
          </Link>
          <Button size="sm" variant="destructive" onClick={onDeleteStudent}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
            {s.photo_url ? (
              <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                {s.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{s.full_name}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-100 text-green-800" : s.status === "frozen" ? "bg-amber-100 text-amber-800" : "bg-muted"}`}>
                {s.status === "active" ? "Ativo" : s.status === "frozen" ? "Trancado" : "Inativo"}
              </span>
              {s.belt?.name && (
                <span className="text-muted-foreground">
                  {s.belt.name}{s.current_degree ? ` · ${s.current_degree}º grau` : ""}
                </span>
              )}
              {s.unit?.name && <span className="text-muted-foreground">· {s.unit.name}</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm md:grid-cols-2">
          <Section title="Dados pessoais">
            <Info label="CPF" value={s.cpf} />
            <Info label="RG" value={s.rg} />
            <Info label="Nascimento" value={s.birth_date} />
            <Info label="Gênero" value={s.gender} />
            <Info label="Nacionalidade" value={s.nationality} />
            <Info label="Estado civil" value={s.marital_status} />
            <Info label="Profissão" value={s.profession} />
            <Info label="Tipo sanguíneo" value={s.blood_type} />
            <Info label="Plano de saúde" value={s.health_insurance} />
          </Section>

          <Section title="Contato">
            <Info label="E-mail" value={s.email} />
            <Info label="Telefone" value={s.phone} />
            <Info label="Endereço" value={addr || null} />
            <Info label="Responsável" value={s.guardian_name} />
            <Info label="Tel. responsável" value={s.guardian_phone} />
            <Info label="Contato emergência" value={s.emergency_contact_name} />
            <Info label="Tel. emergência" value={s.emergency_contact_phone} />
            <Info label="Parentesco" value={s.emergency_contact_relationship} />
          </Section>

          <Section title="Anamnese">
            <Info label="Condições médicas" value={anamn.medical_conditions} />
            <Info label="Medicações" value={anamn.medications} />
            <Info label="Alergias" value={anamn.allergies} />
            <Info label="Cirurgias" value={anamn.surgeries} />
            <Info label="Lesões" value={anamn.injuries} />
            <Info label="Nível de atividade" value={anamn.physical_activity_level} />
            <Info label="Objetivos" value={anamn.objectives} />
            <Info label="Outros" value={anamn.other} />
            <Info
              label="Alertas"
              value={[
                anamn.heart_issues && "cardíaco",
                anamn.diabetes && "diabetes",
                anamn.hypertension && "hipertensão",
                anamn.asthma && "asma",
                anamn.pregnant && "gestante",
                anamn.smoking && "fumante",
                anamn.alcohol && "álcool",
              ].filter(Boolean).join(", ") || null}
            />
            <Info label="Atestado médico" value={s.has_medical_clearance ? `Sim${s.medical_clearance_date ? ` (${s.medical_clearance_date})` : ""}` : "Não"} />
          </Section>

          <Section title="Consentimentos & observações">
            <Info label="LGPD" value={s.lgpd_consent ? "Autorizado" : "Não"} />
            <Info label="Uso de imagem" value={s.image_rights_consent ? "Autorizado" : "Não"} />
            <Info label="Termos aceitos" value={s.terms_accepted ? "Sim" : "Não"} />
            <Info label="Observações" value={s.notes} />
          </Section>
        </CardContent>
      </Card>


      <CheckinCodesCard student={s} onUpdated={() => q.refetch()} />


      <Card>
        <CardHeader><CardTitle className="text-base">Graduações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-6 gap-2">
            <select className="border rounded p-2 bg-background" value={grad.belt_id} onChange={e => setGrad({ ...grad, belt_id: e.target.value, degree: 0 })}>
              <option value="">Faixa</option>
              {(belts.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {(() => {
              const selBelt = (belts.data ?? []).find((b: any) => b.id === grad.belt_id);
              const maxDeg = selBelt?.max_degrees ?? 4;
              return (
                <select className="border rounded p-2 bg-background" value={grad.degree} onChange={e => setGrad({ ...grad, degree: Number(e.target.value) })} disabled={!selBelt}>
                  {Array.from({ length: maxDeg + 1 }).map((_, i) => (
                    <option key={i} value={i}>{i === 0 ? "Sem grau" : `${i}º grau`}</option>
                  ))}
                </select>
              );
            })()}
            <Input type="date" value={grad.graduation_date} onChange={e => setGrad({ ...grad, graduation_date: e.target.value })} />
            <Input placeholder="Avaliador" value={grad.evaluator} onChange={e => setGrad({ ...grad, evaluator: e.target.value })} />
            <Input placeholder="Obs." value={grad.notes} onChange={e => setGrad({ ...grad, notes: e.target.value })} />
            <Button onClick={doAddGrad}>Registrar</Button>
          </div>
          <div className="border rounded">
            {q.data.graduations.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {g.belt?.color_hex && (
                    <BeltVisual name={g.belt.name} colorHex={g.belt.color_hex} stripeHex={g.belt.stripe_hex} degree={g.degree} maxDegrees={g.belt?.max_degrees ?? 4} />
                  )}
                  <div className="truncate">{g.belt?.name} · {g.degree === 0 ? "sem grau" : `${g.degree}º grau`} · {g.graduation_date} · {g.evaluator ?? "—"}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await delGrad({ data: { id: g.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.graduations.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem graduações.</div>}
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Matrícula / Plano</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-6 gap-2">
            <select className="border rounded p-2 bg-background" value={enroll.plan_id} onChange={e => setEnroll({ ...enroll, plan_id: e.target.value })}>
              <option value="">Plano</option>
              {(plans.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} · {brl(p.amount)}</option>)}
            </select>
            <Input type="number" step="0.01" placeholder="Valor custom (R$)" value={enroll.custom_amount} onChange={e => setEnroll({ ...enroll, custom_amount: e.target.value })} />
            <Input type="number" min={1} max={28} placeholder="Dia venc." value={enroll.due_day} onChange={e => setEnroll({ ...enroll, due_day: Number(e.target.value) })} />
            <Input type="date" value={enroll.start_date} onChange={e => setEnroll({ ...enroll, start_date: e.target.value })} />
            <Button onClick={doAddEnroll}>Salvar</Button>
          </div>
          <div className="border rounded">
            {q.data.enrollments.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                <div>{e.plan?.name} · {brl(e.custom_amount ?? e.plan?.amount)} · venc. dia {e.due_day} · {e.status}</div>
                <Button size="icon" variant="ghost" onClick={async () => { await delEnroll({ data: { id: e.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.enrollments.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem matrículas.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensalidades / Cobranças</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-5 gap-2">
            <Input placeholder="Descrição" value={inv.description} onChange={e => setInv({ ...inv, description: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Valor" value={inv.amount} onChange={e => setInv({ ...inv, amount: e.target.value })} />
            <Input type="date" value={inv.due_date} onChange={e => setInv({ ...inv, due_date: e.target.value })} />
            <Button onClick={doAddInv} className="md:col-span-2">Criar cobrança</Button>
          </div>
          <div className="border rounded">
            {q.data.invoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm gap-2">
                <div className="flex-1 min-w-0 truncate">{i.description} · {brl(i.amount)} · venc. {i.due_date}</div>
                {(() => {
                  const isOverdue = i.status === "pending" && i.due_date && new Date(i.due_date) < new Date(new Date().toDateString());
                  const effective = i.status === "paid" ? "paid" : isOverdue ? "overdue" : i.status;
                  const label = effective === "paid" ? "Paga" : effective === "overdue" ? "Vencida" : "Pendente";
                  const cls = effective === "paid" ? "bg-green-100 text-green-800" : effective === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
                  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}</span>;
                })()}
                {i.status !== "paid" && <Button size="sm" variant="outline" onClick={async () => { await payInv({ data: { id: i.id, method: "cash" } }); refresh(); }}>Marcar pago</Button>}
                <Button size="icon" variant="ghost" onClick={async () => { await delInv({ data: { id: i.id } }); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {q.data.invoices.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem cobranças.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Certificados emitidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded divide-y">
            {(q.data.certificates ?? []).map((c: any) => {
              const dt = new Date(c.issued_at).toLocaleDateString("pt-BR");
              const beltLabel = c.graduation?.belt?.name
                ? `${c.graduation.belt.name}${c.graduation.degree ? ` · ${c.graduation.degree}º grau` : ""}`
                : (c.values?.belt ?? "—");
              const hasTemplate = !!c.template?.background_url;
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.template?.name ?? "Certificado"}</div>
                    <div className="text-xs text-muted-foreground truncate">Emitido em {dt} · {beltLabel}</div>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    disabled={!hasTemplate}
                    onClick={() => setPreviewCert(c)}
                    title={hasTemplate ? "Pré-visualizar" : "Modelo indisponível"}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Ver
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    disabled={!hasTemplate}
                    onClick={() => openCertificatePrint([{ template: c.template as CertificateTemplate, values: c.values ?? {} }])}
                    title="Imprimir / salvar em PDF"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {(q.data.certificates ?? []).length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Sem certificados. Emita pela aba <strong>Nova graduação</strong>.</div>
            )}
          </div>
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

function CheckinCodesCard({ student, onUpdated }: { student: any; onUpdated: () => void }) {
  const regen = useServerFn(regenerateStudentCodes);

  const [busy, setBusy] = useState(false);
  async function run(kind: "pin" | "qr" | "both") {
    setBusy(true);
    try {
      await regen({ data: {
        studentId: student.id,
        resetPin: kind !== "qr",
        resetQr: kind !== "pin",
      } });
      toast.success("Códigos atualizados");
      onUpdated();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Códigos de Check-in</CardTitle></CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">PIN</div>
          <div className="font-mono text-lg">{student.checkin_pin ?? "—"}</div>
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => run("pin")}>Gerar PIN</Button>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Token QR</div>
          <div className="font-mono text-xs break-all">{student.qr_token ?? "—"}</div>
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => run("qr")}>Rotacionar QR</Button>
        </div>
        <div className="flex items-end">
          <Button size="sm" disabled={busy} onClick={() => run("both")}>Gerar ambos</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  const v = value === true ? "Sim" : value === false ? "Não" : value;
  const display = v === null || v === undefined || v === "" ? "—" : String(v);
  return (
    <div className="flex gap-2 text-sm">
      <dt className="min-w-[9rem] text-muted-foreground">{label}</dt>
      <dd className="flex-1 break-words">{display}</dd>
    </div>
  );
}
