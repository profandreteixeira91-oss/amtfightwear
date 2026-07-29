import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyStudent,
  updateMyProfile,
  getMyAnamnesis,
  updateMyAnamnesis,
  uploadMyPhoto,
  getMyConsents,
  updateMyConsents,
} from "@/lib/student/student.functions";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Camera, User, MapPin, HeartPulse, ShieldAlert, ChevronDown, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/_student/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — Portal do Aluno" }] }),
  component: ProfilePage,
});

const contactFields = [
  { name: "phone", label: "Telefone", type: "tel" },
  { name: "emergency_contact_name", label: "Contato de emergência" },
  { name: "emergency_contact_phone", label: "Telefone de emergência", type: "tel" },
  { name: "emergency_contact_relationship", label: "Parentesco" },
] as const;

const addressFields = [
  { name: "zip", label: "CEP" },
  { name: "street", label: "Rua" },
  { name: "address_number", label: "Número" },
  { name: "address_complement", label: "Complemento" },
  { name: "neighborhood", label: "Bairro" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF" },
] as const;

type AnamnesisForm = {
  medical_conditions: string;
  medications: string;
  allergies: string;
  surgeries: string;
  injuries: string;
  physical_activity_level: string;
  objectives: string;
  other: string;
  health_card_number: string;
  smoking: boolean;
  alcohol: boolean;
  heart_issues: boolean;
  diabetes: boolean;
  hypertension: boolean;
  asthma: boolean;
  pregnant: boolean;
};

type ConsentForm = {
  lgpd_consent: boolean;
  facial_recognition_consent: boolean;
  image_rights_consent: boolean;
  terms_accepted: boolean;
};

const emptyConsents: ConsentForm = {
  lgpd_consent: false,
  facial_recognition_consent: false,
  image_rights_consent: false,
  terms_accepted: false,
};

const consentItems: Array<[keyof ConsentForm, string]> = [
  ["lgpd_consent", "Autorizo o tratamento dos meus dados pessoais conforme a LGPD (Lei nº 13.709/2018) para fins de matrícula, controle acadêmico e comunicação da academia."],
  ["facial_recognition_consent", "Autorizo a coleta e processamento de biometria facial para identificação automática em check-ins por foto (Reconhecimento Facial)."],
  ["image_rights_consent", "Autorizo o uso da minha imagem em fotos e vídeos para divulgação da academia (redes sociais, site e materiais internos)."],
  ["terms_accepted", "Declaro estar ciente dos riscos inerentes à prática esportiva e aceito o regulamento interno e o termo de responsabilidade da academia."],
];

const emptyAnamn: AnamnesisForm = {
  medical_conditions: "",
  medications: "",
  allergies: "",
  surgeries: "",
  injuries: "",
  physical_activity_level: "",
  objectives: "",
  other: "",
  health_card_number: "",
  smoking: false,
  alcohol: false,
  heart_issues: false,
  diabetes: false,
  hypertension: false,
  asthma: false,
  pregnant: false,
};

function ProfilePage() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMyStudent);
  const upFn = useServerFn(updateMyProfile);
  const anamnFn = useServerFn(getMyAnamnesis);
  const upAnamnFn = useServerFn(updateMyAnamnesis);
  const uploadFn = useServerFn(uploadMyPhoto);
  const consentsFn = useServerFn(getMyConsents);
  const upConsentsFn = useServerFn(updateMyConsents);

  const { data: me } = useQuery({ queryKey: ["student", "me"], queryFn: () => meFn({}) });
  const { data: anamnesisRow } = useQuery({ queryKey: ["student", "anamnesis"], queryFn: () => anamnFn({}) });
  const { data: consentsRow } = useQuery({ queryKey: ["student", "consents"], queryFn: () => consentsFn({}) });

  const [form, setForm] = useState<Record<string, string>>({});
  const [anamn, setAnamn] = useState<AnamnesisForm>(emptyAnamn);
  const [healthInsurance, setHealthInsurance] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [consents, setConsents] = useState<ConsentForm>(emptyConsents);
  const [savingConsents, setSavingConsents] = useState(false);
  const [openSection, setOpenSection] = useState<"contact" | "address" | "health" | "consent" | null>("contact");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!me) return;
    const initial: Record<string, string> = {};
    [...contactFields, ...addressFields].forEach((f) => {
      initial[f.name] = ((me as unknown as Record<string, string | null>)[f.name] ?? "") as string;
    });
    setForm(initial);
  }, [me]);

  useEffect(() => {
    if (!anamnesisRow) return;
    const a = (anamnesisRow.anamnesis ?? {}) as Partial<AnamnesisForm>;
    setAnamn({ ...emptyAnamn, ...a });
    setHealthInsurance(anamnesisRow.health_insurance ?? "");
  }, [anamnesisRow]);

  useEffect(() => {
    if (!consentsRow) return;
    const c = consentsRow as Partial<Record<keyof ConsentForm, boolean | null>>;
    setConsents({
      lgpd_consent: Boolean(c.lgpd_consent),
      facial_recognition_consent: Boolean(c.facial_recognition_consent),
      image_rights_consent: Boolean(c.image_rights_consent),
      terms_accepted: Boolean(c.terms_accepted),
    });
  }, [consentsRow]);

  async function onSaveConsents(e: React.FormEvent) {
    e.preventDefault();
    setSavingConsents(true);
    try {
      await upConsentsFn({ data: consents });
      toast.success("Consentimentos atualizados");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (err) {
      toast.error("Falha ao salvar", { description: (err as Error).message });
    } finally {
      setSavingConsents(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await upFn({ data: form as never });
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (err) {
      toast.error("Falha ao salvar", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function onSaveHealth(e: React.FormEvent) {
    e.preventDefault();
    setSavingHealth(true);
    try {
      await upAnamnFn({ data: { anamnesis: anamn, health_insurance: healthInsurance || null } });
      toast.success("Ficha de saúde atualizada");
      qc.invalidateQueries({ queryKey: ["student", "anamnesis"] });
    } catch (err) {
      toast.error("Falha ao salvar", { description: (err as Error).message });
    } finally {
      setSavingHealth(false);
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem grande demais", { description: "Escolha uma foto de até 5 MB." });
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await uploadFn({ data: { data_url: dataUrl, content_type: file.type || "image/jpeg" } });
      toast.success("Foto atualizada!");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (err) {
      toast.error("Falha no upload", { description: (err as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold" style={{ color: "var(--sa-title)" }}>Meu perfil</h1>

      {/* Card cabeçalho com foto */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            {me?.photo_url ? (
              <img src={me.photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-neutral-100" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                <User className="h-7 w-7" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-white disabled:opacity-60"
              aria-label="Alterar foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={onPickPhoto}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold" style={{ color: "var(--sa-title)" }}>
              {me?.full_name ?? "—"}
            </div>
            <div className="truncate text-xs text-neutral-500">{me?.email}</div>
            {uploading && <div className="mt-1 text-[10px] text-red-600">Enviando foto…</div>}
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
          Nome, e-mail, CPF, faixa e professor são gerenciados pela sua academia.
        </p>
      </section>

      {/* Contato */}
      <Section
        icon={User}
        title="Contato e emergência"
        open={openSection === "contact"}
        onToggle={() => setOpenSection((s) => (s === "contact" ? null : "contact"))}
      >
        <form onSubmit={onSave} className="space-y-3">
          {contactFields.map((f) => (
            <Field key={f.name} label={f.label}>
              <input
                type={("type" in f && f.type) || "text"}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </Field>
          ))}
          <SaveButton loading={saving} label="Salvar contato" />
        </form>
      </Section>

      {/* Endereço */}
      <Section
        icon={MapPin}
        title="Endereço"
        open={openSection === "address"}
        onToggle={() => setOpenSection((s) => (s === "address" ? null : "address"))}
      >
        <form onSubmit={onSave} className="space-y-3">
          {addressFields.map((f) => (
            <Field key={f.name} label={f.label}>
              <input
                type="text"
                value={form[f.name] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </Field>
          ))}
          <SaveButton loading={saving} label="Salvar endereço" />
        </form>
      </Section>

      {/* Anamnese */}
      <Section
        icon={HeartPulse}
        title="Ficha de saúde (anamnese)"
        open={openSection === "health"}
        onToggle={() => setOpenSection((s) => (s === "health" ? null : "health"))}
      >
        <form onSubmit={onSaveHealth} className="space-y-3">
          <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <ShieldAlert className="mr-1 inline-block h-3.5 w-3.5 -translate-y-0.5" />
            Estas informações são confidenciais e ficam disponíveis apenas para a sua academia,
            para garantir a sua segurança durante os treinos.
          </div>

          <Field label="Plano de saúde">
            <input
              value={healthInsurance}
              onChange={(e) => setHealthInsurance(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </Field>
          <Field label="Nº da carteirinha">
            <input
              value={anamn.health_card_number}
              onChange={(e) => setAnamn((a) => ({ ...a, health_card_number: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </Field>

          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Condições de saúde
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["heart_issues", "Problemas cardíacos"],
                ["diabetes", "Diabetes"],
                ["hypertension", "Hipertensão"],
                ["asthma", "Asma"],
                ["pregnant", "Gestante"],
                ["smoking", "Fumante"],
                ["alcohol", "Consome álcool"],
              ] as Array<[keyof AnamnesisForm, string]>).map(([key, label]) => (
                <label key={String(key)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-neutral-200">
                  <input
                    type="checkbox"
                    checked={Boolean(anamn[key])}
                    onChange={(e) => setAnamn((a) => ({ ...a, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-red-600"
                  />
                  <span className="text-neutral-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Doenças / condições atuais">
            <TArea value={anamn.medical_conditions} onChange={(v) => setAnamn((a) => ({ ...a, medical_conditions: v }))} placeholder="Descreva doenças ou condições existentes" />
          </Field>
          <Field label="Medicamentos em uso">
            <TArea value={anamn.medications} onChange={(v) => setAnamn((a) => ({ ...a, medications: v }))} placeholder="Ex.: nome do remédio e dosagem" />
          </Field>
          <Field label="Alergias">
            <TArea value={anamn.allergies} onChange={(v) => setAnamn((a) => ({ ...a, allergies: v }))} placeholder="Medicamentos, alimentos, materiais…" />
          </Field>
          <Field label="Cirurgias anteriores">
            <TArea value={anamn.surgeries} onChange={(v) => setAnamn((a) => ({ ...a, surgeries: v }))} />
          </Field>
          <Field label="Lesões (atuais ou recentes)">
            <TArea value={anamn.injuries} onChange={(v) => setAnamn((a) => ({ ...a, injuries: v }))} />
          </Field>
          <Field label="Nível de atividade física">
            <select
              value={anamn.physical_activity_level}
              onChange={(e) => setAnamn((a) => ({ ...a, physical_activity_level: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Selecione…</option>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve (1–2x/semana)</option>
              <option value="moderado">Moderado (3–4x/semana)</option>
              <option value="alto">Alto (5+x/semana)</option>
              <option value="atleta">Atleta</option>
            </select>
          </Field>
          <Field label="Objetivo com o treino">
            <TArea value={anamn.objectives} onChange={(v) => setAnamn((a) => ({ ...a, objectives: v }))} placeholder="Ex.: condicionamento, competição, defesa pessoal…" />
          </Field>
          <Field label="Outras informações">
            <TArea value={anamn.other} onChange={(v) => setAnamn((a) => ({ ...a, other: v }))} />
          </Field>

          <SaveButton loading={savingHealth} label="Salvar ficha de saúde" />
        </form>
      </Section>

      {/* Consentimentos */}
      <Section
        icon={ShieldCheck}
        title="Consentimentos"
        open={openSection === "consent"}
        onToggle={() => setOpenSection((s) => (s === "consent" ? null : "consent"))}
      >
        <form onSubmit={onSaveConsents} className="space-y-3">
          {consentItems.map(([key, label]) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700 ring-1 ring-neutral-200"
            >
              <input
                type="checkbox"
                checked={consents[key]}
                onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="text-[11px] text-neutral-400">
            Os consentimentos são registrados com data e hora conforme exigido pela LGPD.
          </p>
          <SaveButton loading={savingConsents} label="Salvar consentimentos" />
        </form>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--sa-title)" }}>
          <Icon className="h-4 w-4 text-neutral-400" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-neutral-100 p-4">{children}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      {children}
    </div>
  );
}

function TArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
    />
  );
}

function SaveButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
      style={{ background: "var(--sa-primary, #dc2626)" }}
    >
      {loading ? "Salvando…" : label}
    </button>
  );
}
