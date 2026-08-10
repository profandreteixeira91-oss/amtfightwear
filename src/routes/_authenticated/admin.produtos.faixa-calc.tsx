import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DollarSign, 
  Package, 
  Layers, 
  Truck, 
  PieChart,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Settings,
  Info,
  Calculator,
  Save,
  AlertTriangle,
  RefreshCw,
  Edit2,
  ChevronRight
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
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/admin/produtos/faixa-calc")({
  component: CalculatorV2,
});

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

  const { data: config } = useSuspenseQuery({ queryKey: ["pricing-config"], queryFn: () => fetchConfig() });
  const { data: expensesData } = useSuspenseQuery({ queryKey: ["fixed-expenses"], queryFn: () => fetchExpenses() });
  const { data: marketingData } = useSuspenseQuery({ queryKey: ["marketing-investments"], queryFn: () => fetchMarketing() });
  const { data: productsData } = useSuspenseQuery({ queryKey: ["all-product-pricing"], queryFn: () => fetchProducts() });
  const { data: allStoreCategories } = useSuspenseQuery({ queryKey: ["store-categories"], queryFn: () => fetchCategories() });

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const updateConfigMutation = useMutation({
    mutationFn: (args: { data: any }) => updateConfigFn(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-config"] });
      toast.success("Configurações salvas!");
    }
  });

  const totalFixedExpenses = (expensesData || []).reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
  const proLabore = config?.desired_pro_labore || 0;
  const totalMonthlyCost = totalFixedExpenses + proLabore;
  const productionEstimate = config?.monthly_production_estimate || 500;
  const fixedCostRate = productionEstimate > 0 ? (totalMonthlyCost / productionEstimate) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-black text-foreground">Calculadora de Preço Comercial</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Custo Fixo por Unidade</p>
                  <p className="text-2xl font-black">{formatMoney(fixedCostRate)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Pró-labore por Unidade</p>
                  <p className="text-2xl font-black">{formatMoney(proLabore / productionEstimate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pró-labore Mensal (R$)</Label>
                  <Input type="number" defaultValue={config?.desired_pro_labore} onBlur={(e) => updateConfigMutation.mutate({ data: { desired_pro_labore: Number(e.target.value) } })} />
                </div>
                <div className="space-y-2">
                  <Label>Produção Estimada (Unidades)</Label>
                  <Input type="number" defaultValue={config?.monthly_production_estimate} onBlur={(e) => updateConfigMutation.mutate({ data: { monthly_production_estimate: Number(e.target.value) } })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
