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
  Plus,
  Loader2,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFiscalStatus, getFiscalInvoices, uploadCertificate } from "@/lib/fiscal/fiscal.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/admin/fiscal")({
  component: FiscalDashboard,
});

function FiscalDashboard() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getFiscalStatus);
  const fetchInvoices = useServerFn(getFiscalInvoices);
  const uploadCertFn = useServerFn(uploadCertificate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['fiscal-status'],
    queryFn: () => fetchStatus(),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['fiscal-invoices'],
    queryFn: () => fetchInvoices(),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, password }: { file: File, password: string }) => {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      return uploadCertFn({ data: { file_base64: base64, password } });
    },
    onSuccess: () => {
      toast.success("Certificado enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['fiscal-status'] });
    },
    onError: (err) => {
      toast.error("Erro ao enviar certificado: " + err.message);
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const password = window.prompt("Digite a senha do certificado:");
    if (password === null) return;
    
    uploadMutation.mutate({ file, password });
  };

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
              {statusLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <div className="text-2xl font-bold">{status?.total_issued_month || 0}</div>
                  <p className="text-xs text-muted-foreground">Notas autorizadas no período atual</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes / Rejeitadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statusLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <div className="text-2xl font-bold">{status?.pending_notes || 0}</div>
                  <p className="text-xs text-muted-foreground">Necessitam atenção imediata</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ambiente</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statusLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <div className="text-2xl font-bold capitalize">{status?.environment || '---'}</div>
                  <p className="text-xs text-muted-foreground">Sefaz {status?.environment === 'producao' ? 'Produção' : 'Homologação'}</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="admin-card border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificado A1</CardTitle>
              <ShieldCheck className={`h-4 w-4 ${status?.certificate_valid ? 'text-emerald-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              {statusLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <div className="text-2xl font-bold">{status?.certificate_valid ? 'Válido' : 'Inativo'}</div>
                  <p className={`text-xs font-medium ${status?.days_remaining && status.days_remaining < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {status?.expires_at 
                      ? `Expira em ${status.days_remaining} dias` 
                      : 'Não configurado'}
                  </p>
                </>
              )}
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
                    {invoicesLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : invoices?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground italic">Nenhuma nota emitida ainda.</div>
                    ) : (
                      invoices?.map((inv: any) => (
                        <div key={inv.id} className="group flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-xl p-2.5 transition-colors ${
                              inv.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-600' : 
                              inv.status === 'rejected' ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-none text-foreground">NF-e #{inv.invoice_number}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Destinatário: {inv.recipient_name} • <span className="font-medium text-foreground/80">R$ {Number(inv.total_amount).toLocaleString('pt-BR')}</span></p>
                            </div>
                          </div>
                          <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                            <Badge variant="outline" className={`capitalize ${
                              inv.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50' : 
                              inv.status === 'rejected' ? 'bg-red-500/10 text-red-700 border-red-200/50' : ''
                            } px-2 py-0`}>
                              {inv.status}
                            </Badge>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {format(new Date(inv.issue_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="order-1 lg:col-span-3 lg:order-2 admin-card">
                <CardHeader>
                  <CardTitle>Dados do Emitente</CardTitle>
                  <CardDescription>Informações atuais da empresa configurada.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                      <div className="mt-0.5 shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-none text-foreground">{status?.issuer_name}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">Razão Social cadastrada no sistema.</p>
                      </div>
                    </div>
                    {status?.certificate_valid && (
                      <div className="flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                        <div className="mt-0.5 shrink-0 rounded-xl bg-blue-500/10 p-2.5 text-blue-600">
                          <History className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold leading-none text-foreground">Vencimento Certificado</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Válido até {status.expires_at ? format(new Date(status.expires_at), "dd/MM/yyyy") : '---'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
             <Card className="admin-card">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle>Histórico de Notas</CardTitle>
                   <CardDescription>Gerenciamento completo das notas fiscais.</CardDescription>
                 </div>
                 <Button variant="outline" size="sm" className="gap-2">
                   <Download className="h-4 w-4" /> Exportar XMLs
                 </Button>
               </CardHeader>
               <CardContent>
                 <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left font-medium">
                          <th className="p-4">Número</th>
                          <th className="p-4">Destinatário</th>
                          <th className="p-4">Valor</th>
                          <th className="p-4">Data</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices?.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma nota encontrada.</td></tr>
                        ) : (
                          invoices?.map((inv: any) => (
                            <tr key={inv.id} className="border-b transition-colors hover:bg-muted/30">
                              <td className="p-4 font-medium">#{inv.invoice_number}</td>
                              <td className="p-4">{inv.recipient_name}</td>
                              <td className="p-4">R$ {Number(inv.total_amount).toLocaleString('pt-BR')}</td>
                              <td className="p-4 text-muted-foreground">{format(new Date(inv.issue_date), "dd/MM/yyyy HH:mm")}</td>
                              <td className="p-4">
                                <Badge variant="outline" className={inv.status === 'authorized' ? 'text-emerald-600' : ''}>
                                  {inv.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <Button variant="ghost" size="sm">Ver DANFE</Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                 </div>
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
                 <input 
                    type="file" 
                    accept=".pfx,.p12" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                 <div 
                  className="rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 sm:p-12 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                 >
                    {uploadMutation.isPending ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-sm font-medium">Enviando e validando certificado...</p>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                        <h3 className="mt-4 text-sm font-semibold">Upload de Certificado (.pfx / .p12)</h3>
                        <p className="mt-1 text-xs text-muted-foreground">O arquivo será criptografado e armazenado com segurança.</p>
                        <Button variant="outline" className="mt-4">Selecionar Arquivo</Button>
                      </>
                    )}
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
               <CardContent>
                 <p className="text-center p-12 text-muted-foreground italic">
                   Integração com o catálogo de produtos para edição em massa dos campos fiscais está sendo processada.
                 </p>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

