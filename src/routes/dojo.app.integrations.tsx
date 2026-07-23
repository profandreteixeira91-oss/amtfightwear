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
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
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
      {/* Hero premium Ruby Noir */}
      <header className="relative overflow-hidden rounded-2xl border border-red-900/20 bg-gradient-to-br from-neutral-950 via-red-950 to-neutral-900 text-white shadow-[0_20px_60px_-20px_rgba(220,38,38,0.45)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.35),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(220,38,38,0.25),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex items-start justify-between flex-wrap gap-6 p-6 md:p-8">
          <div className="flex items-start gap-5 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-2xl bg-red-500/20 blur-xl" />
              <img
                src={amtPayLogoUrl}
                alt="AMT Pay"
                className="relative h-20 w-20 md:h-24 md:w-24 object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-200 backdrop-blur">
                <CreditCard className="h-3 w-3" /> AMT Pay · Central financeira
              </div>
              <h1 className="mt-3 font-display text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                Integrações & motor financeiro
              </h1>
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                Ative pagamentos com PIX, Boleto e Cartão em nome do seu dojo — ou
                continue registrando cobranças manualmente pela sua operadora atual.
              </p>
              {activated && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AMT Pay ativo
                </div>
              )}
            </div>
          </div>
          {activated && <DisconnectAMTPayButton />}
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
    <div className="space-y-6">
      <Card className="border-2 border-red-600/20 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-start gap-6">
          <img
            src={amtPayLogoUrl}
            alt="AMT Pay"
            className="h-28 w-28 md:h-36 md:w-36 object-contain shrink-0 drop-shadow-lg"
          />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                O que é o AMT Pay?
              </h2>
              <p className="text-muted-foreground mt-2 max-w-3xl">
                O AMT Pay é o meio de pagamento oficial do Dojo Manager. Com um clique,
                seu dojo passa a emitir mensalidades e vendas com PIX, Boleto e Cartão
                de crédito — o dinheiro cai direto na sua conta, com identidade visual
                do seu dojo e saques automáticos. <b>A ativação é opcional</b>: se
                preferir usar sua própria operadora, basta continuar registrando os
                pagamentos manualmente no sistema.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <FeatureItem
                icon={<QrCode className="h-4 w-4" />}
                title="PIX instantâneo"
                text="QR Code gerado dentro do sistema, sem redirecionar."
              />
              <FeatureItem
                icon={<Barcode className="h-4 w-4" />}
                title="Boleto bancário"
                text="Linha digitável e comprovante branded do dojo."
              />
              <FeatureItem
                icon={<CreditCard className="h-4 w-4" />}
                title="Cartão de crédito"
                text="Parcelamento em até 12x, checkout embutido."
              />
              <FeatureItem
                icon={<Receipt className="h-4 w-4" />}
                title="Recorrência automática"
                text="Mensalidades emitidas e cobradas sozinhas."
              />
              <FeatureItem
                icon={<Wallet className="h-4 w-4" />}
                title="Carteira e saques"
                text="Saldo, extrato e transferência via PIX."
              />
              <FeatureItem
                icon={<Building2 className="h-4 w-4" />}
                title="Em nome do seu dojo"
                text="Comprovantes saem com seu CNPJ e logo."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700"
                onClick={onActivate}
              >
                Ativar AMT Pay
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground self-center max-w-sm">
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
    <div className="rounded-lg border bg-card p-3 flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-md bg-red-600/10 text-red-600 grid place-items-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
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
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30">
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
            className="bg-red-600 hover:bg-red-700"
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
      <TabsList className="flex flex-wrap md:w-fit">
        <TabsTrigger value="dashboard" className="gap-2">
          <LayoutDashboard className="h-4 w-4" /> Visão geral
        </TabsTrigger>
        <TabsTrigger value="wallet" className="gap-2">
          <Wallet className="h-4 w-4" /> Carteira
        </TabsTrigger>
        <TabsTrigger value="withdrawals" className="gap-2">
          <ArrowDownRight className="h-4 w-4" /> Saques
        </TabsTrigger>
        <TabsTrigger value="statement" className="gap-2">
          <FileText className="h-4 w-4" /> Extrato
        </TabsTrigger>
        <TabsTrigger value="fees" className="gap-2">
          <Percent className="h-4 w-4" /> Taxas
        </TabsTrigger>
        <TabsTrigger value="pix" className="gap-2">
          <KeyRound className="h-4 w-4" /> Chaves PIX
        </TabsTrigger>
        <TabsTrigger value="reminders" className="gap-2">
          <Bell className="h-4 w-4" /> Lembretes
        </TabsTrigger>
        <TabsTrigger value="branding" className="gap-2">
          <Sparkles className="h-4 w-4" /> Identidade da cobrança
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2">
          <ScrollText className="h-4 w-4" /> Auditoria
        </TabsTrigger>
        <TabsTrigger value="onboarding" className="gap-2">
          <ShieldCheck className="h-4 w-4" /> Recebimento
        </TabsTrigger>
        <TabsTrigger value="about" className="gap-2">
          <Info className="h-4 w-4" /> Sobre
        </TabsTrigger>
      </TabsList>

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
