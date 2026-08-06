import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { 
  FileText, 
  Send, 
  History, 
  AlertCircle, 
  Settings, 
  ShieldCheck, 
  BarChart3, 
  XCircle,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/fiscal")({
  component: FiscalDashboard,
});

function FiscalDashboard() {
  return (
    <AdminShell title="Módulo Fiscal">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-0 sm:px-4 lg:px-6">
        {/* Header com Ações Rápidas */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Módulo Fiscal
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Gestão centralizada de notas fiscais, certificado digital A1 e conformidade tributária para o ecossistema AMT.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="w-full gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto">
              <Plus className="h-4 w-4" />
              Emitir Nota (NF-e)
            </Button>
            <Button variant="outline" className="w-full gap-2 bg-background sm:w-auto">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="admin-card border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emitidas (Mês)</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes / Rejeitadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Necessitam atenção imediata</p>
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Fiscal</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 45.230,00</div>
              <p className="text-xs text-muted-foreground">Baseado em notas autorizadas</p>
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificado A1</CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Válido</div>
              <p className="text-xs text-muted-foreground text-emerald-600 font-medium">Expira em 245 dias</p>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="admin-surface flex h-auto w-full flex-wrap justify-start gap-1 border p-1 sm:inline-flex">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="invoices">Notas Emitidas</TabsTrigger>
            <TabsTrigger value="certificate">Certificado Digital</TabsTrigger>
            <TabsTrigger value="config">Configuração Fiscal</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-7">
              <Card className="order-2 lg:col-span-4 lg:order-1 admin-card">
                <CardHeader>
                  <CardTitle>Últimas Emissões</CardTitle>
                  <CardDescription>Lista das notas mais recentes processadas pela SEFAZ.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="group flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 transition-colors group-hover:bg-emerald-500/20">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-none text-foreground">NF-e #000{145 + i}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Cliente: João Silva • <span className="font-medium text-foreground/80">R$ 450,00</span></p>
                          </div>
                        </div>
                        <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200/50 px-2 py-0">Autorizada</Badge>
                          <span className="text-[10px] font-medium text-muted-foreground">Hoje, 14:20</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="order-1 lg:col-span-3 lg:order-2 admin-card">
                <CardHeader>
                  <CardTitle>Alertas e Eventos</CardTitle>
                  <CardDescription>Notificações importantes do sistema fiscal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                      <div className="mt-0.5 shrink-0 rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-none text-foreground">NF-e #000148 Rejeitada</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">Erro: CNPJ do destinatário inválido. Verifique o cadastro do cliente para reemissão.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                      <div className="mt-0.5 shrink-0 rounded-xl bg-blue-500/10 p-2.5 text-blue-600">
                        <Settings className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-none text-foreground">Atualização de NT 2024.001</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">O sistema já está 100% compatível com as novas regras da SEFAZ publicadas hoje.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
             <Card className="admin-card">
               <CardHeader>
                 <CardTitle>Histórico de Notas</CardTitle>
                 <CardDescription>Filtre e gerencie todas as notas fiscais do sistema.</CardDescription>
               </CardHeader>
               <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                 Lista de notas fiscais (NF-e, NFC-e, NFS-e) aparecerá aqui.
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="certificate">
             <Card className="admin-card">
               <CardHeader>
                 <CardTitle>Gerenciamento de Certificado A1</CardTitle>
                 <CardDescription>Faça o upload e gerencie seu certificado digital para emissão.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 sm:p-12">
                    <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-sm font-semibold">Upload de Certificado (.pfx / .p12)</h3>
                    <p className="mt-1 text-xs text-muted-foreground">O arquivo será criptografado e armazenado com segurança.</p>
                    <Button variant="outline" className="mt-4">Selecionar Arquivo</Button>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="products">
             <Card className="admin-card">
               <CardHeader>
                 <CardTitle>Dados Fiscais dos Produtos</CardTitle>
                 <CardDescription>Configure NCM, CEST e impostos para faturamento.</CardDescription>
               </CardHeader>
               <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                 Lista de produtos com campos fiscais (NCM, CEST, CFOP) aparecerá aqui para edição em massa.
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
