import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, MessageSquare, ShoppingCart, Link2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getSalesAnalytics } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales/analytics")({
  component: SalesAnalyticsPage,
});

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function SalesAnalyticsPage() {
  const get = useServerFn(getSalesAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["sales-analytics"], queryFn: () => get() });

  const conversion = data && data.total > 0 ? ((data.purchased / data.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics do SalesBot"
        description="Desempenho do agente nos últimos 30 dias."
      />

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={MessageSquare} label="Conversas" value={data.total} />
            <Metric icon={ShoppingCart} label="Com carrinho" value={data.withCart} />
            <Metric icon={Link2} label="Checkouts enviados" value={data.linksSent} />
            <Metric icon={CheckCircle2} label="Conversão" value={`${conversion}%`} />
          </div>

          <SectionCard title="Por canal">
            <ul className="space-y-2">
              {Object.entries(data.byChannel).map(([ch, n]) => (
                <li key={ch} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{ch}</span>
                  <span className="font-mono">{n}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Receita atribuída">
            <div className="text-3xl font-bold">
              R$ {Number(data.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              A confirmação de compra depende da integração com o webhook da loja WooCommerce.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}
