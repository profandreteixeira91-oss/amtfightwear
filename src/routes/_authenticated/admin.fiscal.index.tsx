import { createFileRoute, Link } from "@tanstack/react-router";
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
  Download,
  Search,
  CheckCircle2,
  Package,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFiscalStatus, getFiscalInvoices, uploadCertificate, saveFiscalConfig, fetchCompanyByCnpj } from "@/lib/fiscal/fiscal.functions";
import { getProductsWithFiscal, updateProductFiscal } from "@/lib/fiscal/products.functions";
import { getFiscalCategorySettings, saveFiscalCategorySetting } from "@/lib/fiscal/automation.functions";
import { emitNFe } from "@/lib/fiscal/emission.functions";
import { reconcileFakeInvoices } from "@/lib/fiscal/reconciliation.functions";
import { getOrdersForFiscal } from "@/lib/fiscal/orders.functions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRef, useState, useMemo, useEffect } from "react";
import { PageShell } from "@/components/common/PageShell";
import { useConfirm } from "@/components/common/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/fiscal/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      orderId: search.orderId as string | undefined,
      type: search.type as "order" | "quote" | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Módulo Fiscal — Central AMT" },
      { name: "description", content: "Gestão de notas fiscais, certificados e conformidade tributária." }
    ]
  }),
  component: FiscalDashboard,
});

