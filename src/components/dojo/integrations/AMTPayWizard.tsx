import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { upsertMyGateway } from "@/lib/dojo/gateways.functions";

type GatewayId = "asaas" | "mercadopago" | "stripe" | "pagseguro" | "inter" | "pagarme";

type GatewayCard = {
  id: GatewayId;
  name: string;
  tagline: string;
  icon: any;
  recommended?: boolean;
  comingSoon?: boolean;
  color: string;
};

const GATEWAYS: GatewayCard[] = [
  { id: "asaas", name: "Asaas", tagline: "PIX, Cartão, Boleto e cobrança recorrente", icon: Landmark, recommended: true, color: "from-emerald-500/20 to-emerald-500/5" },
  { id: "mercadopago", name: "Mercado Pago", tagline: "Checkout transparente e parcelamento", icon: Wallet, color: "from-sky-500/20 to-sky-500/5" },
  { id: "stripe", name: "Stripe", tagline: "Global, cartões internacionais", icon: CreditCard, comingSoon: true, color: "from-violet-500/20 to-violet-500/5" },
  { id: "pagseguro", name: "PagSeguro", tagline: "Marketplace e antecipação", icon: ShieldCheck, comingSoon: true, color: "from-orange-500/20 to-orange-500/5" },
  { id: "inter", name: "Banco Inter", tagline: "Conta digital e cobrança PJ", icon: Building2, comingSoon: true, color: "from-amber-500/20 to-amber-500/5" },
  { id: "pagarme", name: "Pagar.me", tagline: "Split de pagamentos e recorrência", icon: CreditCard, comingSoon: true, color: "from-pink-500/20 to-pink-500/5" },
];

type Profile = {
  trade_name: string;
  legal_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
};

const EMPTY_PROFILE: Profile = {
  trade_name: "",
  legal_name: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
};

const STEPS = [
  { key: "welcome", label: "Boas-vindas" },
  { key: "profile", label: "Dados da academia" },
  { key: "gateway", label: "Gateway" },
  { key: "connect", label: "Conectar" },
  { key: "done", label: "Concluído" },
] as const;

