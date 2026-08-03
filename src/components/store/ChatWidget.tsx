import { MessageCircle, X, Send, User, Bot, Headset } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant" | "system"; text: string; source?: "human" | "bot"; created_at: string };

function getExternalId(storageKey: string, prefix: string): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(storageKey);
  if (!id) {
    id = `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, id);
  }
  return id;
}

function loadCached(storageMsgs: string): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageMsgs);
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

function saveCached(storageMsgs: string, m: Msg[]) {
  try {
    window.localStorage.setItem(storageMsgs, JSON.stringify(m.slice(-50)));
  } catch {
    /* ignore */
  }
}

export type ChatWidgetProps = {
  storageKey?: string;
  storageMsgs?: string;
  externalIdPrefix?: string;
  buttonLabel?: string;
  headerTitle?: string;
  greeting?: string;
};

export function ChatWidget(props: ChatWidgetProps = {}) {
  const storageKey = props.storageKey ?? "amt_chat_external_id";
  const storageMsgs = props.storageMsgs ?? "amt_chat_msgs_v1";
  const externalIdPrefix = props.externalIdPrefix ?? "web";
  const buttonLabel = props.buttonLabel ?? "Chat com a AMT";
  const headerTitle = props.headerTitle ?? "Atendimento AMT";
  const greeting =
    props.greeting ??
    "Olá! Sou o assistente da AMT Fight Wear. Como posso ajudar? Posso indicar produtos, tirar dúvidas sobre tamanhos, frete e pagamento. Se preferir, clique em \"Falar com atendente\" a qualquer momento. 🥋";
  const externalId = useMemo(() => getExternalId(storageKey, externalIdPrefix), [storageKey, externalIdPrefix]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"active" | "human" | "closed">("active");
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSeenRef = useRef<string | null>(null);

  // Hidrata cache local
  useEffect(() => {
    const cached = loadCached(storageMsgs);
    if (cached.length) {
      setMessages(cached);
      lastSeenRef.current = cached[cached.length - 1]?.created_at ?? null;
    } else {
      const greet: Msg = {
        id: "greet",
        role: "assistant",
        text: greeting,
        source: "bot",
        created_at: new Date().toISOString(),
      };
      setMessages([greet]);
    }
  }, [storageMsgs, greeting]);

  useEffect(() => {
    saveCached(storageMsgs, messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, storageMsgs]);

  // Polling — busca respostas do admin e status
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const params = new URLSearchParams({ channel: "web", external_id: externalId });
        if (lastSeenRef.current) params.set("since", lastSeenRef.current);
        const res = await fetch(`/api/public/sales/messages?${params.toString()}`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          conversation_id?: string;
          status?: "active" | "human" | "closed";
          messages: Array<{ id: string; role: string; parts: { text?: string; source?: "human" | "bot" }; created_at: string }>;
        };
        if (!alive) return;
        if (json.status) setStatus(json.status);
        const incoming: Msg[] = (json.messages ?? [])
          .filter((m) => m.parts?.text)
          .map((m) => ({
            id: m.id,
            role: (m.role === "user" || m.role === "assistant" || m.role === "system") ? (m.role as Msg["role"]) : "assistant",
            text: m.parts.text as string,
            source: m.parts.source,
            created_at: m.created_at,
          }));
        if (incoming.length) {
          lastSeenRef.current = incoming[incoming.length - 1].created_at;
          setMessages((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const m of incoming) if (!seen.has(m.id)) merged.push(m);
            return merged;
          });
          if (!open && incoming.some((m) => m.role === "assistant" || m.role === "system")) setHasUnread(true);
        }
      } catch {
        /* silent */
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [externalId, open]);

  useEffect(() => {
    if (open) setHasUnread(false);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const userMsg: Msg = {
      id: `local-${Date.now()}`,
      role: "user",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/public/sales/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web", external_id: externalId, message: text }),
      });

      const mode = res.headers.get("X-Mode");
      if (mode === "human") {
        const receipt = await res.text();
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: "system",
            text: receipt,
            created_at: new Date().toISOString(),
          },
        ]);
        setStatus("human");
      } else if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const streamId = `stream-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: streamId, role: "assistant", text: "", source: "bot", created_at: new Date().toISOString() },
        ]);
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, text: acc } : m)));
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "system",
          text: "Não consegui enviar sua mensagem agora. Tente novamente em instantes.",
          created_at: new Date().toISOString(),
        },
      ]);
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function requestHuman() {
    try {
      await fetch("/api/public/sales/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web", external_id: externalId, action: "request_human" }),
      });
      setStatus("human");
      setMessages((prev) => [
        ...prev,
        {
          id: `req-${Date.now()}`,
          role: "system",
          text: "Sua conversa foi encaminhada para um atendente humano. Você receberá a resposta aqui mesmo, assim que ele estiver disponível.",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir chat da loja"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/60 sm:bottom-6 sm:right-6"
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            {hasUnread && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary" />}
            <MessageCircle className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">{buttonLabel}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[380px]">
          <div className="flex items-center justify-between gap-2 border-b bg-foreground px-4 py-3 text-background">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                {status === "human" ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold">{headerTitle}</div>
                <div className="text-[11px] text-background/70">
                  {status === "human" ? "Falando com um atendente" : "Assistente automático · online"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
              className="rounded-full p-1 hover:bg-background/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="mx-auto max-w-[90%] rounded-md bg-muted px-3 py-2 text-center text-[11px] text-muted-foreground">
                    {m.text}
                  </div>
                );
              }
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      {m.source === "human" ? <Headset className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : m.source === "human"
                          ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-900/30 dark:text-emerald-50"
                          : "bg-background"
                    }`}
                  >
                    {m.text || (isUser ? "" : "...")}
                  </div>
                  {isUser && (
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-background">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="text-center text-[11px] text-muted-foreground">enviando…</div>
            )}
          </div>

          <div className="border-t bg-background px-3 py-2">
            {status !== "human" && (
              <button
                type="button"
                onClick={requestHuman}
                className="mb-2 w-full rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Headset className="mr-1 inline h-3.5 w-3.5" /> Falar com atendente humano
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={status === "human" ? "Escreva para o atendente…" : "Escreva sua mensagem…"}
                className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow disabled:opacity-50"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
