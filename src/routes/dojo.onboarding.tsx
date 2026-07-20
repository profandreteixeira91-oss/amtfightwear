import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, XCircle, LogOut, ShieldCheck, Wallet, Percent, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { useCepLookup } from "@/hooks/useCepLookup";
import {
  getMyOnboardingState,
  saveOnboardingProfile,
  recordOnboardingDocument,
  removeOnboardingDocument,
  finishOnboarding,
  DOC_TYPES,
  type DocType,
} from "@/lib/dojo/onboarding.functions";
import { createMyAsaasSubaccount } from "@/lib/asaas/asaas.functions";

export const Route = createFileRoute("/dojo/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração inicial — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/dojo/auth" });
    return { user: data.user };
  },
  component: OnboardingPage,
});

type FormState = {
  responsibleName: string;
  email: string;
  whatsapp: string;
  phone: string;
  cnpj: string;
  birthDate: string;
  companyType: "" | "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
  legalName: string;
  tradeName: string;
  monthlyIncome: string;
  modalities: string;
  zip: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  pixKey: string;
  pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  acceptAmtPayTerms: boolean;
};

const empty: FormState = {
  responsibleName: "",
  email: "",
  whatsapp: "",
  phone: "",
  cnpj: "",
  birthDate: "",
  companyType: "",
  legalName: "",
  tradeName: "",
  monthlyIncome: "",
  modalities: "",
  zip: "",
  address: "",
  addressNumber: "",
  addressComplement: "",
  neighborhood: "",
  city: "",
  state: "",
  pixKey: "",
  pixKeyType: "CNPJ",
  acceptAmtPayTerms: false,
};

