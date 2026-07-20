// Painel de gerenciamento de contas de pagamento conectadas.
// Fornece Gerenciar / Reconfigurar / Desconectar com confirmação e histórico completo.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Landmark,
  Wallet,
  CreditCard,
  ShieldCheck,
  Building2,
  Settings2,
  RefreshCw,
  Unplug,
  History,
  AlertTriangle,
  Sparkles,
  Plug,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { listMyGateways, deleteMyGateway, listMyGatewayHistory } from "@/lib/dojo/gateways.functions";

const PROVIDER_META: Record<string, { name: string; icon: any; color: string }> = {
  asaas: { name: "Asaas", icon: Landmark, color: "text-emerald-600 bg-emerald-500/10" },
  mercadopago: { name: "Mercado Pago", icon: Wallet, color: "text-sky-600 bg-sky-500/10" },
  stripe: { name: "Stripe", icon: CreditCard, color: "text-violet-600 bg-violet-500/10" },
  pagseguro: { name: "PagSeguro", icon: ShieldCheck, color: "text-orange-600 bg-orange-500/10" },
  inter: { name: "Banco Inter", icon: Building2, color: "text-amber-600 bg-amber-500/10" },
};

const ACTION_LABEL: Record<string, string> = {
  connected: "Conectado",
  reconfigured: "Reconfigurado",
  disconnected: "Desconectado",
};

export function GatewayAccountsPanel({
  onConnect,
  onReconfigure,
}: {
  onConnect: () => void;
  onReconfigure: (provider: string) => void;
}) {
  const qc = useQueryClient();
  const listGw = useServerFn(listMyGateways);
  const listHist = useServerFn(listMyGatewayHistory);
  const del = useServerFn(deleteMyGateway);

  const gwQ = useQuery({ queryKey: ["dojo-gateways"], queryFn: () => listGw() });
  const histQ = useQuery({ queryKey: ["dojo-gw-history"], queryFn: () => listHist() });

  const [tab, setTab] = useState<"accounts" | "history">("accounts");
  const [confirmReconf, setConfirmReconf] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const accounts = (gwQ.data ?? []) as any[];

  async function handleDelete(provider: string) {
    setDeleting(true);
    try {
      await del({ data: { provider: provider as any } });
      toast.success("Integração removida. Histórico financeiro preservado.");
      qc.invalidateQueries({ queryKey: ["dojo-gateways"] });
      qc.invalidateQueries({ queryKey: ["dojo-gw-history"] });
      qc.invalidateQueries({ queryKey: ["dojo-int-metrics"] });
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao remover integração");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <TabBtn active={tab === "accounts"} onClick={() => setTab("accounts")} icon={Plug}>
          Contas de Pagamento
          {accounts.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px]">{accounts.length}</Badge>
          )}
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={History}>
          Histórico
        </TabBtn>
      </div>

      {tab === "accounts" ? (
        accounts.length === 0 ? (
          <EmptyAccounts onConnect={onConnect} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onManage={onConnect}
                onReconfigure={() => setConfirmReconf(acc.provider)}
                onDisconnect={() => setConfirmDelete(acc.provider)}
              />
            ))}
          </div>
        )
      ) : (
        <HistoryList items={histQ.data ?? []} loading={histQ.isLoading} />
      )}

      {/* Reconfirmação: reconfigurar */}
      <AlertDialog open={!!confirmReconf} onOpenChange={(v) => !v && setConfirmReconf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" /> Reconfigurar integração
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Esta ação irá substituir a configuração atual desta integração.</span>
              <span className="block">As cobranças já emitidas não serão alteradas.</span>
              <span className="block">As novas cobranças utilizarão a nova configuração.</span>
              <span className="block font-medium mt-2">Deseja continuar?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const p = confirmReconf!;
                setConfirmReconf(null);
                onReconfigure(p);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação: desconectar */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> Atenção
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Ao remover esta integração:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Novas cobranças não poderão ser emitidas.</li>
                  <li>As cobranças já existentes permanecerão registradas.</li>
                  <li>O histórico financeiro será preservado.</li>
                  <li>Nenhum dado financeiro será apagado.</li>
                </ul>
                <p className="font-medium mt-2">Deseja realmente remover esta integração?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) handleDelete(confirmDelete);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Removendo..." : "Remover Integração"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function EmptyAccounts({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Plug className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Nenhuma conta conectada.</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Conecte um gateway de pagamento para começar a emitir cobranças aos seus alunos.
          </p>
        </div>
        <Button onClick={onConnect}>
          <Sparkles className="h-4 w-4 mr-1.5" /> Conectar Conta
        </Button>
      </CardContent>
    </Card>
  );
}

