import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2, LogOut, QrCode, RefreshCw, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/SectionCard";
import { useConfirm } from "@/components/common/ConfirmDialog";
import {
  adminConnectStoreWhatsApp,
  adminDisconnectStoreWhatsApp,
  adminGetOwnerWhatsAppStatus,
  adminSendOwnerWhatsAppTest,
} from "@/lib/store/whatsapp-admin.functions";

const formatPhone = (digits: string) => {
  const d = digits.replace(/^55/, "");
  return d.length >= 10 ? `+55 (${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : `+${digits}`;
};

/** WhatsApp da loja (Evolution API): conexão do número, avisos ao dono e aos clientes. */
export function OwnerWhatsAppCard() {
  const qc = useQueryClient();
  const getStatus = useServerFn(adminGetOwnerWhatsAppStatus);
  const connectFn = useServerFn(adminConnectStoreWhatsApp);
  const disconnectFn = useServerFn(adminDisconnectStoreWhatsApp);
  const sendTest = useServerFn(adminSendOwnerWhatsAppTest);
  const [confirm, confirmDialog] = useConfirm();

  const [qr, setQr] = useState<{ base64: string | null; pairingCode: string | null } | null>(null);
  const [mode, setMode] = useState<"qr" | "code">("qr");
  const [phone, setPhone] = useState("");

  const status = useQuery({
    queryKey: ["admin", "owner-whatsapp"],
    queryFn: () => getStatus(),
    // Enquanto o QR/código está na tela, acompanha a conexão.
    refetchInterval: qr ? 3000 : false,
  });
  const s = status.data;
  const connected = s?.state === "open";

  useEffect(() => {
    if (qr && connected) {
      setQr(null);
      toast.success("WhatsApp da loja conectado!");
    }
  }, [qr, connected]);

  const connect = useMutation({
    mutationFn: (number?: string) => connectFn({ data: { number: number ?? null } }),
    onSuccess: (r) => {
      if (!r.base64 && !r.pairingCode) toast.error("O servidor não devolveu QR Code. Tente de novo em alguns segundos.");
      setQr(r);
      qc.invalidateQueries({ queryKey: ["admin", "owner-whatsapp"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível iniciar a conexão."),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("WhatsApp da loja desconectado.");
      qc.invalidateQueries({ queryKey: ["admin", "owner-whatsapp"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível desconectar."),
  });

  const test = useMutation({
    mutationFn: () => sendTest(),
    onSuccess: (r) => {
      if (r.sent > 0) toast.success(`Teste enviado para ${r.sent} número(s). Confira o WhatsApp.`);
      else toast.error(r.errors[0] ?? "Nada foi enviado.");
      if (r.sent > 0 && r.errors.length) toast.warning(`Falhou em ${r.errors.length} número(s): ${r.errors[0]}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao enviar o teste."),
  });

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: "Desconectar o WhatsApp da loja?",
      description: "Os avisos de pedido para você e para os clientes param até um número ser conectado de novo.",
      confirmLabel: "Desconectar",
      destructive: true,
    });
    if (ok) disconnect.mutate();
  };

  const steps = [
    { done: !!s?.configured, text: "Servidor de WhatsApp configurado (EVOLUTION_API_URL e EVOLUTION_API_KEY)" },
    { done: connected, text: "Número da loja conectado" },
    { done: (s?.recipients.length ?? 0) > 0, text: "Seu número em WHATSAPP_ADMIN_TO, para receber os avisos de pedido pago" },
  ];

  return (
    <SectionCard
      title="WhatsApp da loja"
      description="Você recebe um aviso quando um pedido é pago, com itens e nome a bordar, e o cliente recebe as atualizações de pagamento, produção, envio e entrega."
      action={
        <span
          className={
            connected
              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          }
        >
          {status.isLoading ? "Verificando…" : connected ? "Conectado" : "Desconectado"}
        </span>
      }
    >
      {confirmDialog}
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

        {s?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-destructive">Servidor de WhatsApp: {s.error}</p>}

        {/* Conectado */}
        {connected && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-600 ring-1 ring-emerald-100">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold">
                  {s?.connectedNumber ? formatPhone(s.connectedNumber) : "Número conectado"}
                </div>
                <div className="text-xs text-muted-foreground">{s?.profileName ?? `Instância ${s?.instance}`}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnect.isPending} className="rounded-full">
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar
            </Button>
          </div>
        )}

        {/* Conexão */}
        {s?.configured && !connected && (
          <div className="rounded-xl border border-neutral-200 p-4">
            {!qr ? (
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-neutral-100 p-1">
                  {(["qr", "code"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={
                        mode === m
                          ? "rounded-full bg-white px-3.5 py-1.5 text-xs font-medium shadow-sm"
                          : "rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {m === "qr" ? "QR Code" : "Código de pareamento"}
                    </button>
                  ))}
                </div>
                {mode === "code" && (
                  <div className="max-w-xs">
                    <label htmlFor="wa-phone" className="mb-1.5 block text-sm font-medium">
                      Número da loja (com DDD)
                    </label>
                    <Input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="82 99999-8888" />
                  </div>
                )}
                <Button
                  onClick={() => connect.mutate(mode === "code" ? phone : undefined)}
                  disabled={connect.isPending || (mode === "code" && phone.replace(/\D/g, "").length < 10)}
                  className="rounded-full"
                >
                  {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Conectar WhatsApp da loja
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                {qr.base64 && <img src={qr.base64} alt="QR Code do WhatsApp" className="h-56 w-56 rounded-lg ring-1 ring-neutral-200" />}
                <div className="space-y-2 text-sm">
                  {qr.pairingCode ? (
                    <>
                      <div className="font-semibold">Código de pareamento</div>
                      <div className="font-mono text-2xl font-bold tracking-[0.3em]">{qr.pairingCode}</div>
                      <p className="text-muted-foreground">
                        No celular da loja: WhatsApp › Aparelhos conectados › Conectar aparelho › Conectar com número de
                        telefone, e digite o código.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">Leia o QR Code com o celular da loja</div>
                      <p className="text-muted-foreground">WhatsApp › Aparelhos conectados › Conectar aparelho.</p>
                    </>
                  )}
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando a conexão…
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => connect.mutate(mode === "code" ? phone : undefined)}>
                      Gerar novo
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setQr(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {s && s.recipients.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Avisos de pedido pago para: <span className="font-medium text-foreground">{s.recipients.join(", ")}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => test.mutate()}
            disabled={!connected || (s?.recipients.length ?? 0) === 0 || test.isPending}
            className="rounded-full"
          >
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar teste
          </Button>
          <Button variant="outline" onClick={() => status.refetch()} disabled={status.isFetching} className="rounded-full">
            <RefreshCw className={status.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Verificar conexão
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
