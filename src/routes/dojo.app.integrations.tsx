import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plug, CheckCircle2, XCircle, AlertTriangle, Activity, Zap, Copy, KeyRound, Webhook, Sparkles, ChevronDown, ChevronUp, ShieldCheck, Wallet, Settings2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  type IntegrationCategory,
  type IntegrationDef,
} from "@/lib/dojo/integrations-catalog";
import { IntegrationCard, type LiveStatus } from "@/components/dojo/integrations/IntegrationCard";
import { IntegrationWizard } from "@/components/dojo/integrations/IntegrationWizard";
import { ApiHubDialog } from "@/components/dojo/integrations/ApiHubDialog";
import { AMTPayWizard } from "@/components/dojo/integrations/AMTPayWizard";
import { GatewayAccountsPanel } from "@/components/dojo/integrations/GatewayAccountsPanel";

import { listMyGateways, upsertMyGateway } from "@/lib/dojo/gateways.functions";
import { listPartnerIntegrations, savePartnerIntegration, listPartnerCheckins } from "@/lib/dojo/attendance.functions";
import { testIntegrationConnection, getIntegrationsMetrics, getMyOwnerId } from "@/lib/dojo/integrations.functions";
import { autoProvisionApiSuite } from "@/lib/dojo/apis.functions";

