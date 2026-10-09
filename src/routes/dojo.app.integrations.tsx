import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AMTPayActivationForm } from "@/components/dojo/amtpay/AMTPayActivationForm";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownRight,
  FileText,
  CreditCard,
  ShieldCheck,
  Info,
  Percent,
  KeyRound,
  ScrollText,
  Bell,
  Sparkles,
  Loader2,
  ArrowRight,
  QrCode,
  Barcode,
  Receipt,
  Building2,
} from "lucide-react";
import { AMTPayDashboard } from "@/components/dojo/amtpay/AMTPayDashboard";
import { WalletPanel } from "@/components/dojo/amtpay/WalletPanel";
import { WithdrawalsPanel } from "@/components/dojo/amtpay/WithdrawalsPanel";
import { StatementPanel } from "@/components/dojo/amtpay/StatementPanel";
import { AMTPayReceivingCard } from "@/components/dojo/amtpay/AMTPayReceivingCard";
import { AMTPayInfoPanel } from "@/components/dojo/amtpay/AMTPayInfoPanel";
import { PaymentSettingsPanel } from "@/components/dojo/amtpay/PaymentSettingsPanel";
import { PixKeysPanel } from "@/components/dojo/amtpay/PixKeysPanel";
import { AuditLogPanel } from "@/components/dojo/amtpay/AuditLogPanel";
import { RemindersPanel } from "@/components/dojo/amtpay/RemindersPanel";
import { InvoiceBrandingPanel } from "@/components/dojo/amtpay/InvoiceBrandingPanel";
import { AsaasStatusBanner } from "@/components/dojo/amtpay/AsaasStatusBanner";
import { getMyAsaasConfig, resetMyAsaasConfig } from "@/lib/asaas/asaas.functions";
import { isAsaasReady, classifyAsaasStatus } from "@/lib/dojo/amt-pay-status";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Unplug } from "lucide-react";
import amtPayLogoAsset from "@/assets/amt-pay-logo.png.asset.json";
import { PinGate } from "@/components/dojo/PinGate";
const amtPayLogoUrl = amtPayLogoAsset.url;

export const Route = createFileRoute("/dojo/app/integrations")({
  head: () => ({ meta: [{ title: "AMT Pay — Central financeira" }] }),
  component: AMTPayHub,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function AMTPayHub() {
  const fn = useServerFn(getMyAsaasConfig);
  const queryClient = useQueryClient();
  const [showActivation, setShowActivation] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "asaas-config"],
    queryFn: () => fn(),
  });

  const activated =
    !!data && (isAsaasReady(data.onboardingStatus) || classifyAsaasStatus(data.onboardingStatus) !== "not_started");

  return (
    <div className="mx-auto max-w-7xl w-full p-4 md:p-6 space-y-8">
      {/* Hero premium */}
      <header className="relative overflow-hidden rounded-2xl border border-red-900/20 bg-gradient-to-br from-neutral-950 via-red-950 to-neutral-900 text-white shadow-[0_20px_60px_-20px_rgba(220,38,38,0.45)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.35),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(220,38,38,0.25),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex flex-col gap-4 items-start sm:flex-row sm:gap-5 min-w-0">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <div className="absolute -inset-2 rounded-2xl bg-red-500/20 blur-xl" />
              <img
                src={amtPayLogoUrl}
                alt="AMT Pay"
                className="relative h-16 w-16 sm:h-24 sm:w-24 object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-red-200 backdrop-blur sm:text-[10px]">
                <CreditCard className="h-3 w-3" /> AMT Pay · Central financeira
              </div>
              <h1 className="mt-3 font-display text-xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Integrações & motor financeiro
              </h1>
              <p className="mt-2 text-xs sm:text-base text-white/70 max-w-2xl leading-relaxed">
                Ative pagamentos com PIX, Boleto e Cartão em nome do seu dojo.
              </p>
              {activated && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AMT Pay ativo
                </div>
              )}
            </div>
          </div>
          {activated && (
            <div className="flex justify-center sm:block">
              <DisconnectAMTPayButton />
            </div>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : activated ? (
        <PinGate moduleName="AMT Pay" description="Após ativado, o AMT Pay exige PIN de 6 dígitos. O acesso permanece liberado por 24 horas ou até você sair da conta.">
          <AsaasStatusBanner />
          <FullHub />
        </PinGate>
      ) : showActivation ? (
        <AMTPayActivationForm
          showIntro={false}
          onCompleted={async () => {
            await queryClient.invalidateQueries({ queryKey: ["amtpay", "asaas-config"] });
            setShowActivation(false);
          }}
        />
      ) : (
        <AMTPayLanding onActivate={() => setShowActivation(true)} />
      )}
    </div>
  );
}

