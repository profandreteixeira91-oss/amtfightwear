import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight,
  Clock,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBillingOrders } from "@/lib/fiscal/FiscalOrderService";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/fiscal/pedidos")({
  component: FiscalOrdersPage,
});

function FiscalOrdersPage() {
  const fetchBillingOrders = useServerFn(listBillingOrders);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["fiscal-billing-orders"],
    queryFn: () => fetchBillingOrders(),
  });

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter(o => {
      const matchesSearch = 
        String(o.number).toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_document.includes(search);
      
      const matchesType = filterType === "all" || o.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [orders, search, filterType]);

  const stats = useMemo(() => {
    const arr = orders as any[];
    return {
      pending: arr.filter(o => o.fiscal_status === "pending").length,
      ready: arr.filter(o => o.fiscal_status === "ready").length,
      emitting: arr.filter(o => o.fiscal_status === "emitting").length,
      authorized: arr.filter(o => o.fiscal_status === "authorized").length,
    };
  }, [orders]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/admin/fiscal" className="hover:text-foreground transition-colors">Fiscal</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">Pedidos para Faturamento</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Central de Faturamento</h1>
            <p className="text-muted-foreground">Gerencie pedidos da loja e orçamentos aguardando emissão de NF-e.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avançados
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Aguardando" value={stats.pending} icon={Clock} color="amber" />
          <StatCard title="Prontos" value={stats.ready} icon={CheckCircle2} color="blue" />
          <StatCard title="Emitindo" value={stats.emitting} icon={Receipt} color="purple" />
          <StatCard title="Autorizados" value={stats.authorized} icon={ShieldCheck} color="emerald" />
        </div>

        <Card className="border-neutral-200/60 shadow-sm overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por número, cliente ou CPF/CNPJ..." 
                  className="pl-9 h-10 ring-offset-background focus-visible:ring-1 focus-visible:ring-red-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={filterType === "all" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFilterType("all")}
                  className={cn("h-9", filterType === "all" && "bg-neutral-900 text-white")}
                >
                  Todos
                </Button>
                <Button 
                  variant={filterType === "store_order" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFilterType("store_order")}
                  className={cn("h-9", filterType === "store_order" && "bg-neutral-900 text-white")}
                >
                  Loja
                </Button>
                <Button 
                  variant={filterType === "quote" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFilterType("quote")}
                  className={cn("h-9", filterType === "quote" && "bg-neutral-900 text-white")}
                >
                  Orçamentos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-4">Pedido</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4">Status Fiscal</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="h-20 px-6 py-4 bg-neutral-50/10" />
                      </tr>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-muted-foreground italic">
                        Nenhum pedido encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o: any) => (
                      <tr key={`${o.type}-${o.id}`} className="group hover:bg-neutral-50/50 transition-all duration-200">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900">#{o.number}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5 py-0 h-4 border-none font-bold",
                                o.type === "store_order" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                              )}>
                                {o.type === "store_order" ? "Loja" : "Orçamento"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(o.date), "dd/MM/yy")}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-800">{o.customer_name}</span>
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">{o.customer_document || "Sem docto."}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-neutral-700 font-medium">{o.city || "—"}</span>
                            <span className="text-xs text-muted-foreground uppercase">{o.state || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-bold text-neutral-900 tabular-nums">
                            {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={o.fiscal_status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-neutral-100 text-neutral-400 hover:text-red-600 rounded-full transition-colors" asChild>
                            <Link to={`/admin/fiscal?orderId=${o.id}&type=${o.type}`}>
                              <ChevronRight className="h-5 w-5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: 'amber' | 'blue' | 'purple' | 'emerald' }) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 border-amber-100/50",
    blue: "bg-blue-50 text-blue-600 border-blue-100/50",
    purple: "bg-purple-50 text-purple-600 border-purple-100/50",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
  };

  return (
    <Card className="border-neutral-200/60 shadow-sm overflow-hidden bg-white transition-all hover:shadow-md group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-black mt-2 text-neutral-900 tabular-nums tracking-tight">{value}</h3>
          </div>
          <div className={cn("p-3.5 rounded-2xl border transition-transform group-hover:scale-110 duration-300", colors[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string, className: string }> = {
    pending: { label: "Aguardando", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    ready: { label: "Pronto", className: "bg-blue-50 text-blue-600 border-blue-100" },
    emitting: { label: "Emitindo", className: "bg-purple-50 text-purple-600 border-purple-100" },
    authorized: { label: "Autorizada", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    rejected: { label: "Rejeitada", className: "bg-red-50 text-red-600 border-red-100" },
    error: { label: "Erro", className: "bg-red-50 text-red-600 border-red-100" },
  };

  const config = configs[status] || configs.pending;

  return (
    <Badge variant="outline" className={cn("px-2.5 py-0.5 font-black text-[10px] uppercase tracking-[0.1em] border shadow-none", config.className)}>
      {config.label}
    </Badge>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
