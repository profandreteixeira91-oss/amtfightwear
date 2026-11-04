import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  UserPlus,
  Zap,
} from "lucide-react";
import {
  adminWaActivateInbox,
  adminWaCreateCustomer,
  adminWaGetChat,
  adminWaImportHistory,
  adminWaInboxStatus,
  adminWaListChats,
  adminWaMarkRead,
  adminWaMedia,
  adminWaQuickReplies,
  adminWaSaveQuickReplies,
  adminWaSendMedia,
  adminWaSendText,
  adminWaUpdateChat,
  type QuickReply,
  type WaChat,
  type WaMessage,
} from "@/lib/whatsapp/inbox.functions";
import { adminCrmCustomerProfile, adminCrmListCustomers } from "@/lib/store/crm.functions";
import { DEAL_STAGE_LABEL, SEGMENT_CLS, SEGMENT_LABEL, customerSegment, isClosedStage, type DealStage } from "@/lib/store/crm";
import { orderStatusLabel } from "@/lib/store/order-status";
import { QUOTE_STATUS_META } from "@/lib/store/quote-status";
import { DealDialog } from "@/components/store/crm/DealDialog";
import { PageShell } from "@/components/common/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/store/cart-store";
import { formatBR, todayISO } from "@/lib/dates";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  validateSearch: (s: Record<string, unknown>): { chat?: string; texto?: string } => ({
    chat: typeof s.chat === "string" && /^[0-9a-f-]{36}$/i.test(s.chat) ? s.chat : undefined,
    texto: typeof s.texto === "string" && s.texto.trim() ? s.texto.slice(0, 2000) : undefined,
  }),
  head: () => ({ meta: [{ title: "WhatsApp — AMT Fight Wear" }] }),
  component: WhatsAppInboxPage,
});

type Filter = "todas" | "nao_lidas" | "clientes" | "sem_cliente" | "retorno" | "arquivadas";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "nao_lidas", label: "Não lidas" },
  { key: "clientes", label: "Clientes" },
  { key: "sem_cliente", label: "Sem cadastro" },
  { key: "retorno", label: "Retorno agendado" },
  { key: "arquivadas", label: "Arquivadas" },
];
const CHAT_TAGS = ["Orçamento", "Pedido", "Pós-venda", "Cobrança", "Atacado", "Academia"];

const chatTitle = (c: WaChat) =>
  c.customer?.company || c.customer?.full_name || c.name || (c.phone_normalized ? `+${c.phone_normalized}` : "Contato do WhatsApp");
