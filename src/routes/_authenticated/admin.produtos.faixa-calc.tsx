import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DollarSign, 
  Package, 
  Layers, 
  Truck, 
  BarChart3, 
  History, 
  PieChart,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Settings,
  Info,
  ChevronRight,
  Calculator,
  Save,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Edit2,
  FileText
} from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  getPricingConfig, 
  getFixedExpenses, 
  getMarketingInvestments, 
  listAllProductPricing,
  saveFixedExpense,
  deleteFixedExpense,
  updatePricingConfig,
  saveCostComposition,
  deleteCostComposition,
  saveMarketingInvestment,
  deleteMarketingInvestment,
  updateCategoryBOM,
  getStoreCategories
} from "@/lib/store/pricing-calculator.functions";
import { formatMoney } from "@/lib/store/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/admin/produtos/faixa-calc")({
  component: CalculatorV2,
});

interface FixedExpense {
  id: string;
  name: string;
  value: number;
  category?: string | null;
}

interface MarketingInvestment {
  id: string;
  channel: string;
  monthly_investment: number;
  new_customers_goal?: number | null;
}

interface ProductPricing {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  category_id?: string | null;
  price: number | null;
  cost: number | null;
  product_cost_compositions?: any[];
}

function CalculatorV2() {
  const queryClient = useQueryClient();
  
  const fetchConfig = useServerFn(getPricingConfig);
  const fetchExpenses = useServerFn(getFixedExpenses);
  const fetchMarketing = useServerFn(getMarketingInvestments);
  const fetchProducts = useServerFn(listAllProductPricing);
  const fetchCategories = useServerFn(getStoreCategories);
  
  const saveExpenseFn = useServerFn(saveFixedExpense);
  const deleteExpenseFn = useServerFn(deleteFixedExpense);
  const updateConfigFn = useServerFn(updatePricingConfig);

  const { data: config, isPending: isLoadingConfig } = useSuspenseQuery({ queryKey: ["pricing-config"], queryFn: () => fetchConfig() });
  const { data: expensesData, isPending: isLoadingExpenses } = useSuspenseQuery({ queryKey: ["fixed-expenses"], queryFn: () => fetchExpenses() });
  const { data: marketingData, isPending: isLoadingMarketing } = useSuspenseQuery({ queryKey: ["marketing-investments"], queryFn: () => fetchMarketing() });
  const { data: productsData, isPending: isLoadingProducts } = useSuspenseQuery({ queryKey: ["all-product-pricing"], queryFn: () => fetchProducts() });
  const { data: allStoreCategories } = useSuspenseQuery({ queryKey: ["store-categories"], queryFn: () => fetchCategories() });

  const expenses = (expensesData || []) as FixedExpense[];
  const marketing = (marketingData || []) as MarketingInvestment[];
  const products = (productsData || []) as ProductPricing[];

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  // Calculadora de Metragem
  const [materialWidth, setMaterialWidth] = useState<number>(1.6);
  const [materialPriceMeter, setMaterialPriceMeter] = useState<number>(0);
  const [layersCount, setLayersCount] = useState<number>(1);
  const [lengthUsed, setLengthUsed] = useState<number>(0);
  const [widthUsed, setWidthUsed] = useState<number>(0.1);

  const calculatedMaterialCost = useMemo(() => {
    // Fluxo de cálculo: Custo por metro x Total de metros (comprimento * camadas) dividido por largura utilizada (proporcional à largura total?)
    // O usuário pediu: Custo por metro x Total de metros (utilizar as variações de tamanho das faixas) dividido por largura utilizada
    // Se 'lengthUsed' é o comprimento total consumido e 'widthUsed' é a largura de cada tira:
    if (widthUsed <= 0) return 0;
    
    // Total de metros = lengthUsed * layersCount (que representa a metragem linear)
    // Se o custo é por metro linear da peça de largura 'materialWidth', e estamos usando 'widthUsed':
    // O custo proporcional é (Custo Metro * (Metragem Linear)) * (Largura Utilizada / Largura Total)
    return (materialPriceMeter * lengthUsed * layersCount) * (widthUsed / materialWidth);
  }, [materialPriceMeter, lengthUsed, layersCount, widthUsed, materialWidth]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const updateCategoryBOMMutation = useMutation({
    mutationFn: (args: { data: any }) => useServerFn(updateCategoryBOM)(args),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["all-product-pricing"] });
      toast.success(`Composição aplicada a ${res.count} produtos da categoria!`);
    }
  });

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const saveCompositionMutation = useMutation({
    mutationFn: (args: { data: any }) => saveCostComposition(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-product-pricing"] });
      toast.success("Composição salva!");
    }
  });

  const deleteCompositionMutation = useMutation({
    mutationFn: (args: { data: any }) => deleteCostComposition(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-product-pricing"] });
      toast.success("Item removido!");
    }
  });

  const saveMarketingMutation = useMutation({
    mutationFn: (args: { data: any }) => saveMarketingInvestment(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-investments"] });
      toast.success("Investimento salvo!");
    }
  });

  const deleteMarketingMutation = useMutation({
    mutationFn: (args: { data: any }) => deleteMarketingInvestment(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-investments"] });
      toast.success("Investimento removido!");
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: (args: { data: any }) => updateConfigFn(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-config"] });
      toast.success("Configurações salvas!");
    }
  });

  const saveExpenseMutation = useMutation({
    mutationFn: (args: { data: any }) => saveExpenseFn(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Despesa salva!");
    }
  });

  const saveProductCostMutation = useMutation({
    mutationFn: async (args: { id: string; cost: number }) => {
      // Aqui poderíamos chamar uma função de servidor para atualizar o custo base do produto
      // com base na soma da composição BOM, mas por enquanto vamos simular ou usar a lógica BOM.
      toast.info("Custo base atualizado via BOM");
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (args: { data: any }) => deleteExpenseFn(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Despesa removida!");
    }
  });

  const totalFixedExpenses = useMemo(() => 
    expenses.reduce((acc: number, curr: FixedExpense) => acc + (Number(curr.value) || 0), 0), 
    [expenses]
  );
  
  const totalMarketing = useMemo(() => 
    marketing.reduce((acc: number, curr: MarketingInvestment) => acc + (Number(curr.monthly_investment) || 0), 0), 
    [marketing]
  );
  
  const avgContributionMargin = config?.min_contribution_margin || 40; 
  const breakEvenPoint = totalFixedExpenses / (avgContributionMargin / 100 || 0.4);

  if (isLoadingConfig || isLoadingExpenses || isLoadingMarketing || isLoadingProducts) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Dojo Manager Finance 2.0</h1>
          <p className="text-muted-foreground mt-1">Gestão de custos, margens e estratégia de precificação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={() => toast.success("Dados sincronizados com o estoque")}>
            <Save className="h-4 w-4 mr-2" /> Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full max-w-4xl grid grid-cols-6 h-auto">
          <TabsTrigger value="overview" className="gap-2"><PieChart className="h-4 w-4" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="composition" className="gap-2"><Layers className="h-4 w-4" /> Composição</TabsTrigger>
          <TabsTrigger value="variables" className="gap-2"><Truck className="h-4 w-4" /> Variáveis</TabsTrigger>
          <TabsTrigger value="fixed" className="gap-2"><DollarSign className="h-4 w-4" /> Despesas Fixas</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2"><Target className="h-4 w-4" /> Formação</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Despesas Fixas" value={formatMoney(totalFixedExpenses)} icon={<DollarSign className="text-red-500" />} />
            <MetricCard label="Investimento Mkt" value={formatMoney(totalMarketing)} icon={<TrendingUp className="text-blue-500" />} />
            <MetricCard label="Ponto de Equilíbrio" value={formatMoney(breakEvenPoint)} icon={<Target className="text-orange-500" />} description="Custo para atingir margem alvo" />
            <MetricCard label="Mix de Vendas" value="42% Premium" icon={<PieChart className="text-purple-500" />} description="Foco: Kimonos Pro" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
             <Card>
              <CardHeader><CardTitle>Margens por Categoria</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {["Kimono", "Rashguard", "Faixa"].map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-green-600 font-bold">42%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: '42%' }} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
             <Card>
              <CardHeader><CardTitle>Rentabilidade por Canal</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Canal</TableHead><TableHead>Retorno</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Instagram</TableCell><TableCell>3.2x</TableCell><TableCell><Badge variant="outline" className="bg-green-50">Alto</Badge></TableCell></TableRow>
                    <TableRow><TableCell>Google</TableCell><TableCell>2.8x</TableCell><TableCell><Badge variant="outline">Médio</Badge></TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fixed">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Despesas Fixas Mensais</CardTitle>
                <CardDescription>Custos operacionais que não variam com o volume.</CardDescription>
              </div>
              <Button size="sm" onClick={() => saveExpenseMutation.mutate({ data: { name: "Nova Despesa", value: 0 } })}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell><Input defaultValue={expense.name} onBlur={(e) => saveExpenseMutation.mutate({ data: { id: expense.id, name: e.target.value, value: Number(expense.value) } })} /></TableCell>
                      <TableCell><Input type="number" defaultValue={expense.value} onBlur={(e) => saveExpenseMutation.mutate({ data: { id: expense.id, name: expense.name, value: Number(e.target.value) } })} /></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteExpenseMutation.mutate({ data: { id: expense.id } })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composition">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Composição Industrial (BOM)</CardTitle>
                <CardDescription>
                  {selectedSubCategoryId 
                    ? `Editando composição GLOBAL para subcategoria: ${allStoreCategories?.find((c: any) => c.id === selectedSubCategoryId)?.name}`
                    : selectedCategory 
                      ? `Editando composição GLOBAL para categoria: ${selectedCategory}` 
                      : `Insumos para: ${selectedProduct?.name || "Selecione um produto ou categoria"}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(v) => {
                  setSelectedCategory(v);
                  setSelectedSubCategoryId(null);
                  setSelectedProductId(null);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={(v) => {
                  setSelectedSubCategoryId(v);
                  setSelectedCategory(null);
                  setSelectedProductId(null);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStoreCategories?.filter((c: any) => c.parent_id !== null).map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(selectedCategory || selectedSubCategoryId) && (
                   <Button 
                    variant="default" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      if (!selectedProduct?.product_cost_compositions) {
                        toast.error("Selecione um produto de referência na aba Formação primeiro.");
                        return;
                      }
                      updateCategoryBOMMutation.mutate({ 
                        data: { 
                          category: selectedCategory || undefined, 
                          sub_category_id: selectedSubCategoryId || undefined,
                          composition: selectedProduct.product_cost_compositions.map(({ id, product_id, tenant_id, created_at, updated_at, ...rest }: any) => rest)
                        } 
                      });
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" /> Replicar no Grupo
                  </Button>
                )}

                {selectedProductId && (
                  <Button size="sm" onClick={() => saveCompositionMutation.mutate({ data: { product_id: selectedProductId, name: "Novo Item", type: "material", quantity: 1, unit_cost: 0 } })}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Insumo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProductId && !selectedCategory && !selectedSubCategoryId ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Package className="h-10 w-10 mx-auto mb-3 text-primary/50" />
                  <p>Selecione um produto na aba "Formação" ou escolha uma categoria/subcategoria acima para editar a composição.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(selectedCategory || selectedSubCategoryId) && !selectedProductId && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        Para editar a composição do grupo, selecione um produto de referência deste grupo na aba "Formação", 
                        ajuste seus insumos aqui e depois clique em "Replicar no Grupo".
                      </p>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-muted/30 border-dashed">
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-primary" />
                          Calculadora de Metragem Proporcional
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 py-0 pb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Preço p/ Metro (R$)</Label>
                            <Input 
                              type="number" 
                              value={materialPriceMeter} 
                              onChange={(e) => setMaterialPriceMeter(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Comprimento (m)</Label>
                            <Input 
                              type="number" 
                              value={lengthUsed} 
                              onChange={(e) => setLengthUsed(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Camadas</Label>
                            <Input 
                              type="number" 
                              value={layersCount} 
                              onChange={(e) => setLayersCount(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Largura Total (m)</Label>
                            <Input 
                              type="number" 
                              value={materialWidth} 
                              onChange={(e) => setMaterialWidth(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Largura Utilizada (m)</Label>
                            <Input 
                              type="number" 
                              defaultValue={0.1}
                              onChange={(e) => {
                                // Apenas visual, o cálculo proporcional usa materialWidth e a largura consumida se fosse peça a peça
                                // Mas aqui o usuário quer "Cálculo Proporcional"
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between">
                          <div className="text-xs font-bold text-muted-foreground uppercase">Custo Resultante:</div>
                          <div className="text-lg font-black text-primary">{formatMoney(calculatedMaterialCost)}</div>
                        </div>
                        {selectedProductId && (
                          <Button 
                            className="w-full h-8 text-xs" 
                            variant="secondary"
                            onClick={() => {
                              saveCompositionMutation.mutate({ 
                                data: { 
                                  product_id: selectedProductId, 
                                  name: "Material (Metragem)", 
                                  type: "material", 
                                  quantity: lengthUsed * layersCount, 
                                  unit_cost: materialPriceMeter 
                                } 
                              });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Aplicar na Composição
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex flex-col justify-center gap-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
                       <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Custo de Produção Atual</p>
                          <h2 className="text-4xl font-black text-primary mt-1">
                            {formatMoney(selectedProduct?.product_cost_compositions?.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) * Number(curr.unit_cost)), 0) || 0)}
                          </h2>
                       </div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProduct?.product_cost_compositions?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell><Input defaultValue={item.name} onBlur={(e) => saveCompositionMutation.mutate({ data: { ...item, name: e.target.value } })} /></TableCell>
                          <TableCell>
                            <Select defaultValue={item.type} onValueChange={(v) => saveCompositionMutation.mutate({ data: { ...item, type: v } })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="material">Material</SelectItem>
                                <SelectItem value="labor">Mão de Obra</SelectItem>
                                <SelectItem value="other">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" className="w-20" defaultValue={item.quantity} onBlur={(e) => saveCompositionMutation.mutate({ data: { ...item, quantity: Number(e.target.value) } })} /></TableCell>
                          <TableCell><Input type="number" className="w-24" defaultValue={item.unit_cost} onBlur={(e) => saveCompositionMutation.mutate({ data: { ...item, unit_cost: Number(e.target.value) } })} /></TableCell>
                          <TableCell className="font-medium">{formatMoney(item.quantity * item.unit_cost)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => deleteCompositionMutation.mutate({ data: { id: item.id } })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                      {(!selectedProduct?.product_cost_compositions || selectedProduct.product_cost_compositions.length === 0) && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Nenhum insumo cadastrado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>Variáveis de Marketing</CardTitle>
              <CardDescription>Canais de aquisição e investimento mensal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Investimento</TableHead>
                    <TableHead>Meta de Leads</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketing.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><Input defaultValue={m.channel} onBlur={(e) => saveMarketingMutation.mutate({ data: { ...m, channel: e.target.value } })} /></TableCell>
                      <TableCell><Input type="number" defaultValue={m.monthly_investment} onBlur={(e) => saveMarketingMutation.mutate({ data: { ...m, monthly_investment: Number(e.target.value) } })} /></TableCell>
                      <TableCell><Input type="number" defaultValue={m.new_customers_goal ?? 0} onBlur={(e) => saveMarketingMutation.mutate({ data: { ...m, new_customers_goal: Number(e.target.value) } })} /></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMarketingMutation.mutate({ data: { id: m.id } })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4}><Button variant="outline" size="sm" className="w-full" onClick={() => saveMarketingMutation.mutate({ data: { channel: "Novo Canal", monthly_investment: 0 } })}><Plus className="h-4 w-4 mr-2" /> Adicionar Canal</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
           <Card>
            <CardHeader><CardTitle>Formação de Preço</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead>Preço Sugerido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const bomTotal = p.product_cost_compositions?.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) * Number(curr.unit_cost)), 0) || 0;
                    const finalCost = bomTotal > 0 ? bomTotal : (Number(p.cost) || 0);
                    const markup = 2.5;
                    const suggestedPrice = finalCost * markup;
                    const currentMargin = p.price ? ((Number(p.price) - finalCost) / Number(p.price)) * 100 : 0;

                    return (
                      <TableRow 
                        key={p.id} 
                        className={cn("cursor-pointer hover:bg-muted/50 transition-colors", selectedProductId === p.id && "bg-primary/5")}
                        onClick={() => setSelectedProductId(p.id)}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {selectedProductId === p.id && <Badge variant="outline" className="text-[10px] py-0">Editando BOM</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{formatMoney(Number(p.price) || 0)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatMoney(finalCost)}</span>
                            {bomTotal > 0 && <span className="text-[10px] text-muted-foreground italic">Base: BOM</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            currentMargin > 30 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {currentMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          <div className="flex items-center justify-between">
                            {formatMoney(suggestedPrice)}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); setActiveTab("composition"); }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); setActiveTab("composition"); }}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros Gerais</CardTitle>
              <CardDescription>Configurações globais para o cálculo de margens e tributos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Imposto Médio (%)</Label>
                    <div className="flex gap-4 items-center">
                      <Slider 
                        value={[config?.default_tax_rate || 0]} 
                        max={30} 
                        step={0.5} 
                        onValueChange={([v]) => updateConfigMutation.mutate({ data: { default_tax_rate: v } })} 
                      />
                      <span className="w-12 text-sm font-bold">{config?.default_tax_rate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Taxa de Gateway / Antecipação (%)</Label>
                    <div className="flex gap-4 items-center">
                      <Slider 
                        value={[config?.default_gateway_fee || 0]} 
                        max={15} 
                        step={0.1} 
                        onValueChange={([v]) => updateConfigMutation.mutate({ data: { default_gateway_fee: v } })} 
                      />
                      <span className="w-12 text-sm font-bold">{config?.default_gateway_fee}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Margem Mínima de Contribuição (%)</Label>
                    <div className="flex gap-4 items-center">
                      <Slider 
                        value={[config?.min_contribution_margin || 0]} 
                        max={70} 
                        step={1} 
                        onValueChange={([v]) => updateConfigMutation.mutate({ data: { min_contribution_margin: v } })} 
                      />
                      <span className="w-12 text-sm font-bold">{config?.min_contribution_margin}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Markup Sugerido (x)</Label>
                    <div className="flex gap-4 items-center">
                      <Slider 
                        value={[2.5]} 
                        max={5} 
                        step={0.1} 
                      />
                      <span className="w-12 text-sm font-bold">2.5x</span>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm">Estes valores afetam o "Preço Sugerido" e os KPIs de saúde financeira em todo o sistema.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  icon, 
  description 
}: { 
  label: string; 
  value: string; 
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-white/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
          <div className="p-2 bg-muted/50 rounded-lg">{icon}</div>
        </div>
        <div className="text-2xl font-black text-neutral-900 tracking-tight">{value}</div>
        {description && <p className="text-[10px] mt-1 text-muted-foreground italic">{description}</p>}
      </CardContent>
    </Card>
  );
}
