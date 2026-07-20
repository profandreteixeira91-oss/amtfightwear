import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Hourglass, CalendarDays, CalendarClock, Users, FileText, ShieldAlert, RefreshCw } from "lucide-react";
import { getWalletDashboard } from "@/lib/dojo/amtpay.functions";

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AMTPayDashboard() {
  const fn = useServerFn(getWalletDashboard);
  const q = useQuery({ queryKey: ["amtpay-dashboard"], queryFn: () => fn() });

  const d = q.data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon={Wallet}       label="Saldo disponível"       value={brl(d?.balance.available ?? 0)}      tone="primary" />
      <MetricCard icon={Hourglass}    label="Saldo a receber"        value={brl(d?.balance.pending ?? 0)}        tone="warning" />
      <MetricCard icon={CalendarDays} label="Recebimentos hoje"      value={brl(d?.receiptsToday ?? 0)}          tone="success" />
      <MetricCard icon={CalendarClock} label="Recebimentos do mês"   value={brl(d?.receiptsMonth ?? 0)}          tone="success" />
      <MetricCard icon={Users}        label="Mensalidades ativas"    value={String(d?.activeSubscriptions ?? 0)} tone="muted" />
      <MetricCard icon={FileText}     label="Cobranças em aberto"    value={String(d?.openInvoices ?? 0)}        tone="muted" />
      <MetricCard icon={ShieldAlert}  label="Inadimplência"          value={brl(d?.overdueAmount ?? 0)}          tone="danger" />
      <MetricCard icon={RefreshCw}    label="Última sincronização"
        value={d?.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString("pt-BR") : "—"} tone="muted" small />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  small,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  small?: boolean;
}) {
  const toneMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-500/10",
    warning: "text-amber-600 bg-amber-500/10",
    danger: "text-red-600 bg-red-500/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
          <div className={`font-semibold tracking-tight ${small ? "text-sm" : "text-lg"}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
