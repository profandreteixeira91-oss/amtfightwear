import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  getPublicEnrollmentBundle,
  publicEnrollStudent,
  publicUploadEnrollmentPhoto,
  type PublicPlan,
} from "@/lib/dojo/public-enrollment.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { paymentMethodLabel } from "@/lib/dojo/payment-methods";
import { degreeUnit } from "@/lib/dojo/degree-label";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  MapPin,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Phone,
  Swords,
  HeartPulse,
  Camera,
  Trash2,
  Plus,
  Upload,
  X,
} from "lucide-react";

export const Route = createFileRoute("/matricula/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Matrícula online — Dojo" },
      { name: "description", content: `Faça sua matrícula online no dojo ${params.slug}.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicEnrollmentPage,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const frequencyLabel: Record<string, string> = {
  monthly: "mês",
  bimonthly: "2 meses",
  quarterly: "trimestre",
  quadrimestral: "quadrimestre",
  semiannual: "semestre",
  annual: "ano",
  custom: "período",
};

type Anamnesis = {
  heart_issues?: boolean;
  hypertension?: boolean;
  diabetes?: boolean;
  asthma?: boolean;
  smoking?: boolean;
  alcohol?: boolean;
  pregnant?: boolean;
  medical_conditions?: string;
  medications?: string;
  allergies?: string;
  surgeries?: string;
  injuries?: string;
  physical_activity_level?: string;
  objectives?: string;
  other?: string;
};

type ModalityRow = { modality: string; belt_id: string; degree: number };

type Form = {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: string;
  nationality: string;
  marital_status: string;
  profession: string;
  blood_type: string;
  health_insurance: string;
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
  unit_id: string;
  modalities: ModalityRow[];
  anamnesis: Anamnesis;
  has_medical_clearance: boolean;
  medical_clearance_date: string;
  photo_url: string;
  lgpd_consent: boolean;
  terms_accepted: boolean;
  image_rights_consent: boolean;
  facial_recognition_consent: boolean;
};

const empty: Form = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  rg: "",
  birth_date: "",
  gender: "",
  nationality: "",
  marital_status: "",
  profession: "",
  blood_type: "",
  health_insurance: "",
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
  unit_id: "",
  modalities: [],
  anamnesis: {},
  has_medical_clearance: false,
  medical_clearance_date: "",
  photo_url: "",
  lgpd_consent: false,
  terms_accepted: false,
  image_rights_consent: false,
  facial_recognition_consent: false,
};

const STEPS = [
  { n: 1, label: "Dados", icon: UserPlus },
  { n: 2, label: "Endereço", icon: MapPin },
  { n: 3, label: "Contatos", icon: Phone },
  { n: 4, label: "Dojo", icon: Swords },
  { n: 5, label: "Plano", icon: CreditCard },
  { n: 6, label: "Anamnese", icon: HeartPulse },
  { n: 7, label: "Foto", icon: Camera },
  { n: 8, label: "Confirmação", icon: ShieldCheck },
] as const;

const LAST_STEP = 8;

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
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span>{label}</span>
    </label>
  );
}

export function PublicEnrollmentPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const bundleFn = useServerFn(getPublicEnrollmentBundle);
  const enrollFn = useServerFn(publicEnrollStudent);
  const uploadPhotoFn = useServerFn(publicUploadEnrollmentPhoto);

  const q = useQuery({
    queryKey: ["public-enrollment", slug],
    queryFn: () => bundleFn({ data: { slug } }),
    retry: false,
  });

  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<Form>(empty);
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<string>("");
  const [includeFee, setIncludeFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAnamn = (k: keyof Anamnesis, v: any) =>
    setForm((f) => ({ ...f, anamnesis: { ...f.anamnesis, [k]: v } }));

  const brand = q.data?.academy;
  const primary = brand?.brand_primary || "#b91c1c";
  const plans = q.data?.plans ?? [];
  const units = q.data?.units ?? [];
  const belts = q.data?.belts ?? [];

  const modalitiesAvail = useMemo(
    () => Array.from(new Set(belts.map((b) => b.modality).filter(Boolean))) as string[],
    [belts],
  );

  const selectedPlan: PublicPlan | undefined = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  );

  const availableMethods = useMemo(() => {
    if (!selectedPlan) return [];
    const raw = Array.isArray(selectedPlan.payment_methods) ? selectedPlan.payment_methods : [];
    const enabled = raw.filter((m) => m && (m.enabled === true || m.enabled === undefined));
    return enabled.length > 0 ? enabled.map((m) => String(m.code)) : ["pix", "manual"];
  }, [selectedPlan]);

  async function lookupCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j && !j.erro) {
        setForm((f) => ({
          ...f,
          street: j.logradouro || f.street,
          neighborhood: j.bairro || f.neighborhood,
          city: j.localidade || f.city,
          state: (j.uf || f.state || "").slice(0, 2),
        }));
      }
    } catch {}
  }

  async function handlePhotoFile(file: File) {
    if (file.size > 3_000_000) {
      toast.error("Imagem muito grande (máx. 3MB)");
      return;
    }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        fr.readAsDataURL(file);
      });
      const res = await uploadPhotoFn({ data: { slug, data_url: dataUrl } });
      set("photo_url", res.url);
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload da foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function validateStep(s = step): string | null {
    if (s === 1) {
      if (!form.full_name.trim() || form.full_name.trim().length < 2) return "Informe o nome completo.";
      if (!form.phone.trim()) return "Informe um telefone para contato.";
    }
    if (s === 4) {
      const incomplete = form.modalities.some((m) => !m.modality || !m.belt_id);
      if (incomplete) return "Complete a modalidade e a faixa de cada linha, ou remova a linha.";
    }
    if (s === 5) {
      if (!planId) return "Selecione um plano.";
      if (!method) return "Selecione uma forma de pagamento.";
    }
    if (s === 6) {
      if (form.has_medical_clearance && !form.medical_clearance_date)
        return "Informe a data da liberação médica.";
    }
    if (s === LAST_STEP) {
      if (!form.lgpd_consent || !form.terms_accepted)
        return "É preciso aceitar os termos e o consentimento LGPD.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(LAST_STEP, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    for (let s = 1; s <= LAST_STEP; s++) {
      const err = validateStep(s);
      if (err) {
        toast.error(err);
        setStep(s);
        return;
      }
    }
    if (!planId) return;
    setSubmitting(true);
    try {
      const res = await enrollFn({
        data: {
          slug,
          plan_id: planId,
          payment_method: method || "manual",
          include_enrollment_fee: includeFee,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          cpf: form.cpf,
          rg: form.rg,
          birth_date: form.birth_date,
          gender: form.gender,
          nationality: form.nationality,
          marital_status: form.marital_status,
          profession: form.profession,
          blood_type: form.blood_type,
          health_insurance: form.health_insurance,
          zip: form.zip,
          street: form.street,
          address_number: form.address_number,
          address_complement: form.address_complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          guardian_name: form.guardian_name,
          guardian_phone: form.guardian_phone,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          emergency_contact_relationship: form.emergency_contact_relationship,
          unit_id: form.unit_id || null,
          modalities: form.modalities
            .filter((m) => m.modality && m.belt_id)
            .map((m) => ({ modality: m.modality, belt_id: m.belt_id, degree: m.degree ?? 0 })),
          anamnesis: form.anamnesis,
          has_medical_clearance: form.has_medical_clearance,
          medical_clearance_date: form.medical_clearance_date,
          photo_url: form.photo_url,
          lgpd_consent: form.lgpd_consent,
          terms_accepted: form.terms_accepted,
          image_rights_consent: form.image_rights_consent,
          facial_recognition_consent: form.facial_recognition_consent,
        },
      });
      toast.success("Matrícula concluída! Redirecionando para o pagamento...");
      navigate({ to: "/pay/$invoiceId", params: { invoiceId: res.invoice_id } });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao concluir matrícula.");
    } finally {
      setSubmitting(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (q.isError || !brand) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-50 p-6">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-lg font-semibold">Dojo não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O link de matrícula que você usou é inválido ou o dojo desativou a página pública.
          </p>
        </Card>
      </div>
    );
  }

  const totalPreview = selectedPlan
    ? Number(selectedPlan.amount ?? 0) + (includeFee ? Number(selectedPlan.enrollment_fee ?? 0) : 0)
    : 0;

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header
        className="w-full text-white"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, #1f0505 100%)` }}
      >
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-4">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.trade_name ?? "Dojo"}
              className="h-14 w-14 rounded-xl object-cover bg-white/10 ring-1 ring-white/20"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-bold text-xl">
              {(brand.trade_name?.[0] || "D").toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider opacity-80">Matrícula online</p>
            <h1 className="text-xl md:text-2xl font-semibold leading-tight truncate">
              {brand.trade_name || brand.legal_name || "Dojo"}
            </h1>
            {(brand.city || brand.state) && (
              <p className="text-xs opacity-80 mt-0.5">
                {[brand.city, brand.state].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <ol className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <li key={s.n} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => { if (s.n < step) setStep(s.n); }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                    done
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : active
                      ? "text-white border-transparent"
                      : "bg-white text-neutral-500 border-neutral-200"
                  }`}
                  style={active ? { backgroundColor: primary } : undefined}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                <span className={`hidden md:inline ${active ? "font-medium" : "text-neutral-500"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="w-4 md:w-6 h-px bg-neutral-200" />}
              </li>
            );
          })}
        </ol>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Card className="p-5 md:p-6 bg-white shadow-sm">
          {/* ============ 1. DADOS ============ */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Dados pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp *</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
                </div>
                <div>
                  <Label>RG</Label>
                  <Input value={form.rg} onChange={(e) => set("rg", e.target.value)} />
                </div>
                <div>
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
                </div>
                <div>
                  <Label>Gênero</Label>
                  <select
                    className="border rounded p-2 bg-background w-full h-9 text-sm"
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <Label>Nacionalidade</Label>
                  <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Brasileira" />
                </div>
                <div>
                  <Label>Estado civil</Label>
                  <select
                    className="border rounded p-2 bg-background w-full h-9 text-sm"
                    value={form.marital_status}
                    onChange={(e) => set("marital_status", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="solteiro">Solteiro(a)</option>
                    <option value="casado">Casado(a)</option>
                    <option value="divorciado">Divorciado(a)</option>
                    <option value="viuvo">Viúvo(a)</option>
                    <option value="uniao_estavel">União estável</option>
                  </select>
                </div>
                <div>
                  <Label>Profissão</Label>
                  <Input value={form.profession} onChange={(e) => set("profession", e.target.value)} />
                </div>
                <div>
                  <Label>Tipo sanguíneo</Label>
                  <select
                    className="border rounded p-2 bg-background w-full h-9 text-sm"
                    value={form.blood_type}
                    onChange={(e) => set("blood_type", e.target.value)}
                  >
                    <option value="">—</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Plano de saúde</Label>
                  <Input value={form.health_insurance} onChange={(e) => set("health_insurance", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ============ 2. ENDEREÇO ============ */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Endereço</h2>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <Label>CEP</Label>
                  <Input
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    onBlur={(e) => lookupCep(e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <div className="md:col-span-4">
                  <Label>Rua</Label>
                  <Input value={form.street} onChange={(e) => set("street", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Número</Label>
                  <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
                </div>
                <div className="md:col-span-4">
                  <Label>Complemento</Label>
                  <Input value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <Label>UF</Label>
                  <Input maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>
          )}

          {/* ============ 3. CONTATOS ============ */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Contatos e responsável</h2>
              <p className="text-xs text-muted-foreground">
                Para menores de idade, o preenchimento dos dados do responsável é obrigatório.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do responsável (menores)</Label>
                  <Input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
                </div>
                <div>
                  <Label>Telefone do responsável</Label>
                  <Input value={form.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} />
                </div>
                <div>
                  <Label>Contato de emergência</Label>
                  <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                </div>
                <div>
                  <Label>Telefone de emergência</Label>
                  <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Parentesco / relação</Label>
                  <Input
                    value={form.emergency_contact_relationship}
                    onChange={(e) => set("emergency_contact_relationship", e.target.value)}
                    placeholder="Ex.: mãe, cônjuge, irmão"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============ 4. DOJO ============ */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Unidade e graduação</h2>
              {units.length > 0 && (
                <div className="max-w-sm">
                  <Label>Unidade onde vai treinar</Label>
                  <select
                    className="border rounded p-2 bg-background w-full h-9 text-sm"
                    value={form.unit_id}
                    onChange={(e) => set("unit_id", e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Modalidades e faixas atuais</p>
                    <p className="text-xs text-muted-foreground">
                      Se você já treina, informe sua graduação. Iniciantes podem deixar em branco.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={belts.length === 0}
                    onClick={() =>
                      set("modalities", [
                        ...form.modalities,
                        {
                          modality: form.modalities[0]?.modality ?? modalitiesAvail[0] ?? "jiu-jitsu",
                          belt_id: "",
                          degree: 0,
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {belts.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    A academia ainda não cadastrou faixas — sua graduação será definida na recepção.
                  </p>
                )}

                {belts.length > 0 && form.modalities.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Nenhuma modalidade informada (aluno iniciante).
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  {form.modalities.map((m, idx) => {
                    const beltsOfMod = belts.filter((b) => b.modality === m.modality);
                    const selectedBelt = belts.find((b) => b.id === m.belt_id);
                    const maxDeg = selectedBelt?.max_degrees ?? 10;
                    const update = (patch: Partial<ModalityRow>) => {
                      const nextRows = form.modalities.slice();
                      nextRows[idx] = { ...nextRows[idx], ...patch };
                      set("modalities", nextRows);
                    };
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-lg border p-3">
                        <div className="md:col-span-4">
                          <Label className="text-xs">Modalidade</Label>
                          <select
                            className="border rounded p-2 bg-background w-full h-9 text-sm"
                            value={m.modality}
                            onChange={(e) => update({ modality: e.target.value, belt_id: "" })}
                          >
                            {modalitiesAvail.map((mod) => (
                              <option key={mod} value={mod}>{mod}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-5">
                          <Label className="text-xs">Faixa</Label>
                          <select
                            className="border rounded p-2 bg-background w-full h-9 text-sm"
                            value={m.belt_id}
                            onChange={(e) => update({ belt_id: e.target.value })}
                          >
                            <option value="">Selecione…</option>
                            {beltsOfMod.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">{degreeUnit(m.modality)}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={maxDeg}
                            value={m.degree}
                            onChange={(e) => update({ degree: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </div>
                        <div className="md:col-span-1 flex md:justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => set("modalities", form.modalities.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {idx === 0 && form.modalities.length > 1 && (
                          <p className="md:col-span-12 text-[11px] text-muted-foreground">
                            A primeira modalidade será usada como graduação principal do perfil.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============ 5. PLANO ============ */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Escolha seu plano</h2>
              {plans.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum plano ativo no momento. Fale com a academia.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plans.map((p) => {
                  const active = p.id === planId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPlanId(p.id); setMethod(""); }}
                      className={`text-left rounded-xl border p-4 transition ${
                        active
                          ? "border-transparent ring-2 shadow-sm"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                      style={active ? { boxShadow: `0 0 0 2px ${primary}` } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold break-words">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold" style={{ color: primary }}>{brl(p.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            por {frequencyLabel[p.frequency || "monthly"] || "mês"}
                          </p>
                        </div>
                      </div>
                      {p.enrollment_fee ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Taxa de matrícula: {brl(Number(p.enrollment_fee))}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedPlan && (
                <>
                  {Number(selectedPlan.enrollment_fee ?? 0) > 0 && (
                    <label className="flex items-center gap-2 text-sm mt-2">
                      <Checkbox checked={includeFee} onCheckedChange={(v) => setIncludeFee(Boolean(v))} />
                      <span>
                        Incluir taxa de matrícula ({brl(Number(selectedPlan.enrollment_fee))}) na primeira cobrança
                      </span>
                    </label>
                  )}

                  <div className="mt-4">
                    <Label>Forma de pagamento *</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableMethods.map((code) => {
                        const active = method === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setMethod(code)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition ${
                              active
                                ? "text-white border-transparent"
                                : "bg-white border-neutral-200 hover:border-neutral-300"
                            }`}
                            style={active ? { backgroundColor: primary } : undefined}
                          >
                            {paymentMethodLabel(code)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-neutral-50 border p-3 text-sm flex items-center justify-between">
                    <span>Total da primeira cobrança</span>
                    <span className="font-semibold text-base" style={{ color: primary }}>
                      {brl(totalPreview)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============ 6. ANAMNESE ============ */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Ficha de anamnese</h2>
              <p className="text-xs text-muted-foreground">
                Informações essenciais para a prescrição segura da prática.
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
                <div className="md:col-span-2">
                  <Label>Doenças / condições diagnosticadas</Label>
                  <Textarea rows={2} value={form.anamnesis.medical_conditions ?? ""} onChange={(e) => setAnamn("medical_conditions", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Medicamentos em uso</Label>
                  <Textarea rows={2} value={form.anamnesis.medications ?? ""} onChange={(e) => setAnamn("medications", e.target.value)} />
                </div>
                <div>
                  <Label>Alergias</Label>
                  <Textarea rows={2} value={form.anamnesis.allergies ?? ""} onChange={(e) => setAnamn("allergies", e.target.value)} />
                </div>
                <div>
                  <Label>Cirurgias anteriores</Label>
                  <Textarea rows={2} value={form.anamnesis.surgeries ?? ""} onChange={(e) => setAnamn("surgeries", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Lesões / dores atuais</Label>
                  <Textarea rows={2} value={form.anamnesis.injuries ?? ""} onChange={(e) => setAnamn("injuries", e.target.value)} />
                </div>
                <div>
                  <Label>Nível de atividade física</Label>
                  <select
                    className="border rounded p-2 bg-background w-full h-9 text-sm"
                    value={form.anamnesis.physical_activity_level ?? ""}
                    onChange={(e) => setAnamn("physical_activity_level", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="sedentario">Sedentário</option>
                    <option value="leve">Leve (1-2x/semana)</option>
                    <option value="moderado">Moderado (3-4x/semana)</option>
                    <option value="intenso">Intenso (5+x/semana)</option>
                  </select>
                </div>
                <div>
                  <Label>Objetivos com a prática</Label>
                  <Input
                    value={form.anamnesis.objectives ?? ""}
                    onChange={(e) => setAnamn("objectives", e.target.value)}
                    placeholder="Ex.: saúde, competição, defesa pessoal"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Outras observações</Label>
                  <Textarea rows={2} value={form.anamnesis.other ?? ""} onChange={(e) => setAnamn("other", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 border-t pt-3">
                <BoolChk
                  label="Possuo liberação médica para atividade física"
                  checked={form.has_medical_clearance}
                  onChange={(v) => set("has_medical_clearance", v)}
                />
                <div>
                  <Label>Data da liberação</Label>
                  <Input
                    type="date"
                    value={form.medical_clearance_date}
                    onChange={(e) => set("medical_clearance_date", e.target.value)}
                    disabled={!form.has_medical_clearance}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============ 7. FOTO ============ */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Foto do aluno</h2>
              <p className="text-xs text-muted-foreground">
                A foto é usada no seu perfil e no check-in por reconhecimento facial (opcional).
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="h-32 w-32 rounded-xl border bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Foto do aluno" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-neutral-400" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handlePhotoFile(f);
                    }}
                  />
                  <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Enviar foto</>
                    )}
                  </Button>
                  {form.photo_url && (
                    <Button type="button" variant="ghost" onClick={() => set("photo_url", "")}>
                      <X className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ 8. CONFIRMAÇÃO ============ */}
          {step === LAST_STEP && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Confirmação</h2>
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Aluno:</span> <b>{form.full_name}</b></p>
                {form.email && <p><span className="text-muted-foreground">E-mail:</span> {form.email}</p>}
                {form.phone && <p><span className="text-muted-foreground">Telefone:</span> {form.phone}</p>}
                {form.unit_id && (
                  <p>
                    <span className="text-muted-foreground">Unidade:</span>{" "}
                    {units.find((u) => u.id === form.unit_id)?.name}
                  </p>
                )}
                {form.modalities.filter((m) => m.belt_id).length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Graduação:</span>{" "}
                    {form.modalities
                      .filter((m) => m.belt_id)
                      .map((m) => `${belts.find((b) => b.id === m.belt_id)?.name ?? ""} (${m.modality})`)
                      .join(" · ")}
                  </p>
                )}
                {selectedPlan && (
                  <>
                    <p><span className="text-muted-foreground">Plano:</span> {selectedPlan.name}</p>
                    <p><span className="text-muted-foreground">Pagamento:</span> {paymentMethodLabel(method)}</p>
                    <p><span className="text-muted-foreground">Primeira cobrança:</span> <b>{brl(totalPreview)}</b></p>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
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
              </div>

              <p className="text-xs text-muted-foreground">
                Os consentimentos são registrados com data e hora conforme exigido pela LGPD.
                Ao confirmar, você será redirecionado para a página de pagamento segura do dojo.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={back} disabled={step === 1 || submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {step < LAST_STEP ? (
              <Button type="button" onClick={next} className="text-white" style={{ backgroundColor: primary }}>
                Continuar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="text-white"
                style={{ backgroundColor: primary }}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Concluindo...</>
                ) : (
                  <>Concluir e pagar <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by AMT Dojo Manager
        </p>
      </main>
    </div>
  );
}