function AccountCard({
  account,
  onManage,
  onReconfigure,
  onDisconnect,
}: {
  account: any;
  onManage: () => void;
  onReconfigure: () => void;
  onDisconnect: () => void;
}) {
  const meta = PROVIDER_META[account.provider] ?? {
    name: account.provider,
    icon: Wallet,
    color: "text-muted-foreground bg-muted",
  };
  const Icon = meta.icon;
  const online = account.active;

  return (
    <Card className={cn("relative overflow-hidden", online && "border-emerald-500/40")}>
      <div
        className={cn(
          "absolute top-0 right-0 h-24 w-24 rounded-full blur-3xl pointer-events-none",
          online ? "bg-emerald-500/10" : "bg-muted/40",
        )}
      />
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", meta.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{meta.name}</CardTitle>
                {account.is_default && <Badge variant="secondary" className="text-[10px]">Principal</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {account.label ?? "Conta conectada"}
              </div>
            </div>
          </div>
          <Badge
            className={cn(
              "shrink-0",
              online
                ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted",
            )}
          >
            {online ? "🟢 Conectada" : "⚪ Inativa"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="flex flex-wrap items-center gap-1.5">
          <MethodPill label="PIX" on={online} />
          <MethodPill label="Cartão" on={online} />
          <MethodPill label="Boleto" on={online} />
        </div>

        <div className="text-[11px] text-muted-foreground border-t pt-2">
          Última sincronização: {account.updated_at ? new Date(account.updated_at).toLocaleString("pt-BR") : "—"}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onManage} className="flex-1 min-w-[100px]">
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Gerenciar
          </Button>
          <Button size="sm" variant="outline" onClick={onReconfigure} className="flex-1 min-w-[100px]">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reconfigurar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDisconnect}
            className="flex-1 min-w-[110px] text-red-600 hover:text-red-700 hover:bg-red-500/5 border-red-500/30"
          >
            <Unplug className="h-3.5 w-3.5 mr-1" /> Desconectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodPill({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <CheckCircle2 className="h-2.5 w-2.5" /> {label}
    </span>
  );
}

function HistoryList({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) {
    return <div className="text-sm text-muted-foreground py-6 text-center">Carregando histórico…</div>;
  }
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhum evento registrado. As conexões, reconfigurações e desconexões aparecerão aqui.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {items.map((it) => {
          const meta = PROVIDER_META[it.provider] ?? { name: it.provider, icon: Wallet, color: "" };
          const Icon = meta.icon;
          const actionColor =
            it.action === "connected"
              ? "text-emerald-600 dark:text-emerald-400"
              : it.action === "disconnected"
                ? "text-red-600 dark:text-red-400"
                : "text-sky-600 dark:text-sky-400";
          return (
            <div key={it.id} className="flex items-start gap-3 p-3">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", meta.color || "bg-muted")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{meta.name}</span>
                  <Badge variant="outline" className={cn("text-[10px]", actionColor)}>
                    {ACTION_LABEL[it.action] ?? it.action}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(it.created_at).toLocaleString("pt-BR")}
                  {it.actor_email && <> · por {it.actor_email}</>}
                </div>
                {it.reason && <div className="text-xs mt-1 italic">"{it.reason}"</div>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