function AMTPayLanding({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-red-600/25 bg-white shadow-[0_18px_48px_-24px_rgba(220,38,38,0.35)]">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <CardContent className="relative p-8 md:p-10 flex flex-col md:flex-row items-start gap-8">
          <div className="relative shrink-0">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-red-500/15 to-transparent blur-xl" />
            <img
              src={amtPayLogoUrl}
              alt="AMT Pay"
              className="relative h-28 w-28 md:h-36 md:w-36 object-contain drop-shadow-[0_10px_25px_rgba(220,38,38,0.25)]"
            />
          </div>
          <div className="flex-1 space-y-5 min-w-0">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-600/25 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">
                <Sparkles className="h-3 w-3" /> Motor de pagamentos oficial
              </div>
              <h2 className="mt-3 font-display text-2xl md:text-3xl font-bold tracking-tight">
                O que é o AMT Pay?
              </h2>
              <p className="mt-2 text-muted-foreground max-w-3xl leading-relaxed">
                Com um clique, seu dojo passa a emitir mensalidades e vendas com PIX,
                Boleto e Cartão de crédito — o dinheiro cai direto na sua conta, com
                identidade visual do seu dojo e saques automáticos.{" "}
                <b className="text-foreground">A ativação é opcional</b>: se preferir
                usar sua própria operadora, basta continuar registrando os pagamentos
                manualmente no sistema.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <FeatureItem icon={<QrCode className="h-4 w-4" />} title="PIX instantâneo" text="QR Code gerado dentro do sistema, sem redirecionar." />
              <FeatureItem icon={<Barcode className="h-4 w-4" />} title="Boleto bancário" text="Linha digitável e comprovante branded do dojo." />
              <FeatureItem icon={<CreditCard className="h-4 w-4" />} title="Cartão de crédito" text="Parcelamento em até 12x, checkout embutido." />
              <FeatureItem icon={<Receipt className="h-4 w-4" />} title="Recorrência automática" text="Mensalidades emitidas e cobradas sozinhas." />
              <FeatureItem icon={<Wallet className="h-4 w-4" />} title="Carteira e saques" text="Saldo, extrato e transferência via PIX." />
              <FeatureItem icon={<Building2 className="h-4 w-4" />} title="Em nome do seu dojo" text="Comprovantes saem com seu CNPJ e logo." />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Button
                size="lg"
                className="bg-red-600 text-white hover:bg-red-700 hover:text-white shadow-lg shadow-red-600/25 transition-all hover:shadow-red-600/40 hover:-translate-y-0.5"
                onClick={onActivate}
              >
                Ativar AMT Pay
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Sem ativar? Sem problema. Você pode continuar usando o sistema
                normalmente e registrar mensalidades e vendas como pagas pela sua
                operadora atual.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AMTPayInfoPanel />
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-card p-3.5 flex gap-3 transition-all hover:border-red-600/40 hover:shadow-[0_8px_24px_-12px_rgba(220,38,38,0.35)] hover:-translate-y-0.5">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white grid place-items-center shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground leading-snug">{text}</div>
      </div>
    </div>
  );
}

function DisconnectAMTPayButton() {
  const qc = useQueryClient();
  const resetFn = useServerFn(resetMyAsaasConfig);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await resetFn();
      toast.success("AMT Pay desconectado. Você pode reativar quando quiser.");
      await qc.invalidateQueries({ queryKey: ["amtpay"] });
      await qc.invalidateQueries({ queryKey: ["amtpay-dashboard"] });
      await qc.invalidateQueries({ queryKey: ["amtpay-caps"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao desconectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full bg-white/10 text-white border border-white/25 hover:bg-red-600 hover:text-white hover:border-red-600 backdrop-blur shadow-sm sm:w-auto">
          <Unplug className="h-4 w-4 mr-2" /> Desconectar AMT Pay
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar AMT Pay?</AlertDialogTitle>
          <AlertDialogDescription>
            A ativação, subconta vinculada e chaves de acesso serão removidas do
            Dojo Manager. Cobranças recorrentes já emitidas continuam válidas no
            gateway, mas novas cobranças voltarão ao modo manual até que você
            reative o AMT Pay. Você pode reconectar a qualquer momento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDisconnect();
            }}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
          >
            {loading ? "Desconectando…" : "Desconectar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FullHub() {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="inline-flex h-auto flex-nowrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50/80 p-1 shadow-sm backdrop-blur">
          {[
            { v: "dashboard", i: <LayoutDashboard className="h-3.5 w-3.5" />, l: "Visão geral" },
            { v: "wallet", i: <Wallet className="h-3.5 w-3.5" />, l: "Carteira" },
            { v: "withdrawals", i: <ArrowDownRight className="h-3.5 w-3.5" />, l: "Saques" },
            { v: "statement", i: <FileText className="h-3.5 w-3.5" />, l: "Extrato" },
            { v: "fees", i: <Percent className="h-3.5 w-3.5" />, l: "Taxas" },
            { v: "pix", i: <KeyRound className="h-3.5 w-3.5" />, l: "Chaves PIX" },
            { v: "reminders", i: <Bell className="h-3.5 w-3.5" />, l: "Lembretes" },
            { v: "branding", i: <Sparkles className="h-3.5 w-3.5" />, l: "Identidade" },
            { v: "audit", i: <ScrollText className="h-3.5 w-3.5" />, l: "Auditoria" },
            { v: "onboarding", i: <ShieldCheck className="h-3.5 w-3.5" />, l: "Recebimento" },
            { v: "about", i: <Info className="h-3.5 w-3.5" />, l: "Sobre" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-600/25 transition-all"
            >
              {t.i} {t.l}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="dashboard" className="mt-6">
        <AMTPayDashboard />
      </TabsContent>
      <TabsContent value="wallet" className="mt-6">
        <WalletPanel />
      </TabsContent>
      <TabsContent value="withdrawals" className="mt-6">
        <WithdrawalsPanel />
      </TabsContent>
      <TabsContent value="statement" className="mt-6">
        <StatementPanel />
      </TabsContent>
      <TabsContent value="fees" className="mt-6">
        <PaymentSettingsPanel />
      </TabsContent>
      <TabsContent value="pix" className="mt-6">
        <PixKeysPanel />
      </TabsContent>
      <TabsContent value="reminders" className="mt-6">
        <RemindersPanel />
      </TabsContent>
      <TabsContent value="branding" className="mt-6">
        <InvoiceBrandingPanel />
      </TabsContent>
      <TabsContent value="audit" className="mt-6">
        <AuditLogPanel />
      </TabsContent>
      <TabsContent value="onboarding" className="mt-6">
        <AMTPayReceivingCard />
      </TabsContent>
      <TabsContent value="about" className="mt-6">
        <AMTPayInfoPanel />
      </TabsContent>
    </Tabs>
  );
}
