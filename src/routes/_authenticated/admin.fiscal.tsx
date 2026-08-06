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
      <div className="space-y-6">
        {/* Header com Ações Rápidas */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Fiscal</h1>
            <p className="text-muted-foreground">
              Gestão de notas fiscais, certificado digital e obrigações acessórias.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Emitir Nota (NF-e)
            </Button>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="admin-surface border">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="invoices">Notas Emitidas</TabsTrigger>
            <TabsTrigger value="certificate">Certificado Digital</TabsTrigger>
            <TabsTrigger value="config">Configuração Fiscal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 admin-card">
                <CardHeader>
                  <CardTitle>Últimas Emissões</CardTitle>
                  <CardDescription>Lista das notas mais recentes processadas pela SEFAZ.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">NF-e #000{145 + i}</p>
                            <p className="text-xs text-muted-foreground">Cliente: João Silva • R$ 450,00</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Autorizada</Badge>
                          <span className="text-[10px] text-muted-foreground">Hoje, 14:20</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3 admin-card">
                <CardHeader>
                  <CardTitle>Alertas e Eventos</CardTitle>
                  <CardDescription>Notificações importantes do sistema fiscal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="mt-0.5 rounded-full bg-amber-500/10 p-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">NF-e #000148 Rejeitada</p>
                        <p className="text-xs text-muted-foreground mt-1">Erro: CNPJ do destinatário inválido. Verifique o cadastro.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-0.5 rounded-full bg-blue-500/10 p-2 text-blue-600">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">Atualização de NT 2024.001</p>
                        <p className="text-xs text-muted-foreground mt-1">O sistema já está compatível com as novas regras da SEFAZ.</p>
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
                 <div className="rounded-lg border-2 border-dashed p-8 text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-sm font-semibold">Upload de Certificado (.pfx / .p12)</h3>
                    <p className="mt-1 text-xs text-muted-foreground">O arquivo será criptografado e armazenado com segurança.</p>
                    <Button variant="outline" className="mt-4">Selecionar Arquivo</Button>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
