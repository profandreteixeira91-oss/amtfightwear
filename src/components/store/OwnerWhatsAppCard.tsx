import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import { adminGetOwnerWhatsAppStatus, adminSendOwnerWhatsAppTest } from "@/lib/store/whatsapp-admin.functions";

const STATE_LABEL: Record<string, string> = {
  open: "Conectado",
  connecting: "Conectando…",
  close: "Desconectado — leia o QR Code de novo",
};

/** WhatsApp da loja via Evolution API: avisos ao dono (pedido pago) e aos clientes (status). */
export function OwnerWhatsAppCard() {
  const getStatus = useServerFn(adminGetOwnerWhatsAppStatus);
  const sendTest = useServerFn(adminSendOwnerWhatsAppTest);
  const status = useQuery({ queryKey: ["admin", "owner-whatsapp"], queryFn: () => getStatus() });

  const test = useMutation({
    mutationFn: () => sendTest(),
    onSuccess: (r) => {
      if (r.sent > 0) toast.success(`Teste enviado para ${r.sent} número(s). Confira o WhatsApp.`);
      else toast.error(r.errors[0] ?? "Nada foi enviado.");
      if (r.sent > 0 && r.errors.length) toast.warning(`Falhou em ${r.errors.length} número(s): ${r.errors[0]}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao enviar o teste."),
  });

  const s = status.data;
  const connected = s?.state === "open";
  const ready = !!s?.configured && connected && (s?.recipients.length ?? 0) > 0;
  const steps = [
    { done: !!s?.configured, text: "Evolution API configurada (EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE)" },
    {
      done: connected,
      text: s?.configured
        ? `Instância "${s.instance}": ${s.state ? STATE_LABEL[s.state] ?? s.state : "sem resposta"}`
        : "Número da loja conectado à instância (QR Code no painel da Evolution)",
    },
    { done: (s?.recipients.length ?? 0) > 0, text: "Seu número em WHATSAPP_ADMIN_TO (mais de um? separe por vírgula)" },
  ];

  return (
    <SectionCard
      title="WhatsApp da loja"
      description="Você recebe um aviso quando um pedido é pago (com itens e nome a bordar), e o cliente recebe as atualizações de pagamento, produção, envio e entrega."
      action={
        <span
          className={
            ready
              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          }
        >
          {status.isLoading ? "Verificando…" : ready ? "Ativo" : "Pendente"}
        </span>
      }
    >
      <div className="space-y-5">
        <ul className="space-y-2.5">
          {steps.map((st) => (
            <li key={st.text} className="flex items-start gap-2.5 text-sm">
              {st.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
              )}
              <span className={st.done ? "text-foreground" : "text-muted-foreground"}>{st.text}</span>
            </li>
          ))}
        </ul>

        {s && s.recipients.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Avisos de pedido pago para: <span className="font-medium text-foreground">{s.recipients.join(", ")}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => test.mutate()} disabled={!ready || test.isPending} className="rounded-full">
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar teste
          </Button>
          <Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching} className="rounded-full">
            <RefreshCw className={status.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Verificar conexão
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> O teste usa um pedido fictício.
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
