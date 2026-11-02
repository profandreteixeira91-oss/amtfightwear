import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { adminListTrackingNotifications, adminSendTrackingWhatsApp } from "@/lib/store/whatsapp-admin.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const BATCH = 5;

/**
 * Envia o código de rastreio no WhatsApp para os pedidos já enviados. Por padrão
 * marca só quem ainda não recebeu o código atual; dá para reenviar marcando manualmente.
 */
export function TrackingWhatsAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): React.ReactNode {
  const listFn = useServerFn(adminListTrackingNotifications);
  const sendFn = useServerFn(adminSendTrackingWhatsApp);
  const query = useQuery({ queryKey: ["admin", "store", "tracking-whatsapp"], queryFn: () => listFn(), enabled: open, staleTime: 0 });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const sendable = rows.filter((r) => r.tracking && r.phone_ok);
  const selected = picked ?? new Set(sendable.filter((r) => !r.sent_at).map((r) => r.id));
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setPicked(next);
  };

  const send = async () => {
    const ids = [...selected];
    let ok = 0;
    const failed: string[] = [];
    setProgress({ done: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const { results } = await sendFn({ data: { order_ids: ids.slice(i, i + BATCH), force: true } });
        for (const r of results) {
          if (r.ok) ok++;
          else failed.push(`${rows.find((x) => x.id === r.id)?.order_number ?? r.id}: ${r.error ?? "falha"}`);
        }
        setProgress({ done: Math.min(i + BATCH, ids.length), total: ids.length });
      }
    } catch (e) {
      failed.push(e instanceof Error ? e.message : "Erro no envio");
    } finally {
      setProgress(null);
      setPicked(null);
      await query.refetch();
    }
    if (ok) toast.success(`Rastreio enviado para ${ok} cliente${ok > 1 ? "s" : ""}`);
    if (failed.length) toast.error(`Não enviados: ${failed.slice(0, 4).join(" · ")}${failed.length > 4 ? "…" : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!progress) { onOpenChange(o); setPicked(null); } }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rastreio no WhatsApp</DialogTitle>
          <DialogDescription>
            Pedidos enviados e o aviso do código de rastreio ao cliente. Novos envios recebem o código automaticamente.
          </DialogDescription>
        </DialogHeader>

        {query.isPending ? (
          <div role="status" className="flex items-center gap-2 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando pedidos e códigos no Melhor Envio…
          </div>
        ) : query.error ? (
          <p role="alert" className="text-sm text-destructive">{query.error.message}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido com status Enviado.</p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {rows.map((r) => {
              const can = !!r.tracking && r.phone_ok;
              return (
                <label key={r.id} className="flex cursor-pointer items-start gap-3 p-3 has-[:disabled]:cursor-default">
                  <Checkbox
                    className="mt-0.5"
                    disabled={!can || !!progress}
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => toggle(r.id, v === true)}
                    aria-label={`Enviar rastreio do pedido ${r.order_number}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">{r.order_number} · {r.customer_name ?? "—"}</span>
                      <span className="font-mono text-xs">{r.tracking ?? "sem código"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {!r.tracking
                        ? "Sem código de rastreio — informe no pedido."
                        : !r.phone_ok
                          ? "Cliente sem WhatsApp válido."
                          : r.sent_at
                            ? `Enviado em ${new Date(r.sent_at).toLocaleString("pt-BR")}`
                            : "Ainda não recebeu este código."}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" disabled={!!progress} onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button disabled={!!progress || selected.size === 0} onClick={send}>
            {progress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            {progress ? `Enviando ${progress.done}/${progress.total}…` : `Enviar para ${selected.size} cliente${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
