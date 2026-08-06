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
  Download,
  Search,
  CheckCircle2,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFiscalStatus, getFiscalInvoices, uploadCertificate, saveFiscalConfig } from "@/lib/fiscal/fiscal.functions";
import { getProductsWithFiscal, updateProductFiscal } from "@/lib/fiscal/products.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRef, useState, useMemo } from "react";


export const Route = createFileRoute("/_authenticated/admin/fiscal")({
  head: () => ({
    meta: [
      { title: "Módulo Fiscal — Central AMT" },
      { name: "description", content: "Gestão de notas fiscais, certificados e conformidade tributária." }
    ]
  }),
  component: FiscalDashboard,
});

function FiscalDashboard() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getFiscalStatus);
  const fetchInvoices = useServerFn(getFiscalInvoices);
  const uploadCertFn = useServerFn(uploadCertificate);
  const fetchProducts = useServerFn(getProductsWithFiscal);
  const updateProdFiscal = useServerFn(updateProductFiscal);
  const saveConfigFn = useServerFn(saveFiscalConfig);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['fiscal-status'],
    queryFn: () => fetchStatus(),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['fiscal-invoices'],
    queryFn: () => fetchInvoices(),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['fiscal-products'],
    queryFn: () => fetchProducts(),
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


  return (
    <AdminShell title="Módulo Fiscal" hideLayoutOnLoad>
      <div className="w-full space-y-10 p-6 md:p-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white via-white to-neutral-50 p-8 shadow-sm md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-red-500/20 to-red-700/10 blur-3xl"
          />
          
          <div className="relative flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600 shadow-sm backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
              </span>
              Central AMT · Fiscal & Compliance
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-5xl">
                  Módulo Fiscal
                </h1>
                <p className="text-sm leading-relaxed text-neutral-500 md:text-base">
                  Gestão centralizada de notas fiscais, certificado digital A1 e conformidade tributária para o ecossistema AMT.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button 
                  onClick={() => setActiveTab("invoices")}
                  className="w-full gap-2 rounded-full bg-red-600 shadow-sm transition-all hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Emitir Nota (NF-e)
                </Button>
                <Button 
                  onClick={() => setActiveTab("config")}
                  variant="outline" 
                  className="w-full gap-2 rounded-full bg-white/70 backdrop-blur sm:w-auto"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            tone="emerald"
            icon={Send}
            hint="Emitidas (Mês)"
            value={statusLoading ? "—" : (status?.total_issued_month || 0).toString()}
            label="Notas autorizadas no período atual"
          />
          <KpiCard
            tone="amber"
            icon={AlertCircle}
            hint="Pendentes / Rejeitadas"
            value={statusLoading ? "—" : (status?.pending_notes || 0).toString()}
            label="Necessitam atenção imediata"
          />
          <KpiCard
            tone="slate"
            icon={BarChart3}
            hint="Ambiente"
            value={statusLoading ? "—" : status?.environment || "---"}
            label={`Sefaz ${status?.environment === 'producao' ? 'Produção' : 'Homologação'}`}
          />
          <KpiCard
            tone={status?.certificate_valid ? "emerald" : "red"}
            icon={ShieldCheck}
            hint="Certificado A1"
            value={statusLoading ? "—" : (status?.certificate_valid ? 'Válido' : 'Inativo')}
            label={status?.expires_at 
              ? `Expira em ${status.days_remaining} dias` 
              : 'Não configurado'}
          />
        </div>

        {/* Conteúdo Principal */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
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

          <TabsContent value="config">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Configurações Fiscais</CardTitle>
                <CardDescription>Defina os parâmetros do emitente para emissão de notas.</CardDescription>
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
                      <label className="text-sm font-medium">Razão Social</label>
                      <Input name="razao_social" defaultValue={status?.issuer_name !== "Não configurado" ? status?.issuer_name : ""} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CNPJ</label>
                      <Input name="cnpj" placeholder="00.000.000/0000-00" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Inscrição Estadual</label>
                      <Input name="inscricao_estadual" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ambiente SEFAZ</label>
                      <select name="environment" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={status?.environment}>
                        <option value="homologacao">Homologação (Testes)</option>
                        <option value="producao">Produção</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-3 space-y-2">
                        <label className="text-sm font-medium">Endereço</label>
                        <Input name="address_street" placeholder="Rua / Av" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nº</label>
                        <Input name="address_number" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cidade</label>
                        <Input name="address_city_name" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Código IBGE Cidade</label>
                        <Input name="address_city_code" placeholder="Ex: 3550308" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">Bairro</label>
                        <Input name="address_neighborhood" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">UF</label>
                        <Input name="address_state" maxLength={2} placeholder="SP" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CEP</label>
                      <Input name="address_zip" placeholder="00000-000" required />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">
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
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-neutral-50 text-left font-semibold text-neutral-900">
                          <th className="p-4">Produto</th>
                          <th className="p-4">NCM</th>
                          <th className="p-4">CEST</th>
                          <th className="p-4">CFOP Padrão</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredProducts?.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-muted-foreground italic">Nenhum produto encontrado.</td></tr>
                        ) : (
                          filteredProducts?.map((p: any) => (
                            <tr key={p.id} className="group transition-colors hover:bg-neutral-50/50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                                    <Package className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-neutral-900">{p.name}</p>
                                    <p className="text-xs text-neutral-500">R$ {Number(p.price).toLocaleString('pt-BR')}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.ncm || ""} 
                                  placeholder="0000.00.00"
                                  className="h-8 w-28 text-xs"
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'ncm', e.target.value)}
                                />
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.cest || ""} 
                                  placeholder="00.000.00"
                                  className="h-8 w-28 text-xs"
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'cest', e.target.value)}
                                />
                              </td>
                              <td className="p-4">
                                <Input 
                                  defaultValue={p.cfop || ""} 
                                  placeholder="5102"
                                  className="h-8 w-20 text-xs"
                                  onBlur={(e) => handleProductFiscalUpdate(p.id, 'cfop', e.target.value)}
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

        </Tabs>
      </div>
    </AdminShell>
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
  const tones = {
    red: "border-l-red-500 text-red-600 bg-red-50/30",
    amber: "border-l-amber-500 text-amber-600 bg-amber-50/30",
    emerald: "border-l-emerald-500 text-emerald-600 bg-emerald-50/30",
    slate: "border-l-slate-500 text-slate-600 bg-slate-50/30",
    neutral: "border-l-neutral-300 text-neutral-600 bg-neutral-50/30",
  };

  return (
    <Card className={`overflow-hidden border-l-4 shadow-sm transition-all hover:shadow-md ${tones[tone]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{hint}</p>
        <Icon className="h-4 w-4 opacity-70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        <p className="mt-1 text-xs text-neutral-500 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}


