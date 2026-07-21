import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/dojo/app/integrations")({
  head: () => ({ meta: [{ title: "AMT Pay — Central financeira" }] }),
  component: AMTPayHub,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function AMTPayHub() {
  const fn = useServerFn(getMyAsaasConfig);
  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "asaas-config"],
    queryFn: () => fn(),
  });

  const activated =
    !!data && (isAsaasReady(data.onboardingStatus) || classifyAsaasStatus(data.onboardingStatus) !== "not_started");

  return (
    <div className="mx-auto max-w-7xl w-full p-4 md:p-6 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <CreditCard className="h-3.5 w-3.5" /> AMT Pay
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
            Central financeira do seu dojo
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Motor financeiro opcional do Dojo Manager. Ative para emitir cobranças com
            PIX, Boleto e Cartão em nome do seu dojo — ou continue registrando
            pagamentos manualmente com sua operadora atual.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !activated ? (
        <AMTPayLanding />
      ) : (
        <>
          <AsaasStatusBanner />
          <FullHub />
        </>
      )}
    </div>
  );
}

function AMTPayLanding() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-red-600/20 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-start gap-6">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-red-600 text-white grid place-items-center shadow-lg">
            <CreditCard className="h-7 w-7" />
          </div>
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
              <Button asChild size="lg" className="bg-red-600 hover:bg-red-700">
                <Link to="/dojo/onboarding">
                  Ativar AMT Pay
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
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
