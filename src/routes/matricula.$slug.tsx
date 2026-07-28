import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getPublicEnrollmentBundle,
  publicEnrollStudent,
  type PublicPlan,
} from "@/lib/dojo/public-enrollment.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { paymentMethodLabel } from "@/lib/dojo/payment-methods";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck, UserPlus, MapPin, CreditCard, ChevronRight, ChevronLeft } from "lucide-react";

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

export { PublicEnrollmentPage };

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

type Form = {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: string;
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
  lgpd_consent: boolean;
  terms_accepted: boolean;
  image_rights_consent: boolean;
};

const empty: Form = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  rg: "",
  birth_date: "",
  gender: "",
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
  lgpd_consent: false,
  terms_accepted: false,
  image_rights_consent: false,
};

function PublicEnrollmentPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const bundleFn = useServerFn(getPublicEnrollmentBundle);
  const enrollFn = useServerFn(publicEnrollStudent);

  const q = useQuery({
    queryKey: ["public-enrollment", slug],
    queryFn: () => bundleFn({ data: { slug } }),
    retry: false,
  });

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<Form>(empty);
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<string>("");
  const [includeFee, setIncludeFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const brand = q.data?.academy;
  const primary = brand?.brand_primary || "#b91c1c";
  const plans = q.data?.plans ?? [];
  const selectedPlan: PublicPlan | undefined = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  );

  const availableMethods = useMemo(() => {
    if (!selectedPlan) return [];
    const raw = Array.isArray(selectedPlan.payment_methods) ? selectedPlan.payment_methods : [];
    const enabled = raw.filter((m) => m && (m.enabled === true || m.enabled === undefined));
    return enabled.length > 0
      ? enabled.map((m) => String(m.code))
      : ["pix", "manual"];
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

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.full_name.trim() || form.full_name.trim().length < 2) return "Informe o nome completo.";
      if (!form.phone.trim()) return "Informe um telefone para contato.";
    }
    if (step === 3) {
      if (!planId) return "Selecione um plano.";
      if (!method) return "Selecione uma forma de pagamento.";
    }
    if (step === 4) {
      if (!form.lgpd_consent || !form.terms_accepted) return "É preciso aceitar os termos e o consentimento LGPD.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as any) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as any) : s));
  }

  async function submit() {
    const err = validateStep();
    if (err) { toast.error(err); return; }
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
          lgpd_consent: form.lgpd_consent,
          terms_accepted: form.terms_accepted,
          image_rights_consent: form.image_rights_consent,
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
      {/* Header com logo e nome do dojo */}
      <header
        className="w-full text-white"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, #1f0505 100%)`,
        }}
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
        <ol className="flex items-center gap-2 text-xs">
          {[
            { n: 1, label: "Dados", icon: UserPlus },
            { n: 2, label: "Endereço", icon: MapPin },
            { n: 3, label: "Plano", icon: CreditCard },
            { n: 4, label: "Confirmação", icon: ShieldCheck },
          ].map((s) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <li key={s.n} className="flex-1 flex items-center gap-2">
                <div
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
                </div>
                <span className={`hidden sm:inline ${active ? "font-medium" : "text-neutral-500"}`}>
                  {s.label}
                </span>
                {s.n < 4 && <div className="flex-1 h-px bg-neutral-200" />}
              </li>
            );
          })}
        </ol>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Card className="p-5 md:p-6 bg-white shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Seus dados</h2>
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
                  <Input value={form.gender} onChange={(e) => set("gender", e.target.value)} />
                </div>
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
              </div>
            </div>
          )}

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

          {step === 3 && (
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
                          <p className="font-semibold truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
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

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Confirmação</h2>
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Aluno:</span> <b>{form.full_name}</b></p>
                {form.email && <p><span className="text-muted-foreground">E-mail:</span> {form.email}</p>}
                {form.phone && <p><span className="text-muted-foreground">Telefone:</span> {form.phone}</p>}
                {selectedPlan && (
                  <>
                    <p><span className="text-muted-foreground">Plano:</span> {selectedPlan.name}</p>
                    <p><span className="text-muted-foreground">Pagamento:</span> {paymentMethodLabel(method)}</p>
                    <p><span className="text-muted-foreground">Primeira cobrança:</span> <b>{brl(totalPreview)}</b></p>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={form.lgpd_consent}
                    onCheckedChange={(v) => set("lgpd_consent", Boolean(v))}
                  />
                  <span>
                    Autorizo o tratamento dos meus dados pessoais para fins de matrícula, cobrança
                    e comunicação (LGPD).
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={form.terms_accepted}
                    onCheckedChange={(v) => set("terms_accepted", Boolean(v))}
                  />
                  <span>Li e aceito o regulamento da academia e as condições do plano escolhido.</span>
                </label>
                <label className="flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={form.image_rights_consent}
                    onCheckedChange={(v) => set("image_rights_consent", Boolean(v))}
                  />
                  <span>Autorizo o uso da minha imagem em fotos e vídeos da academia (opcional).</span>
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                Ao confirmar, você será redirecionado para a página de pagamento segura do dojo.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={back}
              disabled={step === 1 || submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={next}
                className="text-white"
                style={{ backgroundColor: primary }}
              >
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