const DOC_LABELS: Record<DocType, string> = {
  identity_front: "RG/CNH (frente)",
  identity_back: "RG/CNH (verso)",
  cnpj_card: "Cartão CNPJ",
  address_proof: "Comprovante de endereço",
  social_contract: "Contrato social",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const getState = useServerFn(getMyOnboardingState);
  const saveProfile = useServerFn(saveOnboardingProfile);
  const recordDoc = useServerFn(recordOnboardingDocument);
  const removeDoc = useServerFn(removeOnboardingDocument);
  const finish = useServerFn(finishOnboarding);
  const createSubaccount = useServerFn(createMyAsaasSubaccount);
  const { lookup: lookupCep, loading: cepLoading } = useCepLookup();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const cnpjDigits = form.cnpj.replace(/\D/g, "");
  const isCpf = cnpjDigits.length === 11;
  const isCnpj = cnpjDigits.length === 14;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUid(data.user?.id ?? null);
      try {
        const state = await getState();
        if (state.completed) {
          navigate({ to: "/dojo/app" });
          return;
        }
        const p = state.profile ?? {};
        setForm((prev) => ({
          ...prev,
          responsibleName: String(p.responsible_name ?? "") || (data.user?.user_metadata?.full_name as string) || "",
          email: String(p.email ?? "") || data.user?.email || "",
          whatsapp: String(p.whatsapp ?? ""),
          phone: String(p.phone ?? ""),
          cnpj: String(p.cnpj ?? ""),
          birthDate: p.birth_date ? String(p.birth_date).slice(0, 10) : "",
          companyType: (p.company_type as FormState["companyType"]) ?? "",
          legalName: String(p.legal_name ?? ""),
          tradeName: String(p.trade_name ?? ""),
          monthlyIncome: p.monthly_income ? String(p.monthly_income) : "",
          modalities: Array.isArray((p as { modalities?: unknown }).modalities)
            ? ((p as { modalities?: string[] }).modalities ?? []).join(", ")
            : "",
          zip: String(p.zip ?? ""),
          address: String(p.address ?? ""),
          addressNumber: String(p.address_number ?? ""),
          addressComplement: String(p.address_complement ?? ""),
          neighborhood: String(p.neighborhood ?? ""),
          city: String(p.city ?? ""),
          state: String(p.state ?? ""),
          pixKey: String(p.pix_key ?? ""),
          pixKeyType: ((String(p.pix_key_type ?? "cnpj")).toUpperCase() as FormState["pixKeyType"]) || "CNPJ",
          acceptAmtPayTerms: !!p.accepted_amtpay_terms,
        }));
        const map: Record<string, string> = {};
        for (const d of state.documents) map[d.doc_type] = d.file_path;
        setDocs(map);
      } catch (e) {
        toast.error("Falha ao carregar", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCepBlur = async () => {
    const clean = form.zip.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const r = await lookupCep(clean);
    if (r) {
      setForm((prev) => ({
        ...prev,
        zip: clean,
        address: prev.address || r.address,
        neighborhood: prev.neighborhood || r.neighborhood,
        city: prev.city || r.city,
        state: prev.state || r.state,
      }));
    }
  };

  const handleUpload = async (docType: DocType, file: File) => {
    if (!uid) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo maior que 10 MB");
      return;
    }
    setUploadingDoc(docType);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${uid}/${docType}.${ext}`;
      // Remove qualquer versão anterior (mesmo com extensão diferente)
      if (docs[docType] && docs[docType] !== path) {
        await supabase.storage.from("dojo-documents").remove([docs[docType]]);
      }
      const { error } = await supabase.storage
        .from("dojo-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await recordDoc({
        data: {
          docType,
          filePath: path,
          mimeType: file.type || null,
          sizeBytes: file.size,
        },
      });
      setDocs((prev) => ({ ...prev, [docType]: path }));
      toast.success(`${DOC_LABELS[docType]} enviado`);
    } catch (e) {
      toast.error("Falha no upload", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveDoc = async (docType: DocType) => {
    try {
      await removeDoc({ data: { docType } });
      setDocs((prev) => {
        const n = { ...prev };
        delete n[docType];
        return n;
      });
      toast.success("Documento removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const requiredDocs = useMemo<DocType[]>(
    // Comprovante de endereço não é exigido pela API do Asaas — só é solicitado
    // via CUSTOM se o analista pedir; nesse caso, o AMT Pay mostra o pendente.
    () => (isCnpj ? ["identity_front", "identity_back", "cnpj_card"] : ["identity_front", "identity_back"]),
    [isCnpj],
  );

  const validate = (): string | null => {
    try {
      z.object({
        responsibleName: z.string().min(3),
        email: z.string().email(),
        whatsapp: z.string().min(10),
        cnpj: z.string().min(11),
        legalName: z.string().min(2),
        tradeName: z.string().min(2),
        monthlyIncome: z.string().refine((v) => Number(v) >= 1000, "Faturamento mínimo R$ 1.000"),
        modalities: z.string().min(2),
        zip: z.string().min(8),
        address: z.string().min(3),
        addressNumber: z.string().min(1),
        neighborhood: z.string().min(2),
        city: z.string().min(2),
        state: z.string().length(2),
        pixKey: z.string().min(3),
      }).parse(form);
      if (!form.acceptAmtPayTerms) return "Aceite os termos do AMT Pay.";
      if (!isCpf && !isCnpj) return "Informe um CPF ou CNPJ válido.";
      if (isCpf && !form.birthDate) return "Data de nascimento é obrigatória.";
      if (isCnpj && !form.companyType) return "Selecione o tipo de empresa.";
      for (const d of requiredDocs) {
        if (!docs[d]) return `Envie: ${DOC_LABELS[d]}`;
      }
      return null;
    } catch (e) {
      if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Preencha todos os campos.";
      return "Preencha todos os campos.";
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      await saveProfile({
        data: {
          responsibleName: form.responsibleName,
          email: form.email,
          whatsapp: form.whatsapp,
          phone: form.phone || null,
          cnpj: form.cnpj,
          birthDate: isCpf ? form.birthDate : null,
          companyType: isCnpj ? (form.companyType as "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION") : null,
          legalName: form.legalName,
          tradeName: form.tradeName,
          monthlyIncome: Number(form.monthlyIncome),
          modalities: form.modalities.split(",").map((m) => m.trim()).filter(Boolean),
          zip: form.zip,
          address: form.address,
          addressNumber: form.addressNumber,
          addressComplement: form.addressComplement || null,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          pixKey: form.pixKey,
          pixKeyType: form.pixKeyType,
          acceptAmtPayTerms: true,
        },
      });

      // Tenta ativar subconta Asaas (não bloqueia se falhar — dono pode ativar depois)
      try {
        await createSubaccount({ data: {} });
      } catch (e) {
        console.warn("[onboarding] Asaas subaccount:", e);
        toast.warning("AMT Pay pendente", {
          description: "Cadastro salvo. A subconta Asaas será revisada em breve.",
        });
      }

      await finish({});
      toast.success("Cadastro concluído! Bem-vindo ao Dojo Manager.");
      navigate({ to: "/dojo/app" });
    } catch (e) {
      toast.error("Falha ao concluir", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/dojo";
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#111]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <DojoLogo className="h-8 w-auto" />
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Configure seu dojo em uma etapa
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-black/60">
            Precisamos destes dados para liberar o sistema e ativar o AMT Pay (processamento de pagamentos via Asaas).
          </p>
        </div>

        <div className="space-y-6">
          {/* Responsável */}
          <Section title="Dados do responsável" description="Quem é o titular da conta no Asaas.">
            <Field label="Nome completo do responsável *">
              <Input value={form.responsibleName} onChange={(e) => set("responsibleName", e.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="E-mail *">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="WhatsApp *">
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="CPF ou CNPJ *">
                <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
              </Field>
              {isCpf && (
                <Field label="Data de nascimento *">
                  <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
                </Field>
              )}
              {isCnpj && (
                <Field label="Tipo de empresa *">
                  <Select value={form.companyType} onValueChange={(v) => set("companyType", v as FormState["companyType"])}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="LIMITED">LTDA / EIRELI</SelectItem>
                      <SelectItem value="INDIVIDUAL">Empresário Individual</SelectItem>
                      <SelectItem value="ASSOCIATION">Associação</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Telefone fixo (opcional)">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Comerciais */}
          <Section title="Dados da academia">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razão social / Nome *">
                <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
              </Field>
              <Field label="Nome fantasia *">
                <Input value={form.tradeName} onChange={(e) => set("tradeName", e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Faturamento mensal estimado (R$) *">
                <Input
                  type="number"
                  min={1000}
                  step={100}
                  value={form.monthlyIncome}
                  onChange={(e) => set("monthlyIncome", e.target.value)}
                  placeholder="Mínimo R$ 1.000"
                />
              </Field>
              <Field label="Modalidades atendidas *" hint="Separe por vírgula. Ex: Karatê, Muay Thai, Jiu-Jitsu">
                <Textarea
                  rows={2}
                  value={form.modalities}
                  onChange={(e) => set("modalities", e.target.value)}
                  placeholder="Karatê, Muay Thai, Jiu-Jitsu"
                />
              </Field>
            </div>
          </Section>

          {/* Endereço */}
          <Section title="Endereço da academia">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="CEP *">
                <div className="relative">
                  <Input
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-black/40" />
                  )}
                </div>
              </Field>
              <div className="md:col-span-3">
                <Field label="Logradouro *">
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Número *">
                <Input value={form.addressNumber} onChange={(e) => set("addressNumber", e.target.value)} />
              </Field>
              <Field label="Complemento">
                <Input value={form.addressComplement} onChange={(e) => set("addressComplement", e.target.value)} />
              </Field>
              <Field label="Bairro *">
                <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="Cidade *">
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </Field>
                </div>
                <Field label="UF *">
                  <Input maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
                </Field>
              </div>
            </div>
          </Section>

          {/* PIX */}
          <Section title="AMT Pay — recebimentos" description="Chave PIX usada para saques das suas mensalidades.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tipo de chave *">
                <Select value={form.pixKeyType} onValueChange={(v) => set("pixKeyType", v as FormState["pixKeyType"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="EVP">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Chave PIX *">
                  <Input value={form.pixKey} onChange={(e) => set("pixKey", e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          {/* Documentos */}
          <Section title="Documentos obrigatórios" description="Envie fotos ou PDFs legíveis (até 10 MB cada). Comprovante de endereço só é solicitado se a análise do Asaas pedir depois.">
            <div className="grid gap-3 md:grid-cols-2">
              {requiredDocs.map((docType) => {
                const isRequired = requiredDocs.includes(docType);
                const has = !!docs[docType];
                return (
                  <div
                    key={docType}
                    className={`rounded-xl border p-3 ${has ? "border-emerald-200 bg-emerald-50/40" : "border-black/10 bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {DOC_LABELS[docType]} {isRequired && <span className="text-[#C1121F]">*</span>}
                        </div>
                        <div className="text-[11px] text-black/50">
                          {has ? "Enviado" : "Nenhum arquivo enviado"}
                        </div>
                      </div>
                      {has ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(docType)}
                          className="rounded-md p-1 text-black/40 hover:bg-black/5 hover:text-[#C1121F]"
                          title="Remover"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-black/20" />
                      )}
                    </div>
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 py-2 text-xs font-medium text-black/60 hover:border-[#C1121F] hover:text-[#C1121F] transition-colors">
                      {uploadingDoc === docType ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {has ? "Substituir arquivo" : "Enviar arquivo"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(docType, f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Termos */}
          <Section title="Termos">
            <label className="flex items-start gap-3 text-sm text-black/70">
              <Checkbox
                checked={form.acceptAmtPayTerms}
                onCheckedChange={(v) => set("acceptAmtPayTerms", !!v)}
              />
              <span>
                Li e aceito os termos do AMT Pay, incluindo a criação automática de subconta no Asaas
                para processamento de pagamentos, com taxa administrativa da AMT de 5% sobre cada transação.
              </span>
            </label>
          </Section>

          <div className="sticky bottom-4 z-20 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="h-11 rounded-xl bg-[#C1121F] px-6 text-white shadow-lg shadow-[#C1121F]/20 hover:bg-[#a30f1a]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concluir cadastro e liberar sistema
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-xs text-black/50">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-black/70">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-black/40">{hint}</p>}
    </div>
  );
}