const time = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function WhatsAppInboxPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const listFn = useServerFn(adminWaListChats);
  const statusFn = useServerFn(adminWaInboxStatus);
  const [filter, setFilter] = useState<Filter>("todas");
  const [q, setQ] = useState("");
  const selected = search.chat ?? null;
  const select = (id: string | null) => void navigate({ search: id ? { chat: id } : {}, replace: true });

  const status = useQuery({ queryKey: ["admin", "wa", "status"], queryFn: () => statusFn(), refetchInterval: ADMIN_REFRESH.dashboard });
  const chats = useQuery({
    queryKey: ["admin", "wa", "chats", filter],
    queryFn: () => listFn({ data: { filter } }),
    refetchInterval: ADMIN_REFRESH.chat,
    placeholderData: keepPreviousData,
  });

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return (chats.data ?? []).filter(
      (c) =>
        !term ||
        chatTitle(c).toLowerCase().includes(term) ||
        (c.last_message_preview ?? "").toLowerCase().includes(term) ||
        (digits.length >= 4 && (c.phone_normalized ?? "").includes(digits)),
    );
  }, [chats.data, q]);
  const unread = (chats.data ?? []).filter((c) => c.unread_count > 0).length;

  return (
    <PageShell
      title="WhatsApp"
      description={
        status.data?.connected === false
          ? "Número da loja desconectado — conecte em Configurações › Notificações."
          : `Atendimento pelo número da loja · ${unread} conversa(s) não lida(s)`
      }
    >
      <InboxSetup />

      <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Lista */}
        <aside className={cn("flex min-h-0 flex-col border-r", selected && "hidden lg:flex")}>
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa" className="pl-9" />
            </div>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                    filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {chats.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando conversas…</p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa.</p>
            ) : (
              visible.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  className={cn("flex w-full gap-3 border-b px-3 py-2.5 text-left hover:bg-muted/50", selected === c.id && "bg-primary/5")}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {chatTitle(c).replace(/[^A-Za-zÀ-ú0-9]/g, "").slice(0, 1).toUpperCase() || "#"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", c.unread_count ? "font-bold" : "font-medium")}>{chatTitle(c)}</span>
                      <span className={cn("shrink-0 text-[11px]", c.unread_count ? "font-semibold text-emerald-700" : "text-muted-foreground")}>
                        {time(c.last_message_at)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.last_message_from_me ? "Você: " : ""}
                        {c.last_message_preview ?? ""}
                      </span>
                      {c.unread_count ? (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-600 px-1 text-[11px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      ) : null}
                    </span>
                    {c.customer || c.tags.length || c.follow_up_at ? (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {c.customer ? <span className="rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">Cliente</span> : null}
                        {c.tags.map((t) => (
                          <span key={t} className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                            {t}
                          </span>
                        ))}
                        {c.follow_up_at ? (
                          <span className={cn("rounded px-1.5 text-[10px]", c.follow_up_at <= todayISO() ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900")}>
                            Retorno {formatBR(c.follow_up_at)}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Conversa + ficha */}
        {selected ? (
          <Conversation key={selected} chatId={selected} draft={search.texto} onBack={() => select(null)} />
        ) : (
          <div className="hidden min-h-0 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground lg:flex xl:col-span-2">
            <MessageCircle className="h-10 w-10 text-emerald-600/40" />
            Escolha uma conversa para responder pelo admin.
          </div>
        )}
      </div>
    </PageShell>
  );
}

/** Ativa o webhook e importa o histórico (aparece só enquanto falta configurar). */
function InboxSetup() {
  const qc = useQueryClient();
  const statusFn = useServerFn(adminWaInboxStatus);
  const activateFn = useServerFn(adminWaActivateInbox);
  const importFn = useServerFn(adminWaImportHistory);
  const status = useQuery({ queryKey: ["admin", "wa", "status"], queryFn: () => statusFn() });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const activate = useMutation({
    mutationFn: () => activateFn(),
    onSuccess: () => {
      toast.success("Caixa de entrada ativada: novas mensagens chegam aqui");
      qc.invalidateQueries({ queryKey: ["admin", "wa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const runImport = async () => {
    let cursor = 0;
    let messages = 0;
    setProgress({ done: 0, total: 0 });
    try {
      for (;;) {
        const r = await importFn({ data: { cursor } });
        messages += r.messages;
        setProgress({ done: r.next, total: r.total });
        qc.invalidateQueries({ queryKey: ["admin", "wa", "chats"] });
        if (r.done) break;
        cursor = r.next;
      }
      toast.success(`Histórico importado: ${messages} mensagem(ns)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["admin", "wa"] });
    }
  };

  const s = status.data;
  if (!s || (s.webhookActive && s.chats > 0 && !progress)) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <MessageCircle className="h-5 w-5 shrink-0 text-emerald-700" />
      <div className="min-w-0 flex-1">
        {!s.configured ? (
          "O WhatsApp da loja não está configurado no servidor."
        ) : !s.connected ? (
          "O número da loja está desconectado. Conecte em Configurações › Notificações."
        ) : !s.webhookActive ? (
          <>
            <b>Ative a caixa de entrada</b> para as mensagens do número da loja chegarem aqui. Os avisos automáticos de pedido continuam
            iguais.
          </>
        ) : (
          <>
            <b>Importe o histórico</b> das conversas dos últimos 90 dias (até 40 mensagens cada).
          </>
        )}
        {s.error ? <div className="text-xs text-red-700">{s.error}</div> : null}
      </div>
      {s.configured && s.connected && !s.webhookActive ? (
        <Button size="sm" disabled={activate.isPending} onClick={() => activate.mutate()}>
          {activate.isPending ? "Ativando…" : "Ativar caixa de entrada"}
        </Button>
      ) : null}
      {s.configured && s.connected && s.webhookActive ? (
        <Button size="sm" variant="outline" disabled={!!progress} onClick={runImport}>
          {progress ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {progress.total ? `${progress.done}/${progress.total} conversas` : "Importando…"}
            </>
          ) : (
            "Importar histórico"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function Conversation({ chatId, draft, onBack }: { chatId: string; draft?: string; onBack: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(adminWaGetChat);
  const readFn = useServerFn(adminWaMarkRead);
  const sendFn = useServerFn(adminWaSendText);
  const sendMediaFn = useServerFn(adminWaSendMedia);
  const updateFn = useServerFn(adminWaUpdateChat);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "wa", "chat", chatId],
    queryFn: () => getFn({ data: { id: chatId } }),
    refetchInterval: ADMIN_REFRESH.chat,
  });
  // Mensagem sugerida (Central Comercial) entra no campo para você revisar antes de enviar.
  const [text, setText] = useState(draft ?? "");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chat = data?.chat;
  const messages = data?.messages ?? [];

  // Ao abrir (ou chegar mensagem nova com a conversa aberta), marca como lida.
  useEffect(() => {
    if (chat?.unread_count) {
      void readFn({ data: { id: chatId } }).then(() => qc.invalidateQueries({ queryKey: ["admin", "wa", "chats"] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.unread_count, chatId]);
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [messages.length]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "wa", "chat", chatId] });
    qc.invalidateQueries({ queryKey: ["admin", "wa", "chats"] });
  };
  const update = useMutation({
    mutationFn: (patch: {
      tags?: string[];
      archived?: boolean;
      follow_up_at?: string | null;
      follow_up_note?: string | null;
      customer_id?: string | null;
    }) => updateFn({ data: { id: chatId, ...patch } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendFn({ data: { id: chatId, text: body } });
      setText("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  };
  const sendFile = async (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Arquivo maior que 12 MB.");
      return;
    }
    setSending(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
        r.readAsDataURL(file);
      });
      await sendMediaFn({
        data: { id: chatId, base64, mimetype: file.type || "application/octet-stream", fileName: file.name, caption: text.trim() || undefined },
      });
      setText("");
      refresh();
      toast.success("Arquivo enviado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !chat) {
    return (
      <div className="grid place-items-center text-sm text-muted-foreground xl:col-span-2">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  let lastDay = "";
  const firstName = (chat.customer?.full_name || chat.name || "").split(/\s+/)[0] ?? "";

  return (
    <>
      <section className="flex min-h-0 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 lg:hidden" onClick={onBack} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{chatTitle(chat)}</div>
            <div className="truncate text-xs text-muted-foreground">
              {chat.phone_normalized ? `+${chat.phone_normalized}` : "Telefone oculto pelo WhatsApp"}
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                {chat.follow_up_at ? `Retorno ${formatBR(chat.follow_up_at)}` : "Agendar retorno"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2">
              <Label className="text-xs">Lembrar de retornar em</Label>
              <Input
                type="date"
                defaultValue={chat.follow_up_at ?? ""}
                onChange={(e) => update.mutate({ follow_up_at: e.target.value || null })}
              />
              <Input
                placeholder="Sobre o quê? (opcional)"
                defaultValue={chat.follow_up_note ?? ""}
                onBlur={(e) => update.mutate({ follow_up_note: e.target.value || null })}
              />
              {chat.follow_up_at ? (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => update.mutate({ follow_up_at: null, follow_up_note: null })}>
                  Concluir retorno
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={chat.archived ? "Desarquivar" : "Arquivar"}
            onClick={() => update.mutate({ archived: !chat.archived })}
          >
            {chat.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
        </header>
        <div className="flex flex-wrap gap-1 border-b px-3 py-1.5">
          {CHAT_TAGS.map((t) => {
            const on = chat.tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => update.mutate({ tags: on ? chat.tags.filter((x) => x !== t) : [...chat.tags, t] })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[#efeae2] px-3 py-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem mensagens guardadas nesta conversa.</p>
          ) : null}
          {messages.map((m) => {
            const day = formatBR(m.sent_at);
            const sep = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {sep ? (
                  <div className="my-2 text-center">
                    <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-muted-foreground shadow-sm">{day}</span>
                  </div>
                ) : null}
                <Bubble m={m} />
              </div>
            );
          })}
          <div ref={bottom} />
        </div>

        <footer className="flex items-end gap-2 border-t bg-white p-2">
          <QuickReplies onPick={(body) => setText((t) => (t ? `${t}\n` : "") + body.replace(/\{nome\}/g, firstName))} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void sendFile(f);
            }}
          />
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" title="Enviar foto ou PDF (o texto vira legenda)" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Mensagem (Enter envia · Shift+Enter quebra linha)"
            className="max-h-40 min-h-10 resize-none"
          />
          <Button size="icon" className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700" disabled={!text.trim() || sending} onClick={() => void send()} aria-label="Enviar">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </footer>
      </section>

      <CustomerPanel chat={chat} onChanged={refresh} />
    </>
  );
}

function Bubble({ m }: { m: WaMessage }) {
  const mediaFn = useServerFn(adminWaMedia);
  const [media, setMedia] = useState<{ dataUrl: string; fileName: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      setMedia(await mediaFn({ data: { message_id: m.message_id } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mídia indisponível.");
    } finally {
      setLoading(false);
    }
  };
  const isMedia = ["image", "audio", "video", "document", "sticker"].includes(m.type);
  const label =
    m.type === "image" ? "Ver foto" : m.type === "audio" ? "Ouvir áudio" : m.type === "video" ? "Ver vídeo" : m.type === "sticker" ? "Ver figurinha" : `Abrir ${m.media_name ?? "documento"}`;
  const Icon = m.type === "image" || m.type === "sticker" ? ImageIcon : m.type === "audio" ? Mic : FileText;
  return (
    <div className={cn("flex", m.from_me ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-lg px-2.5 py-1.5 text-sm shadow-sm", m.from_me ? "bg-[#d9fdd3]" : "bg-white")}>
        {m.quoted_body ? <div className="mb-1 rounded border-l-4 border-emerald-500 bg-black/5 px-2 py-1 text-xs text-muted-foreground">{m.quoted_body}</div> : null}
        {isMedia ? (
          media ? (
            m.type === "image" || m.type === "sticker" ? (
              <img src={media.dataUrl} alt="" className="max-h-72 rounded" />
            ) : m.type === "audio" ? (
              <audio controls src={media.dataUrl} className="max-w-full" />
            ) : m.type === "video" ? (
              <video controls src={media.dataUrl} className="max-h-72 rounded" />
            ) : (
              <a href={media.dataUrl} download={media.fileName ?? m.media_name ?? "arquivo"} className="inline-flex items-center gap-1.5 text-emerald-800 underline">
                <Download className="h-4 w-4" /> {m.media_name ?? media.fileName ?? "Baixar documento"}
              </a>
            )
          ) : (
            <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />} {label}
            </button>
          )
        ) : null}
        {m.body ? <div className="whitespace-pre-wrap break-words">{m.body}</div> : !isMedia ? <div className="italic text-muted-foreground">Mensagem não suportada</div> : null}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          {new Date(m.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {m.from_me ? (
            m.status === "read" ? (
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
            ) : m.status === "delivered" ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : m.status === "error" ? (
              <span className="font-bold text-red-600">!</span>
            ) : (
              <Check className="h-3.5 w-3.5" />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuickReplies({ onPick }: { onPick: (body: string) => void }) {
  const listFn = useServerFn(adminWaQuickReplies);
  const { data } = useQuery({ queryKey: ["admin", "wa", "quick"], queryFn: () => listFn(), staleTime: 300_000 });
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" title="Respostas rápidas">
            <Zap className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-1">
          <div className="max-h-72 overflow-y-auto">
            {(data ?? []).map((r) => (
              <button key={r.id} type="button" onClick={() => onPick(r.body)} className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted">
                <div className="text-sm font-medium">{r.title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{r.body}</div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setEditing(true)} className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-primary hover:bg-muted">
            Editar respostas rápidas
          </button>
        </PopoverContent>
      </Popover>
      {editing ? <QuickRepliesEditor initial={data ?? []} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function QuickRepliesEditor({ initial, onClose }: { initial: QuickReply[]; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(adminWaSaveQuickReplies);
  const [list, setList] = useState<QuickReply[]>(initial);
  const save = useMutation({
    mutationFn: () => saveFn({ data: list.filter((r) => r.title.trim() && r.body.trim()) }),
    onSuccess: () => {
      toast.success("Respostas rápidas salvas");
      qc.invalidateQueries({ queryKey: ["admin", "wa", "quick"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respostas rápidas</DialogTitle>
          <DialogDescription>Use {"{nome}"} para o primeiro nome do contato.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {list.map((r, i) => (
            <div key={r.id} className="space-y-1.5 rounded-md border p-2">
              <div className="flex gap-2">
                <Input value={r.title} placeholder="Título" onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setList(list.filter((_, j) => j !== i))}>
                  Remover
                </Button>
              </div>
              <Textarea rows={2} value={r.body} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setList([...list, { id: crypto.randomUUID().slice(0, 8), title: "", body: "" }])}>
            <Plus className="h-4 w-4" /> Nova resposta
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Ficha comercial ao lado da conversa: compras, orçamentos e negociações do cliente. */
function CustomerPanel({ chat, onChanged }: { chat: WaChat; onChanged: () => void }) {
  const profileFn = useServerFn(adminCrmCustomerProfile);
  const updateFn = useServerFn(adminWaUpdateChat);
  const [linking, setLinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deal, setDeal] = useState(false);
  const profile = useQuery({
    queryKey: ["admin", "crm", "customer", chat.customer_id],
    queryFn: () => profileFn({ data: { id: chat.customer_id! } }),
    enabled: !!chat.customer_id,
  });

  return (
    <aside className="hidden min-h-0 flex-col overflow-y-auto border-l p-3 xl:flex">
      {!chat.customer_id ? (
        <div className="space-y-3 text-sm">
          <div className="font-semibold">Contato sem cadastro</div>
          <p className="text-xs text-muted-foreground">
            Vincule a um cliente para ver compras e orçamentos aqui. O vínculo fica guardado para as próximas mensagens.
          </p>
          <Button size="sm" className="w-full gap-1.5" onClick={() => setLinking(true)}>
            <Search className="h-4 w-4" /> Vincular cliente
          </Button>
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" /> Cadastrar cliente
          </Button>
        </div>
      ) : profile.isLoading || !profile.data ? (
        <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <CustomerSummary data={profile.data} onUnlink={() => updateFn({ data: { id: chat.id, customer_id: null } }).then(onChanged)} onDeal={() => setDeal(true)} />
      )}
      {linking ? <LinkCustomerDialog chat={chat} onClose={() => setLinking(false)} onDone={onChanged} /> : null}
      {creating ? <CreateCustomerDialog chat={chat} onClose={() => setCreating(false)} onDone={onChanged} /> : null}
      {chat.customer_id ? <DealDialog open={deal} onOpenChange={setDeal} deal={null} customerId={chat.customer_id} /> : null}
    </aside>
  );
}

function CustomerSummary({
  data,
  onUnlink,
  onDeal,
}: {
  data: Awaited<ReturnType<typeof adminCrmCustomerProfile>>;
  onUnlink: () => void;
  onDeal: () => void;
}) {
  const c = data.customer;
  const seg = customerSegment(c);
  const openDeals = data.deals.filter((d) => !isClosedStage(d.stage));
  return (
    <div className="space-y-3 text-sm">
      <div>
        <Link to="/admin/clientes/$customerId" params={{ customerId: c.id }} className="font-semibold hover:text-primary hover:underline">
          {c.company || c.full_name}
        </Link>
        {c.company ? <div className="text-xs text-muted-foreground">{c.full_name}</div> : null}
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", SEGMENT_CLS[seg])}>{SEGMENT_LABEL[seg]}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-muted-foreground">Total comprado</div>
          <div className="font-semibold">{formatBRL(Number(c.total_spent || 0))}</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-muted-foreground">Compras</div>
          <div className="font-semibold">{c.orders_count}</div>
        </div>
      </div>
      {c.notes ? <p className="whitespace-pre-wrap rounded-md bg-amber-50 p-2 text-xs text-amber-950">{c.notes}</p> : null}

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Negociações</div>
        {openDeals.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma aberta.</p> : null}
        {openDeals.map((d) => (
          <div key={d.id} className="rounded-md border p-2 text-xs">
            <div className="font-medium">{d.title}</div>
            <div className="text-muted-foreground">
              {DEAL_STAGE_LABEL[d.stage as DealStage] ?? d.stage}
              {d.value ? ` · ${formatBRL(Number(d.value))}` : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Pedidos</div>
        {data.orders.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum.</p> : null}
        {data.orders.slice(0, 4).map((o) => (
          <Link key={o.id} to="/admin/pedidos/$orderId" params={{ orderId: o.id }} className="flex justify-between gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
            <span className="font-mono">{o.order_number}</span>
            <span className="text-muted-foreground">{orderStatusLabel[o.status] ?? o.status}</span>
          </Link>
        ))}
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Orçamentos</div>
        {data.quotes.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum.</p> : null}
        {data.quotes.slice(0, 4).map((q) => (
          <div key={q.id} className="flex justify-between gap-2 px-1 py-0.5 text-xs">
            <span className="font-mono">{q.quote_number}</span>
            <span className="text-muted-foreground">{QUOTE_STATUS_META[q.status]?.label ?? q.status}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/orcamentos" search={{ cliente: c.id }}>
            Novo orçamento
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onDeal}>
          Nova oportunidade
        </Button>
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onUnlink}>
          Desvincular cliente
        </Button>
      </div>
    </div>
  );
}

function LinkCustomerDialog({ chat, onClose, onDone }: { chat: WaChat; onClose: () => void; onDone: () => void }) {
  const listFn = useServerFn(adminCrmListCustomers);
  const updateFn = useServerFn(adminWaUpdateChat);
  const [q, setQ] = useState(chat.name ?? "");
  const list = useQuery({ queryKey: ["admin", "crm", "customers"], queryFn: () => listFn() });
  const term = q.trim().toLowerCase();
  const options = (list.data ?? [])
    .filter((c) => !term || [c.full_name, c.company, c.phone, c.email].some((v) => v?.toLowerCase().includes(term)))
    .slice(0, 30);
  const link = useMutation({
    mutationFn: (customerId: string) => updateFn({ data: { id: chat.id, customer_id: customerId } }),
    onSuccess: () => {
      toast.success("Conversa vinculada ao cliente");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular cliente</DialogTitle>
          <DialogDescription>Escolha o cadastro desta pessoa.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, empresa, telefone ou e-mail" />
        <div className="divide-y rounded-md border">
          {options.map((c) => (
            <button key={c.id} type="button" disabled={link.isPending} onClick={() => link.mutate(c.id)} className="block w-full p-2.5 text-left text-sm hover:bg-muted">
              <div className="font-medium">{c.company || c.full_name}</div>
              <div className="text-xs text-muted-foreground">{[c.company ? c.full_name : null, c.phone, c.email].filter(Boolean).join(" · ")}</div>
            </button>
          ))}
          {options.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateCustomerDialog({ chat, onClose, onDone }: { chat: WaChat; onClose: () => void; onDone: () => void }) {
  const createFn = useServerFn(adminWaCreateCustomer);
  const [form, setForm] = useState({ full_name: chat.name ?? "", company: "", phone: chat.phone_normalized ?? "" });
  const create = useMutation({
    mutationFn: () => createFn({ data: { id: chat.id, ...form } }),
    onSuccess: () => {
      toast.success("Cliente cadastrado e vinculado");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar cliente</DialogTitle>
          <DialogDescription>
            {chat.phone_normalized ? "O telefone veio do WhatsApp." : "O WhatsApp não mostra o telefone deste contato: peça e preencha para ligar pedidos futuros."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="wa-c-name">Nome *</Label>
            <Input id="wa-c-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wa-c-company">Empresa / academia</Label>
            <Input id="wa-c-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wa-c-phone">Telefone</Label>
            <Input id="wa-c-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!form.full_name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Salvando…" : "Cadastrar e vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

