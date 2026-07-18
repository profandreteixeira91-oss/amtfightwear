import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listDojoStudents,
  saveDojoStudent,
  deleteDojoStudent,
  listDojoBelts,
  listDojoUnits,
} from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPhotoCapture } from "@/components/dojo/StudentPhotoCapture";
import { toast } from "sonner";
import { Trash2, Pencil, UserPlus } from "lucide-react";

export const Route = createFileRoute("/dojo/app/students")({
  component: StudentsPage,
});

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
  status: "active" | "inactive" | "frozen";
  notes: string;
  photo_url: string | null;
  has_medical_clearance: boolean;
  medical_clearance_date: string;
  lgpd_consent: boolean;
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
  image_rights_consent: false,
  terms_accepted: false,
  anamnesis: {},
};

function StudentsPage() {
  const listFn = useServerFn(listDojoStudents);
  const saveFn = useServerFn(saveDojoStudent);
  const delFn = useServerFn(deleteDojoStudent);
  const beltsFn = useServerFn(listDojoBelts);
  const unitsFn = useServerFn(listDojoUnits);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const q = useQuery({ queryKey: ["dojo-students"], queryFn: () => listFn() });
  const belts = useQuery({ queryKey: ["dojo-belts"], queryFn: () => beltsFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });

  const filtered = (q.data ?? []).filter((s: any) => {
    const okS = status === "all" || s.status === status;
    const okQ =
      !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    return okS && okQ;
  });

  function set<K extends keyof StudentForm>(key: K, val: StudentForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function setAnamn<K extends keyof StudentForm["anamnesis"]>(key: K, val: StudentForm["anamnesis"][K]) {
    setForm((f) => ({ ...f, anamnesis: { ...f.anamnesis, [key]: val } }));
  }

  function openNew() {
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(s: any) {
    setForm({
      ...emptyForm,
      ...s,
      current_degree: s.current_degree ?? 0,
      anamnesis: s.anamnesis ?? {},
      medical_clearance_date: s.medical_clearance_date ?? "",
      birth_date: s.birth_date ?? "",
    });
    setOpen(true);
  }

  const onSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }
    if (!form.lgpd_consent || !form.terms_accepted) {
      toast.error("É necessário registrar o consentimento LGPD e o aceite dos termos");
      return;
    }
    try {
      const payload: any = { ...form, current_degree: Number(form.current_degree || 0) };
      // convert empty strings to null (except booleans/anamnesis/status)
      const skip = new Set([
        "anamnesis",
        "status",
        "lgpd_consent",
        "image_rights_consent",
        "terms_accepted",
        "has_medical_clearance",
        "current_degree",
      ]);
      Object.keys(payload).forEach((k) => {
        if (!skip.has(k) && payload[k] === "") payload[k] = null;
      });
      await saveFn({ data: payload });
      toast.success("Aluno salvo");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["dojo-students"] });
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir aluno? Esta ação apaga histórico de graduações e mensalidades.")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-students"] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Alunos</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <select
            className="border rounded px-2 bg-background"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="frozen">Trancados</option>
          </select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <UserPlus className="h-4 w-4 mr-1" /> Novo aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar" : "Novo"} aluno</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="flex w-full flex-wrap">
                  <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
                  <TabsTrigger value="endereco">Endereço</TabsTrigger>
                  <TabsTrigger value="contato">Contatos</TabsTrigger>
                  <TabsTrigger value="dojo">Dojo</TabsTrigger>
                  <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
                  <TabsTrigger value="foto">Foto</TabsTrigger>
                  <TabsTrigger value="consent">Consentimentos</TabsTrigger>
                </TabsList>

                {/* ============ DADOS PESSOAIS ============ */}
                <TabsContent value="dados" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Nome completo *" className="md:col-span-2">
                    <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  </Field>
                  <Field label="CPF *">
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
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
                    <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} />
                  </Field>
                  <Field label="Rua" className="md:col-span-4">
                    <Input value={form.street} onChange={(e) => set("street", e.target.value)} />
                  </Field>
                  <Field label="Número" className="md:col-span-1">
                    <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
                  </Field>
                  <Field label="Complemento" className="md:col-span-3">
                    <Input value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
                  </Field>
                  <Field label="Bairro" className="md:col-span-2">
                    <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
                  </Field>
                  <Field label="Cidade" className="md:col-span-4">
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </Field>
                  <Field label="UF" className="md:col-span-2">
                    <Input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={2} />
                  </Field>
                </TabsContent>

                {/* ============ CONTATOS ============ */}
                <TabsContent value="contato" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="E-mail">
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
                  </Field>
                  <div className="md:col-span-2 mt-2 text-sm font-semibold">Responsável legal (menores de 18 anos)</div>
                  <Field label="Nome do responsável">
                    <Input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
                  </Field>
                  <Field label="Telefone do responsável">
                    <Input value={form.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} />
                  </Field>
                  <div className="md:col-span-2 mt-2 text-sm font-semibold">Contato de emergência</div>
                  <Field label="Nome">
                    <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                  </Field>
                  <Field label="Telefone">
                    <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
                  </Field>
                  <Field label="Parentesco" className="md:col-span-2">
                    <Input value={form.emergency_contact_relationship} onChange={(e) => set("emergency_contact_relationship", e.target.value)} placeholder="Ex.: cônjuge, mãe, irmão" />
                  </Field>
                </TabsContent>

                {/* ============ DOJO ============ */}
                <TabsContent value="dojo" className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Unidade">
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
                  <Field label="Faixa atual">
                    <select
                      className="border rounded p-2 bg-background w-full"
                      value={form.current_belt_id ?? ""}
                      onChange={(e) => set("current_belt_id", e.target.value || null)}
                    >
                      <option value="">— Selecionar —</option>
                      {(belts.data ?? []).map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Grau">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={form.current_degree}
                      onChange={(e) => set("current_degree", e.target.value)}
                    />
                  </Field>
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
              </Tabs>

              <div className="mt-4 flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={onSave}>Salvar aluno</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded border">
        {filtered.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-3 border-b last:border-0 gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
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
                <div className="font-medium truncate">{s.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.belt?.name}
                  {s.current_degree ? ` · ${s.current_degree}º grau` : ""} · {s.unit?.name ?? "—"} · {s.email ?? s.phone ?? ""}
                </div>
              </div>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                s.status === "active" ? "bg-green-100 text-green-800" : "bg-muted"
              }`}
            >
              {s.status}
            </span>
            <Link to="/dojo/app/students/$id" params={{ id: s.id }}>
              <Button size="sm" variant="outline">Abrir</Button>
            </Link>
            <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(s.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno.</div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium">{label}</Label>
      {children}
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
    <label className="flex items-start gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}
