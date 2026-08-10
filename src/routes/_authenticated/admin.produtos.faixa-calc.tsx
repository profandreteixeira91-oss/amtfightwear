import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calculator, 
  Settings, 
  TrendingUp, 
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
  Save,
  Info
} from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getPricingConfig, 
  getFixedExpenses, 
  getMarketingInvestments, 
  listAllProductPricing,
  saveFixedExpense,
  deleteFixedExpense,
  saveMarketingInvestment,
  deleteMarketingInvestment,
  updatePricingConfig
} from "@/lib/store/pricing-calculator.functions";
import { formatMoney } from "@/lib/store/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/admin/produtos/faixa-calc")({
  component: CalculatorV2,
});

function CalculatorV2() {
  const queryClient = useQueryClient();
  const { data: config } = useSuspenseQuery({ queryKey: ["pricing-config"], queryFn: () => getPricingConfig() });
  const { data: expenses } = useSuspenseQuery({ queryKey: ["fixed-expenses"], queryFn: () => getFixedExpenses() });
  const { data: marketing } = useSuspenseQuery({ queryKey: ["marketing-investments"], queryFn: () => getMarketingInvestments() });
  const { data: products } = useSuspenseQuery({ queryKey: ["all-product-pricing"], queryFn: () => listAllProductPricing() });

  const [activeTab, setActiveTab] = useState("overview");

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: updatePricingConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-config"] });
      toast.success("Configurações salvas!");
    }
  });

  const saveExpenseMutation = useMutation({
    mutationFn: saveFixedExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Despesa salva!");
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteFixedExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Despesa removida!");
    }
  });

  // Totals calculations
  const totalFixedExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.value, 0), [expenses]);
  const totalMarketing = useMemo(() => marketing.reduce((acc, curr) => acc + curr.monthly_investment, 0), [marketing]);
  
  // Média de margem de contribuição (mock ou calculada a partir dos produtos)
  const avgContributionMargin = 40; // 40% como base para ponto de equilíbrio
  const breakEvenPoint = totalFixedExpenses / (avgContributionMargin / 100);

  return (
    <PageShell
      title="Dojo Manager Finance"
      description="Formação de Preço Baseada em Lucro Real e Ponto de Equilíbrio"
      eyebrow="Calculadora V2"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full overflow-x-auto inline-flex whitespace-nowrap">
          <TabsTrigger value="overview" className="gap-2"><PieChart className="h-4 w-4" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="composition" className="gap-2"><Layers className="h-4 w-4" /> Composição</TabsTrigger>
          <TabsTrigger value="variables" className="gap-2"><Truck className="h-4 w-4" /> Variáveis</TabsTrigger>
          <TabsTrigger value="fixed" className="gap-2"><DollarSign className="h-4 w-4" /> Despesas Fixas</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2"><Target className="h-4 w-4" /> Formação</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" /> Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
              label="Despesas Fixas Totais" 
              value={formatMoney(totalFixedExpenses)} 
              icon={<DollarSign className="text-red-500" />} 
            />
            <MetricCard 
              label="Investimento Marketing" 
              value={formatMoney(totalMarketing)} 
              icon={<TrendingUp className="text-blue-500" />} 
            />
            <MetricCard 
              label="Ponto de Equilíbrio" 
              value={formatMoney(breakEvenPoint)} 
              icon={<Target className="text-orange-500" />}
              description={`Com margem média de ${avgContributionMargin}%`}
            />
            <MetricCard 
              label="CAC Médio Estimado" 
              value={formatMoney(totalMarketing / 100 || 0)} 
              icon={<Package className="text-green-500" />} 
              description="Base: 100 novos clientes/mês"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Margens por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Kimono", "Rashguard", "Faixa"].map(cat => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{cat}</span>
                        <span>42%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '42%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Alertas de Rentabilidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex gap-3 text-sm text-red-800">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <p><strong>Rashguard Infantil:</strong> Margem líquida abaixo de 10%. Verificar custos de costura.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100 flex gap-3 text-sm text-yellow-800">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                    <p><strong>Faixa Pro:</strong> Preço de atacado muito próximo ao custo direto.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fixed">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Gestão de Despesas Fixas Mensais</CardTitle>
              <Button size="sm" onClick={() => saveExpenseMutation.mutate({ name: "Nova Despesa", value: 0 })}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Input 
                          defaultValue={expense.name} 
                          onBlur={(e) => saveExpenseMutation.mutate({ ...expense, name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>{expense.category || "Geral"}</TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          defaultValue={expense.value} 
                          onBlur={(e) => saveExpenseMutation.mutate({ ...expense, value: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpenseMutation.mutate({ id: expense.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                        Nenhuma despesa fixa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs Content would go here... */}
        <TabsContent value="composition">
           <Card>
            <CardHeader>
              <CardTitle>Composição Industrial (BOM)</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
              <div className="text-center space-y-2">
                <Info className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Selecione um produto no Ranking para editar sua composição detalhada.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pricing">
           <Card>
            <CardHeader>
              <CardTitle>Ranking de Rentabilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Custo Direto</TableHead>
                    <TableHead>M. Contrib.</TableHead>
                    <TableHead>Lucro Líq.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                      <TableCell>{formatMoney(p.price)}</TableCell>
                      <TableCell>{formatMoney(p.cost)}</TableCell>
                      <TableCell className="text-green-600 font-medium">40%</TableCell>
                      <TableCell className="text-blue-600 font-medium">25%</TableCell>
                      <TableCell>
                        <div className="h-2 w-8 bg-green-500 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
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