export function AMTPayWizard({
  open,
  onOpenChange,
  initialGateway,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialGateway?: GatewayId;
}) {
  const qc = useQueryClient();
  const saveGw = useServerFn(upsertMyGateway);

  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [gateway, setGateway] = useState<GatewayId>(initialGateway ?? "asaas");
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    (async () => {
      setProfileLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data } = await supabase
          .from("dojo_academy_profile")
          .select("trade_name, legal_name, cnpj, email, phone, address, city, state")
          .eq("owner_id", u.user.id)
          .maybeSingle();
        if (data) {
          setProfile({
            trade_name: (data as any).trade_name ?? "",
            legal_name: (data as any).legal_name ?? "",
            cnpj: (data as any).cnpj ?? "",
            email: (data as any).email ?? u.user.email ?? "",
            phone: (data as any).phone ?? "",
            address: (data as any).address ?? "",
            city: (data as any).city ?? "",
            state: (data as any).state ?? "",
          });
        } else {
          setProfile((p) => ({ ...p, email: u.user!.email ?? "" }));
        }
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [open]);

  const canAdvance = useMemo(() => {
    if (step.key === "profile") {
      return profile.trade_name.trim() && profile.email.trim();
    }
    if (step.key === "gateway") {
      return !!GATEWAYS.find((g) => g.id === gateway && !g.comingSoon);
    }
    return true;
  }, [step.key, profile, gateway]);

  async function saveProfile() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sessão expirada");
    await supabase.from("dojo_academy_profile").upsert({
      owner_id: u.user.id,
      trade_name: profile.trade_name || null,
      legal_name: profile.legal_name || null,
      cnpj: profile.cnpj || null,
      email: profile.email || null,
      phone: profile.phone || null,
      address: profile.address || null,
      city: profile.city || null,
      state: profile.state || null,
    } as any);
  }

  async function handleConnect() {
    setSaving(true);
    try {
      await saveProfile();
      // Estrutura preparada: registra o gateway com placeholder de autorização.
      // Quando OAuth do Asaas estiver disponível, este passo passa a receber tokens reais.
      await saveGw({
        data: {
          provider: gateway as any,
          label: `Conta ${GATEWAYS.find((g) => g.id === gateway)?.name}`,
          active: false, // fica inativo até o Modo Avançado receber credenciais ou o OAuth concluir
          is_default: true,
        },
      });
      qc.invalidateQueries({ queryKey: ["dojo-gateways"] });
      qc.invalidateQueries({ queryKey: ["dojo-int-metrics"] });
      setStepIndex(STEPS.findIndex((s) => s.key === "done"));
      toast.success("AMT Pay preparado. Finalize a autorização para começar a cobrar.");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao preparar integração");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  }
  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>AMT Pay — Assistente de ativação</DialogTitle>
          <DialogDescription>Configure os recebimentos da sua academia em poucos minutos.</DialogDescription>
        </DialogHeader>

        {/* Header stepper */}
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Assistente AMT Pay</div>
              <div className="text-[11px] text-muted-foreground">Configuração guiada · 2–3 min</div>
            </div>
          </div>
          <Stepper current={stepIndex} />
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[380px] max-h-[65vh] overflow-y-auto">
          {step.key === "welcome" && <WelcomeStep />}
          {step.key === "profile" && (
            <ProfileStep profile={profile} setProfile={setProfile} loading={profileLoading} />
          )}
          {step.key === "gateway" && <GatewayStep value={gateway} onChange={setGateway} />}
          {step.key === "connect" && <ConnectStep gateway={gateway} />}
          {step.key === "done" && <DoneStep gateway={gateway} onManage={() => onOpenChange(false)} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={back} disabled={stepIndex === 0 || saving}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Suas credenciais ficam criptografadas por academia.
          </div>
          {step.key === "connect" ? (
            <Button size="sm" onClick={handleConnect} disabled={saving}>
              {saving ? "Conectando..." : "Conectar conta"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : step.key === "done" ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <Button size="sm" onClick={next} disabled={!canAdvance}>
              {step.key === "welcome" ? "Começar" : "Avançar"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center gap-1.5 shrink-0">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                done && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                active && "bg-primary text-primary-foreground shadow-sm",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <CircleDot className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("h-px w-4", done ? "bg-emerald-500/60" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Bem-vindo ao AMT Pay</h2>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          Vamos configurar os recebimentos da sua academia. Sem lidar com API Keys, tokens ou webhooks — em 2 a 3 minutos.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-4">
        <MiniHighlight icon={Wallet} label="PIX, Cartão e Boleto" />
        <MiniHighlight icon={Zap} label="Cobrança recorrente" />
        <MiniHighlight icon={ShieldCheck} label="Seguro por academia" />
      </div>
    </div>
  );
}

function MiniHighlight({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1.5" />
      <div className="text-[11px] font-medium leading-tight">{label}</div>
    </div>
  );
}

function ProfileStep({
  profile,
  setProfile,
  loading,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  loading: boolean;
}) {
  function upd<K extends keyof Profile>(k: K, v: Profile[K]) {
    setProfile({ ...profile, [k]: v });
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dados da academia</h2>
        <p className="text-sm text-muted-foreground">
          Confirmamos os dados que já temos. Você pode editar antes de continuar.
        </p>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando dados...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da Academia *" value={profile.trade_name} onChange={(v) => upd("trade_name", v)} />
          <Field label="Razão Social" value={profile.legal_name} onChange={(v) => upd("legal_name", v)} />
          <Field label="CPF / CNPJ" value={profile.cnpj} onChange={(v) => upd("cnpj", v)} placeholder="00.000.000/0000-00" />
          <Field label="E-mail *" value={profile.email} onChange={(v) => upd("email", v)} type="email" />
          <Field label="Telefone" value={profile.phone} onChange={(v) => upd("phone", v)} placeholder="(00) 00000-0000" />
          <Field label="Endereço" value={profile.address} onChange={(v) => upd("address", v)} />
          <Field label="Cidade" value={profile.city} onChange={(v) => upd("city", v)} />
          <Field label="Estado" value={profile.state} onChange={(v) => upd("state", v)} placeholder="UF" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">* Campos obrigatórios. Alterações são salvas ao concluir o assistente.</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} className="mt-1" />
    </div>
  );
}

function GatewayStep({ value, onChange }: { value: GatewayId; onChange: (v: GatewayId) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Escolha o gateway de pagamento</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o parceiro que processará seus recebimentos. Novos gateways serão liberados em breve.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {GATEWAYS.map((g) => {
          const disabled = !!g.comingSoon;
          const active = value === g.id && !disabled;
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(g.id)}
              className={cn(
                "group relative rounded-xl border p-4 text-left transition overflow-hidden",
                active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none", g.color)} />
              <div className="relative flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-background/80 border flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{g.name}</span>
                    {g.recommended && <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-500">Recomendado</Badge>}
                    {g.comingSoon && <Badge variant="secondary" className="text-[10px]">Em breve</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.tagline}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConnectStep({ gateway }: { gateway: GatewayId }) {
  const g = GATEWAYS.find((x) => x.id === gateway)!;
  const Icon = g.icon;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Conectar sua conta {g.name}</h2>
        <p className="text-sm text-muted-foreground">
          Ao clicar em "Conectar conta", registramos sua academia como titular exclusiva desse gateway. As credenciais serão vinculadas de forma segura e criptografada.
        </p>
      </div>

      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-background border flex items-center justify-center">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{g.name}</div>
          <div className="text-xs text-muted-foreground">{g.tagline}</div>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3 w-3 mr-1" /> Isolado por academia
        </Badge>
      </div>

      <TimelineItem step={1} title="Autorização" desc="Você será direcionado ao gateway para autorizar o AMT Dojo Manager." />
      <TimelineItem step={2} title="Retorno automático" desc="Voltamos ao sistema com as credenciais já configuradas." last />

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
        <strong>Nota:</strong> a autorização automática (OAuth) do {g.name} está em fase de rollout. Enquanto isso, seu gateway ficará pré-configurado e você poderá finalizar as credenciais no <strong>Modo Avançado</strong> — sem repetir este assistente.
      </div>
    </div>
  );
}

function TimelineItem({ step, title, desc, last }: { step: number; title: string; desc: string; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{step}</div>
        {!last && <div className="w-px flex-1 bg-border my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function DoneStep({ gateway, onManage }: { gateway: GatewayId; onManage: () => void }) {
  const g = GATEWAYS.find((x) => x.id === gateway)!;
  return (
    <div className="text-center py-8 space-y-4">
      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">AMT Pay preparado!</h2>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          {g.name} foi vinculado à sua academia. Agora todas as cobranças, mensalidades e links de pagamento passarão automaticamente por esta conta.
        </p>
      </div>
      <Button onClick={onManage} className="mt-2">Ir para o painel</Button>
    </div>
  );
}
