import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Wallet, ArrowDownRight, FileText, CreditCard } from "lucide-react";
import { AMTPayDashboard } from "@/components/dojo/amtpay/AMTPayDashboard";
import { WalletPanel } from "@/components/dojo/amtpay/WalletPanel";
import { WithdrawalsPanel } from "@/components/dojo/amtpay/WithdrawalsPanel";
import { StatementPanel } from "@/components/dojo/amtpay/StatementPanel";

export const Route = createFileRoute("/dojo/app/integrations")({
  head: () => ({ meta: [{ title: "AMT Pay — Central financeira" }] }),
  component: AMTPayHub,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

function AMTPayHub() {
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
            Toda a operação de pagamentos é processada pela plataforma AMT Fight Wear via Mercado Pago,
            com split automático de valores. Você acompanha seus recebimentos, saldo e saques neste painel —
            sem precisar configurar nada.
          </p>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-4 md:w-fit">
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
      </Tabs>
    </div>
  );
}