export const Route = createFileRoute("/dojo/app/integrations")({
  head: () => ({ meta: [{ title: "AMT Pay — Central financeira" }] }),
  component: IntegrationsHub,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

type CatFilter = "all" | IntegrationCategory;

function IntegrationsHub() {
  const qc = useQueryClient();
  const listGw = useServerFn(listMyGateways);
  const saveGw = useServerFn(upsertMyGateway);
  const listPartners = useServerFn(listPartnerIntegrations);
  const savePartner = useServerFn(savePartnerIntegration);
  const listLogs = useServerFn(listPartnerCheckins);
  const test = useServerFn(testIntegrationConnection);
  const metricsFn = useServerFn(getIntegrationsMetrics);

  const gwQ = useQuery({ queryKey: ["dojo-gateways"], queryFn: () => listGw() });
  const partnersQ = useQuery({ queryKey: ["dojo-partners"], queryFn: () => listPartners() });
  const logsQ = useQuery({ queryKey: ["dojo-partner-logs"], queryFn: () => listLogs({ data: {} }) });
  const metricsQ = useQuery({ queryKey: ["dojo-int-metrics"], queryFn: () => metricsFn() });

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatFilter>("all");
  const [wizardFor, setWizardFor] = useState<IntegrationDef | null>(null);
  const [apiHubMode, setApiHubMode] = useState<"keys" | "webhooks" | null>(null);
  const [amtPayOpen, setAmtPayOpen] = useState(false);
  const [amtPayProvider, setAmtPayProvider] = useState<"asaas" | "mercadopago" | undefined>(undefined);
  const [advancedOpen, setAdvancedOpen] = useState(false);


  const gwByProvider = useMemo(() => {
    const m = new Map<string, any>();
    for (const g of gwQ.data ?? []) m.set(g.provider, g);
    return m;
  }, [gwQ.data]);

  const partnerByProvider = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of partnersQ.data ?? []) m.set(p.provider, p);
    return m;
  }, [partnersQ.data]);

  function statusFor(def: IntegrationDef): LiveStatus {
    if (def.defaultStatus === "coming_soon") return "coming_soon";
    if (def.backend === "payments-gateway" && def.backendKey) {
      const row = gwByProvider.get(def.backendKey);
      if (!row) return "available";
      return row.active ? "connected" : "inactive";
    }
    if (def.backend === "partner" && def.backendKey) {
      const row = partnerByProvider.get(def.backendKey);
      if (!row) return "available";
      return row.enabled ? "connected" : "inactive";
    }
    if (def.backend === "apis") return "connected";
    return "available";
  }

  const filtered = useMemo(() => {
    return INTEGRATIONS.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        i.vendor.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    });
  }, [cat, query]);

  async function handleSubmit(def: IntegrationDef, values: Record<string, string>) {
    if (def.backend === "payments-gateway" && def.backendKey) {
      await saveGw({
        data: {
          provider: def.backendKey as any,
          access_token: values.access_token || undefined,
          public_key: values.public_key || undefined,
          webhook_secret: values.webhook_secret || undefined,
          active: true,
        },
      });
      qc.invalidateQueries({ queryKey: ["dojo-gateways"] });
    } else if (def.backend === "partner" && def.backendKey) {
      await savePartner({
        data: {
          provider: def.backendKey as any,
          enabled: true,
          apiKeyHint: values.api_key_hint || null,
          webhookSecret: values.webhook_secret || null,
          unitId: null,
        },
      });
      qc.invalidateQueries({ queryKey: ["dojo-partners"] });
    } else {
      toast.info("Integração em preparação. Estrutura salva.");
    }
    qc.invalidateQueries({ queryKey: ["dojo-int-metrics"] });
  }

  async function handleQuickTest(def: IntegrationDef) {
    try {
      const r = await test({ data: { integrationId: def.id } });
      if (r.ok) toast.success(`${def.name}: ${r.message}${r.latencyMs ? ` (${r.latencyMs}ms)` : ""}`);
      else toast.error(`${def.name}: ${r.message}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const m = metricsQ.data ?? { installed: 0, active: 0, inactive: 0, errors24h: 0, calls24h: 0, lastSyncAt: null };

  const paymentGw = useMemo(() => {
    const list = gwQ.data ?? [];
    return list.find((g: any) => g.is_default) ?? list.find((g: any) => g.active) ?? list[0] ?? null;
  }, [gwQ.data]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">AMT Pay</h1>
            <Badge variant="outline" className="text-[10px]">Central financeira</Badge>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Configure sua forma de recebimento para começar a emitir cobranças automaticamente. Todas as mensalidades da sua academia são processadas pelo gateway conectado aqui.
          </p>
        </div>
      </div>

      {/* ================= AMT PAY — Fluxo principal ================= */}
      <PaymentsHero
        gateway={paymentGw}
        onActivate={() => { setAmtPayProvider(undefined); setAmtPayOpen(true); }}
        onManage={() => setAdvancedOpen(true)}
      />

      {/* Painel de contas conectadas + histórico */}
      <GatewayAccountsPanel
        onConnect={() => { setAmtPayProvider(undefined); setAmtPayOpen(true); }}
        onReconfigure={(prov) => {
          setAmtPayProvider(prov as any);
          setAmtPayOpen(true);
        }}
      />


      {/* ================= Modo avançado (colapsado) ================= */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:border-primary/40 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              Configuração avançada
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">Técnico</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              API Keys, tokens, webhooks e catálogo completo de parceiros. Recomendado apenas para equipes de TI.
            </div>
          </div>
        </div>
        {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!advancedOpen ? null : (
      <>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, fornecedor ou categoria..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>



      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Plug} label="Instaladas" value={m.installed} tone="default" />
        <Kpi icon={CheckCircle2} label="Ativas" value={m.active} tone="success" />
        <Kpi icon={XCircle} label="Inativas" value={m.inactive} tone="muted" />
        <Kpi icon={AlertTriangle} label="Erros 24h" value={m.errors24h} tone={m.errors24h > 0 ? "danger" : "muted"} />
        <Kpi icon={Activity} label="Chamadas 24h" value={m.calls24h} tone="default" />
        <Kpi icon={Zap} label="Última sync" value={m.lastSyncAt ? relativeTime(m.lastSyncAt) : "—"} tone="default" small />
      </div>

      {/* Menu superior deslizante de categorias */}
      <div className="-mx-2 px-2 sticky top-14 z-20 bg-background/80 backdrop-blur-md border-b">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-thin snap-x">
          <CatChip active={cat === "all"} label="Todas" count={INTEGRATIONS.length} onClick={() => setCat("all")} />
          {INTEGRATION_CATEGORIES.map((c) => (
            <CatChip
              key={c.id}
              active={cat === c.id}
              label={c.label}
              count={INTEGRATIONS.filter((i) => i.category === c.id).length}
              onClick={() => setCat(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Grid de integrações */}
      <div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhuma integração corresponde à sua busca.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((def) => (
              <IntegrationCard
                key={def.id}
                integration={def}
                status={statusFor(def)}
                onConfigure={() => {
                  if (def.id === "api_keys") return setApiHubMode("keys");
                  if (def.id === "webhooks") return setApiHubMode("webhooks");
                  if (def.backend === "apis") {
                    toast.info(`${def.name}: em preparação.`);
                    return;
                  }
                  setWizardFor(def);
                }}
                onTest={def.backend === "payments-gateway" || def.backend === "partner" ? () => handleQuickTest(def) : undefined}
                onLogs={def.backend === "partner" ? () => document.getElementById("logs-section")?.scrollIntoView({ behavior: "smooth" }) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* API Keys & Webhooks quick section */}
      <ApiKeysAndWebhooks />

      {/* Logs */}
      <Card id="logs-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Logs recentes (parceiros de check-in)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(logsQ.data ?? []).slice(0, 20).map((l: any) => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium capitalize">{l.provider} · {l.external_user ?? "sem id"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")} {l.reason ? `· ${l.reason}` : ""}
                  </div>
                </div>
                <Badge variant={l.status === "approved" ? "default" : "destructive"}>{l.status}</Badge>
              </div>
            ))}
            {(logsQ.data ?? []).length === 0 && (
              <div className="py-6 text-sm text-muted-foreground text-center">Nenhum evento registrado ainda.</div>
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* Wizard AMT Pay */}
      <AMTPayWizard open={amtPayOpen} onOpenChange={setAmtPayOpen} initialGateway={amtPayProvider} />

      {wizardFor && (
        <IntegrationWizard
          open={!!wizardFor}
          onOpenChange={(v) => !v && setWizardFor(null)}
          integration={wizardFor}
          onSubmit={(vals) => handleSubmit(wizardFor, vals)}
          onTest={async (vals) => {
            const r = await test({ data: { integrationId: wizardFor.id, credentials: vals } });
            return r;
          }}
        />
      )}

      {apiHubMode && (
        <ApiHubDialog
          open={!!apiHubMode}
          onOpenChange={(v) => !v && setApiHubMode(null)}
          mode={apiHubMode}
        />
      )}
    </div>
  );
}

/* =====================================================================
 * PaymentsHero — cards principais do fluxo AMT Pay
 * ===================================================================== */
function PaymentsHero({
  gateway,
  onActivate,
  onManage,
}: {
  gateway: any | null;
  onActivate: () => void;
  onManage: () => void;
}) {
  const active = !!gateway?.active;
  const providerName = gateway?.provider
    ? gateway.provider === "asaas"
      ? "Asaas"
      : gateway.provider === "mercadopago"
        ? "Mercado Pago"
        : gateway.provider === "pagseguro"
          ? "PagSeguro"
          : gateway.provider
    : null;

  if (active && providerName) {
    return (
      <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-background to-background">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold">AMT Pay Ativo</span>
                  <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">🟢 Online</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Gateway: <strong>{providerName}</strong> · Conta ••••{" "}
                  {gateway?.updated_at && <>· última sync {relativeTime(gateway.updated_at)}</>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <MethodPill label="PIX" on />
              <MethodPill label="Cartão" on />
              <MethodPill label="Boleto" on />
            </div>
            <Button size="sm" variant="outline" onClick={onManage}>
              <Settings2 className="h-4 w-4 mr-1.5" /> Gerenciar conta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Card 1 — Ativar AMT Pay (destaque) */}
      <Card className="lg:col-span-2 relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <CardContent className="p-6 md:p-7 relative">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Ativar AMT Pay</h2>
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white shadow-sm">
                  <Sparkles className="h-3 w-3 mr-1" /> Recomendado
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                Configure os recebimentos da sua academia através de um assistente simples e guiado. PIX, cartão, boleto e cobrança recorrente — sem lidar com APIs ou tokens.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button onClick={onActivate} size="lg" className="shadow-sm">
                  <Sparkles className="h-4 w-4 mr-1.5" /> Iniciar configuração
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Criptografado por academia · 2–3 min
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 max-w-md">
                <FeatureBadge icon={Landmark} label="Asaas" />
                <FeatureBadge icon={Wallet} label="PIX & Cartão" />
                <FeatureBadge icon={Zap} label="Cobrança recorrente" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Configuração Avançada (colapsado por padrão) */}
      <Card className="border-dashed">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Configuração Avançada</h3>
          <p className="text-xs text-muted-foreground mt-1 flex-1">
            Conecte manualmente seu gateway com API Keys, tokens e webhooks. Recomendado apenas para equipes de TI.
          </p>
          <Button variant="outline" size="sm" onClick={onManage} className="mt-4">
            Modo Avançado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-lg border bg-card/60 backdrop-blur px-2.5 py-2 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

function MethodPill({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <CheckCircle2 className="h-3 w-3" /> {label}
    </div>
  );
}


function Kpi({ icon: Icon, label, value, tone, small }: { icon: any; label: string; value: any; tone: "default" | "success" | "danger" | "muted"; small?: boolean }) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-red-600 dark:text-red-400",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-1.5 font-bold", small ? "text-base" : "text-2xl", toneClass)}>{value}</div>
    </div>
  );
}

function CatItem({ label, hint, count, active, onClick }: { label: string; hint?: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left transition",
        active ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", active && "text-primary")}>{label}</span>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{hint}</p>}
    </button>
  );
}

function CatChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "snap-start shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition whitespace-nowrap",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent",
      )}
    >
      <span className="font-medium">{label}</span>
      <span className={cn("text-[10px] rounded-full px-1.5 py-0.5", active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

function ApiKeysAndWebhooks() {
  const qc = useQueryClient();
  const getOwner = useServerFn(getMyOwnerId);
  const auto = useServerFn(autoProvisionApiSuite);
  const ownerQ = useQuery({ queryKey: ["dojo-owner-id"], queryFn: () => getOwner() });
  const ownerId = ownerQ.data?.ownerId;
  const [autoRunning, setAutoRunning] = useState(false);
  const [bulk, setBulk] = useState<Array<{ module: string; label: string; key: string }>>([]);

  // URL pública estável do dojo (independe do preview) para o parceiro conseguir chamar.
  const PUBLIC_BASE = "https://dojomanager.amtfightwear.com.br";

  const partnerEndpoints = ownerId
    ? [
        {
          name: "Check-in Gympass",
          hint: "Cole no painel Gympass como URL de validação de check-in",
          url: `${PUBLIC_BASE}/api/public/dojo/partner-checkin/gympass?owner=${ownerId}`,
        },
        {
          name: "Check-in TotalPass",
          hint: "Cole no painel TotalPass como URL de validação de check-in",
          url: `${PUBLIC_BASE}/api/public/dojo/partner-checkin/totalpass?owner=${ownerId}`,
        },
        {
          name: "Webhook Mercado Pago",
          hint: "Configure em Mercado Pago → Suas integrações → Webhooks (eventos: payment)",
          url: `${PUBLIC_BASE}/api/public/hooks/mercadopago?owner=${ownerId}`,
        },
      ]
    : [];

  async function onAutoProvision() {
    setAutoRunning(true);
    try {
      const r = await auto();
      setBulk(r.created);
      qc.invalidateQueries({ queryKey: ["dojo-api-keys"] });
      if (r.created.length === 0) toast.info("Todas as chaves já existem — nada a gerar.");
      else toast.success(`${r.created.length} chave(s) geradas`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAutoRunning(false);
    }
  }

  function copyAllBulk() {
    const txt = bulk.map((c) => `${c.label}: ${c.key}`).join("\n");
    navigator.clipboard.writeText(txt);
    toast.success("Chaves copiadas");
  }

  return (
    <div className="space-y-4">
      {/* Auto-provisão de credenciais */}
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Configuração automática (1 clique)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Gera automaticamente uma <strong>API Key</strong> própria para cada módulo do seu dojo. Sem formulários — clique e copie.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" onClick={onAutoProvision} disabled={autoRunning}>
            <Zap className="h-4 w-4 mr-1.5" />
            {autoRunning ? "Gerando..." : "Gerar API Keys de todos os módulos"}
          </Button>

          {bulk.length > 0 && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {bulk.length} chave(s) geradas — copie agora, não aparecem novamente.
                </div>
                <Button size="sm" variant="outline" onClick={copyAllBulk}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar todas
                </Button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {bulk.map((c) => (
                  <div key={c.module} className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="shrink-0">{c.label}</Badge>
                    <code className="flex-1 rounded bg-background px-2 py-1 break-all">{c.key}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(c.key);
                        toast.success("Copiada");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setBulk([])}>Fechar</Button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Uso: <code>Authorization: Bearer &lt;chave&gt;</code>. Cada chave tem escopos apropriados ao seu módulo.
          </p>
        </CardContent>
      </Card>

      {/* Webhooks públicos por módulo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" /> Seus Webhooks pessoais por módulo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            URLs únicas do seu dojo — os eventos chegam apenas na sua conta. Copie e cole na configuração do parceiro.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {!ownerId && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
              Carregando seus endpoints…
            </div>
          )}
          {partnerEndpoints.map((e) => (
            <div key={e.url} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{e.name}</div>
                <code className="text-[11px] text-muted-foreground truncate block">{e.url}</code>
                <div className="text-[11px] text-muted-foreground mt-0.5">{e.hint}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(e.url);
                  toast.success("URL copiada");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Reforço de segurança: as requisições são validadas por HMAC contra o secret configurado em cada integração antes de qualquer efeito.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
