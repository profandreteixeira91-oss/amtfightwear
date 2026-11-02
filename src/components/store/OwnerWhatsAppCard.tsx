import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import { adminGetOwnerWhatsAppStatus, adminSendOwnerWhatsAppTest } from "@/lib/store/whatsapp-admin.functions";

const TEMPLATE_BODY =
  "Novo pedido pago na loja AMT Fight Wear.\nPedido: {{1}}\nCliente: {{2}}\nTotal: {{3}}\nItens: {{4}}";

/** Aviso de "pedido pago" no WhatsApp do dono, via WhatsApp Cloud API (Meta). */
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
  const ready = !!s?.hasCredentials && (s?.recipients.length ?? 0) > 0;
  const steps = [
    { done: !!s?.hasCredentials, text: "Credenciais da Cloud API (WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID)" },
    {
      done: (s?.recipients.length ?? 0) > 0,
      text: "Seu número em WHATSAPP_ADMIN_TO (mais de um? separe por vírgula)",
    },
    { done: false, text: `Template "${s?.template ?? "novo_pedido_pago"}" aprovado na Meta (categoria Utilidade, ${s?.language ?? "pt_BR"})` },
  ];

  return (
    <SectionCard
      title="Aviso de pedido pago no WhatsApp"
      description="Quando um pagamento é confirmado, você recebe no celular o número do pedido, o cliente, o total e os itens (com o nome a bordar, se houver)."
      action={
        <span
          className={
            ready
              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          }
        >
          {status.isLoading ? "Verificando…" : ready ? "Configurado" : "Não configurado"}
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
            Enviando para: <span className="font-medium text-foreground">{s.recipients.join(", ")}</span>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Texto do template para cadastrar na Meta</div>
          <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed ring-1 ring-neutral-200">
            {TEMPLATE_BODY}
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => test.mutate()} disabled={!ready || test.isPending} className="rounded-full">
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar teste
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> O teste usa um pedido fictício.
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
