import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListSalesConversations,
  adminListSalesMessages,
  adminSendSalesReply,
  adminSetSalesConversationStatus,
} from "@/lib/store/sales-chat.functions";
import { Bot, Headset, Send, User, Loader2, CheckCircle2 } from "lucide-react";

type Conv = {
  id: string;
  channel: string;
  external_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
};

type Msg = {
  id: string;
  role: string;
  parts: { text?: string; source?: "human" | "bot" };
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/store/chat")({
  component: StoreChatAdmin,
});

function StoreChatAdmin() {
  const listConvs = useServerFn(adminListSalesConversations);
  const listMsgs = useServerFn(adminListSalesMessages);
  const sendReply = useServerFn(adminSendSalesReply);
  const setStatus = useServerFn(adminSetSalesConversationStatus);

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"all" | "human" | "active" | "closed">("all");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function refreshConvs() {
    try {
      const rows = (await listConvs()) as Conv[];
      setConvs(rows);
      if (!activeId && rows.length) setActiveId(rows[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }

  async function refreshMsgs(id: string) {
    setLoadingMsgs(true);
    try {
      const rows = (await listMsgs({ data: { conversation_id: id } })) as Msg[];
      setMsgs(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    refreshConvs();
    const t = setInterval(refreshConvs, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    refreshMsgs(activeId);
    const t = setInterval(() => refreshMsgs(activeId), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const filtered = useMemo(
    () => (filter === "all" ? convs : convs.filter((c) => c.status === filter)),
    [convs, filter],
  );
  const active = convs.find((c) => c.id === activeId) ?? null;

  async function onSend() {
    if (!activeId || !reply.trim()) return;
    const text = reply.trim();
    setReply("");
    try {
      await sendReply({ data: { conversation_id: activeId, text } });
      await refreshMsgs(activeId);
    } catch (err) {
      console.error(err);
    }
  }

  async function onSetStatus(next: "active" | "human" | "closed") {
    if (!activeId) return;
    await setStatus({ data: { conversation_id: activeId, status: next } });
    await refreshConvs();
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat da loja</h1>
        <p className="text-sm text-muted-foreground">
          Conversas do widget de vendas. Assuma o atendimento quando um cliente solicitar atendimento humano.
        </p>
      </div>

      <div className="grid h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Lista */}
        <aside className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex items-center gap-1 border-b p-2 text-xs">
            {(["all", "human", "active", "closed"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-2 py-1 ${filter === k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {k === "all" ? "Todas" : k === "human" ? "Humano" : k === "active" ? "Bot" : "Fechadas"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma conversa.</div>
            ) : (
              filtered.map((c) => {
                const isActive = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`block w-full border-b px-3 py-2 text-left text-sm hover:bg-accent ${isActive ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {c.customer_name?.trim() || c.customer_email || c.external_id.slice(0, 12)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          c.status === "human"
                            ? "bg-amber-100 text-amber-800"
                            : c.status === "closed"
                              ? "bg-muted text-muted-foreground"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {c.channel} · {new Date(c.last_message_at).toLocaleString("pt-BR")}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Painel */}
        <section className="flex min-h-0 flex-col rounded-lg border bg-card">
          {!active ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">
                    {active.customer_name?.trim() || active.customer_email || active.external_id}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {active.channel} · {active.customer_email ?? "sem e-mail"} · {active.customer_phone ?? "sem telefone"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {active.status !== "human" && (
                    <button
                      onClick={() => onSetStatus("human")}
                      className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Headset className="mr-1 inline h-3.5 w-3.5" /> Assumir
                    </button>
                  )}
                  {active.status === "human" && (
                    <button
                      onClick={() => onSetStatus("active")}
                      className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <Bot className="mr-1 inline h-3.5 w-3.5" /> Voltar ao bot
                    </button>
                  )}
                  {active.status !== "closed" && (
                    <button
                      onClick={() => onSetStatus("closed")}
                      className="rounded-md bg-muted px-2 py-1 text-xs font-semibold hover:opacity-90"
                    >
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Fechar
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
                {loadingMsgs && msgs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando…
                  </div>
                ) : (
                  msgs.map((m) => {
                    const text = m.parts?.text ?? "";
                    if (!text) return null;
                    if (m.role === "system") {
                      return (
                        <div key={m.id} className="mx-auto max-w-[90%] rounded-md bg-muted px-3 py-2 text-center text-[11px] text-muted-foreground">
                          {text}
                        </div>
                      );
                    }
                    const isUser = m.role === "user";
                    const isHuman = m.parts?.source === "human";
                    return (
                      <div key={m.id} className={`flex gap-2 ${isUser ? "justify-start" : "justify-end"}`}>
                        {isUser && (
                          <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-background">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            isUser
                              ? "bg-background"
                              : isHuman
                                ? "bg-emerald-500 text-white"
                                : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {text}
                          <div className={`mt-1 text-[10px] opacity-70 ${isUser ? "text-muted-foreground" : ""}`}>
                            {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {!isUser && !isHuman && " · bot"}
                            {isHuman && " · você"}
                          </div>
                        </div>
                        {!isUser && (
                          <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${isHuman ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary"}`}>
                            {isHuman ? <Headset className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSend();
                }}
                className="flex items-end gap-2 border-t p-3"
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                  rows={2}
                  placeholder="Escreva sua resposta como atendente…"
                  className="max-h-40 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={!reply.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow disabled:opacity-50"
                  aria-label="Enviar resposta"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