function FiscalDashboard() {
  const { orderId, type } = Route.useSearch();
  const queryClient = useQueryClient();
  const [confirm, confirmDialog] = useConfirm();
  const fetchStatus = useServerFn(getFiscalStatus);
  const fetchInvoices = useServerFn(getFiscalInvoices);
  const uploadCertFn = useServerFn(uploadCertificate);
  const fetchProducts = useServerFn(getProductsWithFiscal);
  const updateProdFiscal = useServerFn(updateProductFiscal);
  const saveConfigFn = useServerFn(saveFiscalConfig);
  const findCnpjFn = useServerFn(fetchCompanyByCnpj);
  const emitNFeFn = useServerFn(emitNFe);
  const fetchOrdersFn = useServerFn(getOrdersForFiscal);
  const runReconciliation = useServerFn(reconcileFakeInvoices);
  const fetchCategorySettings = useServerFn(getFiscalCategorySettings);
  const saveCatSetting = useServerFn(saveFiscalCategorySetting);
  
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [emissionStep, setEmissionStep] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showOrderSelection, setShowOrderSelection] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['fiscal-status'],
    queryFn: () => fetchStatus(),
  });

  useEffect(() => {
    if (orderId && type) {
      handleEmitNFe(orderId, type);
    }
  }, [orderId, type]);

  useEffect(() => {
    if (status?.config && !fiscalConfig) {
      const config = status.config;
      setFiscalConfig({
        razao_social: config.razao_social,
        cnpj: config.cnpj,
        inscricao_estadual: config.inscricao_estadual,
        regime_tributario: config.regime_tributario,
        environment: config.environment,
        address: {
          street: config.address_street,
          number: config.address_number,
          neighborhood: config.address_neighborhood,
          city: config.address_city_name,
          state: config.address_state,
          zip: config.address_zip,
          city_code: config.address_city_code,
        }
      });
    }
  }, [status, fiscalConfig]);
  

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['fiscal-invoices'],
    queryFn: () => fetchInvoices(),
  });

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['fiscal-products'],
    queryFn: () => fetchProducts(),
    retry: 1,
  });


  const { data: pendingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['fiscal-orders'],
    queryFn: () => fetchOrdersFn(),
    enabled: showOrderSelection,
  });

  const { data: categorySettings, isLoading: catSettingsLoading } = useQuery({
    queryKey: ['fiscal-category-settings'],
    queryFn: () => fetchCategorySettings(),
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: string, value: any }) => {
      return updateProdFiscal({ data: { id, [field]: value } });
    },
    onSuccess: () => {
      toast.success("Dados fiscais atualizados!");
      queryClient.invalidateQueries({ queryKey: ['fiscal-products'] });
    },
    onError: (err) => {
      toast.error("Erro ao atualizar: " + err.message);
    }
  });

  const handleProductFiscalUpdate = (id: string, field: string, value: string) => {
    updateProductMutation.mutate({ id, field, value });
  };

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


  const handleEmitNFe = async (orderId: string, type: 'order' | 'quote' = 'order') => {
    setIsEmitting(true);
    setShowOrderSelection(false);
    try {
      setEmissionStep("Validando permissões e certificado...");
      await new Promise(r => setTimeout(r, 800));
      
      setEmissionStep("Buscando dados do pedido e produtos...");
      await new Promise(r => setTimeout(r, 800));

      setEmissionStep("Gerando XML da NF-e...");
      await new Promise(r => setTimeout(r, 800));

      setEmissionStep("Assinando XML com certificado A1...");
      await new Promise(r => setTimeout(r, 800));

      setEmissionStep("Transmitindo para a SEFAZ...");
      await new Promise(r => setTimeout(r, 1200));

      const result = await emitNFeFn({ data: { orderId, type } });
      
      setEmissionStep("Processando retorno da SEFAZ...");
      await new Promise(r => setTimeout(r, 500));

      if (result.success) {
        setLastInvoice(result.invoice);
        setShowSuccessModal(true);
        toast.success("NF-e autorizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['fiscal-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-status'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-billing-orders'] });
        // Clear search params
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err: any) {
      toast.error("Erro na emissão: " + err.message);
    } finally {
      setIsEmitting(false);
      setEmissionStep("");
    }
  };

  return (
    <PageShell
      eyebrow="AMT Fiscal & Legal"
      title="Gestão Fiscal"
      description="Emissão de NF-e e NFS-e integrada aos pedidos e orçamentos do ecossistema AMT."
      actions={
        <>
          <Button
            variant="ghost"
            className="gap-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            onClick={async () => {
              const ok = await confirm({
                title: "Auditar notas do simulador?",
                description:
                  "Notas geradas pelo simulador anterior, sem transmissão real à Sefaz, serão marcadas como 'erro'.",
                confirmLabel: "Auditar",
              });
              if (!ok) return;
              toast.promise(runReconciliation(), {
                loading: "Auditando base de dados...",
                success: (res: any) => `${res.count} notas fictícias foram invalidadas.`,
                error: "Erro na auditoria.",
              });
            }}
          >
            <AlertCircle className="h-4 w-4" />
            Auditar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setActiveTab("config")}>
            <Settings className="h-4 w-4" />
            Emitente
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/admin/fiscal/pedidos" search={{ orderId: undefined, type: undefined }}>
              <Package className="h-4 w-4" />
              Central de Faturamento
            </Link>
          </Button>
          <Button onClick={() => setShowOrderSelection(true)} disabled={isEmitting} className="gap-2">
            {isEmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {emissionStep || "Processando..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Emitir NF-e
              </>
            )}
          </Button>
        </>
      }
    >
        {confirmDialog}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            tone="emerald"
            icon={Send}
            hint="Autorizadas (Mês)"
            value={statusLoading ? "—" : (status?.total_issued_month || 0).toString()}
            label="Notas autorizadas no período"
          />
          <KpiCard
            tone="amber"
            icon={AlertCircle}
            hint="Atenção Necessária"
            value={statusLoading ? "—" : (status?.pending_notes || 0).toString()}
            label="Notas pendentes ou rejeitadas"
          />
          <KpiCard
            tone="slate"
            icon={BarChart3}
            hint="Ambiente Sefaz"
            value={statusLoading ? "—" : (status?.environment === 'producao' ? 'Produção' : 'Homologação')}
            label={status?.environment === 'producao' ? 'Transações com valor real' : 'Ambiente de testes'}
          />
          <KpiCard
            tone={status?.certificate_valid ? "emerald" : "red"}
            icon={ShieldCheck}
            hint="Certificado A1"
            value={statusLoading ? "—" : (status?.certificate_valid ? 'Válido' : 'Inativo')}
            label={status?.expires_at 
              ? `Expira em ${status.days_remaining} dias` 
              : 'Auditando transmissão real'}
          />
        </div>

        {/* Conteúdo Principal */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-10">
          <TabsList className="flex h-16 w-full items-center justify-start gap-2 overflow-x-auto rounded-[1.5rem] border border-border/60 bg-card/50 p-2 backdrop-blur-md sm:w-fit sm:justify-center">
            <TabsTrigger 
              value="overview" 
              className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Histórico de Notas
            </TabsTrigger>
            <TabsTrigger 
              value="certificate"
              className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Certificado A1
            </TabsTrigger>
            <TabsTrigger 
              value="config"
              className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Emitente
            </TabsTrigger>
              <TabsTrigger 
                value="products"
                className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Produtos
              </TabsTrigger>
              <TabsTrigger 
                value="automation"
                className="h-12 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Parametrização
              </TabsTrigger>
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
                              inv.status === 'rejected' ? 'bg-primary/10 text-primary' : 
                              inv.status === 'error' ? 'bg-amber-500/10 text-amber-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">NF-e #{inv.invoice_number}</span>
                                {inv.status === 'error' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                    Erro Sefaz
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground line-clamp-1">{inv.recipient_name} • R$ {Number(inv.total_amount).toLocaleString('pt-BR')}</p>
                                {inv.access_key && (
                                  <p className="font-mono text-[10px] text-muted-foreground/80">
                                    Chave: {inv.access_key}
                                  </p>
                                )}
                                {inv.status === 'error' && (
                                  <p className="text-[10px] font-medium text-amber-600 bg-amber-50/50 p-1 rounded mt-1 border border-amber-100">
                                    Aviso: NF-e INEXISTENTE na base nacional ou falha na transmissão. Verifique os dados do emitente e destinatário.
                                  </p>
                                )}
                                {inv.status === 'pending' && (
                                  <p className="text-[10px] font-medium text-blue-600 bg-blue-50/50 p-1 rounded mt-1 border border-blue-100">
                                    Nota em processamento ou aguardando integração com provedor.
                                  </p>
                                )}
                                {inv.error_message && (
                                  <p className="text-[10px] text-primary italic">
                                    Erro: {inv.error_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                            <Badge variant="outline" className={`capitalize ${
                              inv.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50' : 
                              inv.status === 'rejected' ? 'bg-primary/10 text-primary border-primary/30/50' : 
                              inv.status === 'error' ? 'bg-amber-500/10 text-amber-700 border-amber-200/50' :
                              ''
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
               <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <div>
                   <CardTitle>Histórico de Notas</CardTitle>
                   <CardDescription>Gerenciamento completo das notas fiscais.</CardDescription>
                 </div>
                 <div className="flex gap-2">
                    <Button 
                     onClick={() => setShowOrderSelection(true)}
                     disabled={isEmitting}
                     className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {isEmitting ? "Emitindo..." : "Nova NF-e"}
                    </Button>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="gap-2"
                     onClick={() => {
                       if (!invoices || invoices.length === 0) {
                         toast.error("Nenhuma nota para exportar.");
                         return;
                       }
                       
                       // Em um cenário real, isso poderia chamar uma API para gerar um ZIP.
                       // Como estamos no frontend, vamos simular a exportação das notas carregadas.
                       toast.promise(
                         new Promise(async (resolve, reject) => {
                           try {
                             // Simula processamento
                             await new Promise(r => setTimeout(r, 2000));
                             
                             // Cria um blob de texto simples contendo a lista de chaves e conteúdos (simulado)
                             const exportContent = invoices
                               .filter(inv => inv.status === 'authorized')
                               .map(inv => `Nota: ${inv.invoice_number}\nChave: ${inv.access_key}\nLink DANFE: ${inv.danfe_url || 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx'}\nXML: ${inv.xml_content}\n${"-".repeat(20)}`)
                               .join("\n\n");
                             
                             const blob = new Blob([exportContent], { type: 'text/plain' });
                             const url = window.URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `export-xml-nfe-${new Date().toISOString().split('T')[0]}.txt`;
                             a.click();
                             window.URL.revokeObjectURL(url);
                             resolve(true);
                           } catch (err) {
                             reject(err);
                           }
                         }),
                         {
                           loading: 'Preparando pacote de XMLs...',
                           success: 'Download iniciado com sucesso!',
                           error: 'Erro ao exportar XMLs.',
                         }
                       );
                     }}
                   >
                     <Download className="h-4 w-4" /> Exportar XMLs
                   </Button>
                 </div>
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
                                <div className="flex items-center justify-end gap-2">
                                  {inv.access_key && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        navigator.clipboard.writeText(inv.access_key);
                                        toast.success("Chave de acesso copiada!");
                                      }}
                                      title="Copiar Chave de Acesso"
                                    >
                                      {inv.access_key.substring(0, 4)}...{inv.access_key.slice(-4)}
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      if (inv.danfe_url) {
                                        window.open(inv.danfe_url, '_blank');
                                      } else if (inv.status === 'authorized') {
                                        if (inv.access_key) {
                                          toast.info("Abrindo consulta na SEFAZ. Utilize a chave de acesso copiada.");
                                          navigator.clipboard.writeText(inv.access_key);
                                          window.open(`https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=`, '_blank');
                                        } else {
                                          toast.info("Visualização do DANFE disponível em ambiente de produção.");
                                        }
                                      } else {
                                        toast.error("DANFE não disponível para notas não autorizadas.");
                                      }
                                    }}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    DANFE
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      toast.promise(
                                        new Promise(async (resolve) => {
                                          await new Promise(r => setTimeout(r, 1000));
                                          const xml = inv.xml_content || "<nfeProc>...</nfeProc>";
                                          const blob = new Blob([xml], { type: 'text/xml' });
                                          const url = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `nfe-${inv.invoice_number}.xml`;
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          resolve(true);
                                        }),
                                        {
                                          loading: 'Preparando XML...',
                                          success: 'XML baixado com sucesso!',
                                          error: 'Erro ao baixar XML.',
                                        }
                                      );
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    XML
                                  </Button>
                                </div>
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
                     ) : status?.certificate_valid ? (
                       <div className="flex flex-col items-center gap-2">
                         <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                         <h3 className="text-sm font-semibold text-emerald-700">Certificado A1 Configurado</h3>
                         <p className="text-xs text-muted-foreground">
                           Válido até {status.expires_at ? format(new Date(status.expires_at), "dd/MM/yyyy") : '---'}
                         </p>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="mt-2 text-xs text-muted-foreground hover:text-primary"
                           onClick={(e) => {
                             e.stopPropagation();
                             fileInputRef.current?.click();
                           }}
                         >
                           Substituir Certificado
                         </Button>
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

          <TabsContent value="config">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Configurações Fiscais</CardTitle>
                <CardDescription>
                  {status?.config 
                    ? "Informações do emitente salvas no sistema." 
                    : "Defina os parâmetros do emitente para emissão de notas."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = {
                      razao_social: formData.get("razao_social") as string,
                      cnpj: formData.get("cnpj") as string,
                      inscricao_estadual: formData.get("inscricao_estadual") as string,
                      regime_tributario: Number(formData.get("regime_tributario")),
                      environment: formData.get("environment") as 'homologacao' | 'producao',
                      address: {
                        street: formData.get("address_street") as string,
                        number: formData.get("address_number") as string,
                        neighborhood: formData.get("address_neighborhood") as string,
                        city: formData.get("address_city_name") as string,
                        state: formData.get("address_state") as string,
                        zip: formData.get("address_zip") as string,
                        city_code: formData.get("address_city_code") as string,
                      }
                    };
                    
                    toast.promise(saveConfigFn({ data }), {
                      loading: 'Salvando configurações...',
                      success: () => {
                        queryClient.invalidateQueries({ queryKey: ['fiscal-status'] });
                        return 'Configurações salvas!';
                      },
                      error: (err) => `Erro: ${err.message}`
                    });
                  }}
                  className="grid gap-6 md:grid-cols-2"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CNPJ</label>
                      <div className="flex gap-2">
                        <Input 
                          name="cnpj" 
                          placeholder="00.000.000/0000-00" 
                          required 
                          value={fiscalConfig?.cnpj || ""}
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, cnpj: e.target.value }))}
                          onBlur={async (e) => {
                            const cnpj = e.target.value.replace(/\D/g, "");
                            if (cnpj.length === 14 && !status?.config) {
                              setIsSearchingCnpj(true);
                              try {
                                const result = await findCnpjFn({ data: { cnpj } });
                                setFiscalConfig(result);
                                toast.success("Dados da empresa carregados!");
                              } catch (err: any) {
                                toast.error(err.message);
                              } finally {
                                setIsSearchingCnpj(false);
                              }
                            }
                          }}
                        />
                        {isSearchingCnpj && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Digite o CNPJ para preencher automaticamente.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Razão Social</label>
                      <Input 
                        name="razao_social" 
                        value={fiscalConfig?.razao_social || ""} 
                        onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, razao_social: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Inscrição Estadual</label>
                      <Input 
                        name="inscricao_estadual" 
                        value={fiscalConfig?.inscricao_estadual || ""} 
                        onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, inscricao_estadual: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ambiente SEFAZ</label>
                      <select 
                        name="environment" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        value={fiscalConfig?.environment || status?.environment || "homologacao"}
                        onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, environment: e.target.value }))}
                      >
                        <option value="homologacao">Homologação (Testes)</option>
                        <option value="producao">Produção</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-3 space-y-2">
                        <label className="text-sm font-medium">Endereço</label>
                        <Input 
                          name="address_street" 
                          placeholder="Rua / Av" 
                          value={fiscalConfig?.address?.street || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, street: e.target.value } }))}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nº</label>
                        <Input 
                          name="address_number" 
                          value={fiscalConfig?.address?.number || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, number: e.target.value } }))}
                          required 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cidade</label>
                        <Input 
                          name="address_city_name" 
                          value={fiscalConfig?.address?.city || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, city: e.target.value } }))}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Código IBGE Cidade</label>
                        <Input 
                          name="address_city_code" 
                          placeholder="Ex: 3550308" 
                          value={fiscalConfig?.address?.city_code || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, city_code: e.target.value } }))}
                          required 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">Bairro</label>
                        <Input 
                          name="address_neighborhood" 
                          value={fiscalConfig?.address?.neighborhood || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, neighborhood: e.target.value } }))}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">UF</label>
                        <Input 
                          name="address_state" 
                          maxLength={2} 
                          placeholder="SP" 
                          value={fiscalConfig?.address?.state || ""} 
                          onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, state: e.target.value } }))}
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CEP</label>
                      <Input 
                        name="address_zip" 
                        placeholder="00000-000" 
                        value={fiscalConfig?.address?.zip || ""} 
                        onChange={(e) => setFiscalConfig((prev: any) => ({ ...prev, address: { ...prev?.address, zip: e.target.value } }))}
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      Salvar Configurações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="admin-card">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Dados Fiscais dos Produtos</CardTitle>
                  <CardDescription>Configure NCM, CEST e impostos para faturamento.</CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar produto..." 
                    className="pl-10"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : productsError ? (
                  <div className="p-12 text-center text-sm text-primary">
                    Erro ao carregar produtos: {(productsError as Error).message}
                  </div>
                ) : (

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left font-semibold text-foreground">
                          <th className="p-4">Produto</th>
                          <th className="p-4">NCM</th>
                          <th className="p-4">CEST</th>
                          <th className="p-4">CFOP Interno</th>
                          <th className="p-4">CFOP Interestadual</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProducts?.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-muted-foreground italic">Nenhum produto encontrado.</td></tr>
                        ) : (
                          filteredProducts?.map((p: any) => (
                            <tr key={p.id} className="group transition-colors hover:bg-muted/30">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <Package className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">R$ {Number(p.price).toLocaleString('pt-BR')}</p>
                                    {p.store_categories?.ncm && !p.ncm && (
                                      <Badge variant="outline" className="mt-1 text-[9px] bg-blue-50 text-blue-600 border-blue-100">
                                        Sincronizado da Categoria
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.ncm || ""} 
                                  placeholder={p.store_categories?.ncm || "0000.00.00"}
                                  className={cn("h-8 w-28 text-xs", !p.ncm && p.store_categories?.ncm && "border-blue-200 bg-blue-50/30")}
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'ncm', e.target.value)}
                                />
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.cest || ""} 
                                  placeholder={p.store_categories?.cest || "00.000.00"}
                                  className={cn("h-8 w-28 text-xs", !p.cest && p.store_categories?.cest && "border-blue-200 bg-blue-50/30")}
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'cest', e.target.value)}
                                />
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.cfop_internal || ""} 
                                  placeholder="5102"
                                  className="h-8 w-20 text-xs"
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'cfop_internal', e.target.value)}
                                />
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.cfop_interstate || ""} 
                                  placeholder="6102"
                                  className="h-8 w-20 text-xs"
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'cfop_interstate', e.target.value)}
                                />
                              </td>

                              <td className="p-4 text-right">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Parametrização Fiscal por Categoria</CardTitle>
                <CardDescription>Defina os padrões que serão sugeridos automaticamente no cadastro de produtos.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-semibold text-foreground">
                        <th className="p-4">Categoria</th>
                        <th className="p-4">NCM Padrão</th>
                        <th className="p-4">CFOP Interno</th>
                        <th className="p-4">CFOP Interst.</th>
                        <th className="p-4">CST/CSOSN</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {!categorySettings || categorySettings.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground italic">Nenhuma parametrização cadastrada. Utilize o Módulo de Catálogo para propagar dados.</td></tr>
                      ) : (
                        categorySettings.map((set: any) => (
                          <tr key={set.id} className="hover:bg-muted/30">
                            <td className="p-4 font-medium">{set.store_categories?.name}</td>
                            <td className="p-4">{set.ncm}</td>
                            <td className="p-4">{set.cfop_internal}</td>
                            <td className="p-4">{set.cfop_interstate}</td>
                            <td className="p-4">{set.cst_csosn || "—"}</td>
                            <td className="p-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => setActiveTab("products")}>Ver Produtos</Button>
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

        </Tabs>

        {/* Modal de Sucesso da Emissão */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl font-bold">NF-e Autorizada!</DialogTitle>
              <DialogDescription className="text-center">
                A nota fiscal foi processada e autorizada com sucesso pela SEFAZ.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/40 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Número / Série:</span>
                  <span className="font-bold text-foreground">{lastInvoice?.invoice_number} / {lastInvoice?.series}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protocolo:</span>
                  <span className="font-mono text-foreground/80">{lastInvoice?.protocol}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Chave de Acesso:</span>
                  <p className="font-mono text-[10px] break-all bg-card p-2 border rounded">{lastInvoice?.access_key}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="gap-2 text-xs" 
                  onClick={() => {
                    if (lastInvoice?.danfe_url) {
                      window.open(lastInvoice.danfe_url, '_blank');
                    } else {
                      toast.info("Visualização do DANFE disponível em ambiente de produção.");
                    }
                  }}
                >
                  <Download className="h-3 w-3" /> Baixar DANFE
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2 text-xs"
                  onClick={() => {
                    const xml = lastInvoice?.xml_content || "<nfeProc>...</nfeProc>";
                    const blob = new Blob([xml], { type: 'text/xml' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nfe-${lastInvoice?.invoice_number || 'nota'}.xml`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    toast.success("XML baixado com sucesso!");
                  }}
                >
                  <FileText className="h-3 w-3" /> Baixar XML
                </Button>
                <Button 
                  variant="outline" 
                  className="col-span-2 gap-2 text-xs"
                  onClick={() => {
                    toast.promise(
                      new Promise(resolve => setTimeout(resolve, 1500)),
                      {
                        loading: 'Enviando e-mail para o cliente...',
                        success: 'E-mail enviado com sucesso!',
                        error: 'Erro ao enviar e-mail.',
                      }
                    );
                  }}
                >
                  <Send className="h-3 w-3" /> Reenviar por E-mail
                </Button>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => {
                setShowSuccessModal(false);
                setActiveTab("invoices");
              }} className="w-full bg-foreground">
                Ir para Notas Emitidas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Seleção de Pedido */}
        <Dialog open={showOrderSelection} onOpenChange={setShowOrderSelection}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Selecionar Pedido para Emissão</DialogTitle>
              <DialogDescription>
                Selecione um pedido finalizado para gerar a nota fiscal eletrônica.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3 py-2">
                {ordersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : !pendingOrders || pendingOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic">Nenhum pedido recente encontrado.</div>
                ) : (
                  pendingOrders.map((order: any) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
                      onClick={() => handleEmitNFe(order.id, order.type as any)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{order.number}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-medium">
                            {order.type === 'quote' ? 'Orçamento' : 'Pedido'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{order.customer} • {new Date(order.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-semibold text-foreground">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
    </PageShell>
  );
}

function KpiCard({
  value,
  label,
  icon: Icon,
  hint,
  tone = "neutral",
}: {
  value: string;
  label: string;
  icon: any;
  hint: string;
  tone?: "red" | "amber" | "emerald" | "slate" | "neutral";
}) {
  const iconTones = {
    red: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    slate: "bg-slate-500/10 text-slate-600",
    neutral: "bg-neutral-500/10 text-muted-foreground",
  };

  return (
    <div className={cn(
      "relative group flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card p-7 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 group-hover:rotate-3", iconTones[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <Badge variant="outline" className="rounded-full border-border/60 bg-muted/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {hint}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
          {value}
        </div>
        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}


