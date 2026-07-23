import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListSalesConversations,
  adminListSalesMessages,
  adminSendSalesReply,
  adminSetSalesConversationStatus,
  adminGetChatSettings,
  adminUpdateChatSettings,
  adminListKbArticles,
  adminUpsertKbArticle,
  adminDeleteKbArticle,
} from "@/lib/store/sales-chat.functions";
import { Bot, Headset, Send, User, Loader2, CheckCircle2, Settings, BookOpen, MessageSquare, Save, Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";

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

  const [tab, setTab] = useState<"conversas" | "config" | "kb">("conversas");

  return (
    <PageShell
      title="Chat da loja"
      description="Atenda conversas, configure o agente de IA e mantenha a base de conhecimento."
      actions={
        <div className="-mx-1 flex w-full items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1 text-sm sm:w-auto">
          <TabButton active={tab === "conversas"} onClick={() => setTab("conversas")} icon={MessageSquare} label="Conversas" />
          <TabButton active={tab === "config"} onClick={() => setTab("config")} icon={Settings} label="Configurações" />
          <TabButton active={tab === "kb"} onClick={() => setTab("kb")} icon={BookOpen} label="Base de conhecimento" />
        </div>
      }
    >

      {tab === "config" && <ChatSettingsPanel />}
      {tab === "kb" && <ChatKbPanel />}
      {tab === "conversas" && (
        <div className="grid h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {active.customer_name?.trim() || active.customer_email || active.external_id}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {active.channel} · {active.customer_email ?? "sem e-mail"} · {active.customer_phone ?? "sem telefone"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
      )}
    </PageShell>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

type ChatSettings = {
  id?: string;
  tone: string;
  greeting_web: string;
  greeting_wa: string;
  greeting_ig: string;
  channel_web_enabled: boolean;
  channel_wa_enabled: boolean;
  channel_ig_enabled: boolean;
  offline_message: string;
  site_url: string;
  cart_url_template: string;
  business_hours_json: { tz: string; always_on: boolean; [k: string]: unknown };
};

const DEFAULT_SETTINGS: ChatSettings = {
  tone: "consultivo, cordial, direto",
  greeting_web: "Olá! Sou o assistente da AMT Fight Wear. Como posso te ajudar a encontrar o produto ideal?",
  greeting_wa: "Olá! Sou o assistente da AMT Fight Wear. Em que posso ajudar hoje?",
  greeting_ig: "Olá! Sou o assistente da AMT Fight Wear. Em que posso ajudar?",
  channel_web_enabled: true,
  channel_wa_enabled: false,
  channel_ig_enabled: false,
  offline_message: "Estamos fora do horário de atendimento. Deixe sua mensagem que retornaremos em breve.",
  site_url: "https://www.amtfightwear.com.br",
  cart_url_template: "https://www.amtfightwear.com.br/carrinho/?add-to-cart={ids}&quantity={qtys}",
  business_hours_json: { tz: "America/Sao_Paulo", always_on: true },
};

function ChatSettingsPanel() {
  const getSettings = useServerFn(adminGetChatSettings);
  const saveSettings = useServerFn(adminUpdateChatSettings);
  const [s, setS] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = (await getSettings()) as Partial<ChatSettings> | null;
        setS({ ...DEFAULT_SETTINGS, ...(row ?? {}) } as ChatSettings);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = (await saveSettings({ data: s })) as { id: string };
      setS({ ...s, id: r.id });
      setMsg("Configurações salvas.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (loading || !s) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando…</div>;
  }

  const upd = <K extends keyof ChatSettings>(k: K, v: ChatSettings[K]) => setS({ ...s, [k]: v });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Comportamento do agente</h2>
        <Field label="Tom de voz" hint="Ex.: consultivo, cordial, direto">
          <input value={s.tone} onChange={(e) => upd("tone", e.target.value)} className="input" />
        </Field>
        <Field label="URL do site" hint="Usada nos prompts do agente">
          <input value={s.site_url} onChange={(e) => upd("site_url", e.target.value)} className="input" />
        </Field>
        <Field label="Template do carrinho" hint="Use {ids} e {qtys} como placeholders">
          <input value={s.cart_url_template} onChange={(e) => upd("cart_url_template", e.target.value)} className="input" />
        </Field>
        <Field label="Mensagem fora do horário">
          <textarea rows={3} value={s.offline_message} onChange={(e) => upd("offline_message", e.target.value)} className="input" />
        </Field>
        <Field label="Sempre online">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.business_hours_json.always_on !== false}
              onChange={(e) => upd("business_hours_json", { ...s.business_hours_json, always_on: e.target.checked })}
            />
            Atender 24/7
          </label>
        </Field>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Canais e saudações</h2>

        <ChannelBlock
          title="Widget do site"
          enabled={s.channel_web_enabled}
          onToggle={(v) => upd("channel_web_enabled", v)}
          greeting={s.greeting_web}
          onGreeting={(v) => upd("greeting_web", v)}
        />
        <ChannelBlock
          title="WhatsApp"
          enabled={s.channel_wa_enabled}
          onToggle={(v) => upd("channel_wa_enabled", v)}
          greeting={s.greeting_wa}
          onGreeting={(v) => upd("greeting_wa", v)}
        />
        <ChannelBlock
          title="Instagram"
          enabled={s.channel_ig_enabled}
          onToggle={(v) => upd("channel_ig_enabled", v)}
          greeting={s.greeting_ig}
          onGreeting={(v) => upd("greeting_ig", v)}
        />
      </section>

      <div className="lg:col-span-2 flex items-center justify-end gap-3">
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-foreground">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--primary)/0.4)}`}</style>
    </label>
  );
}

function ChannelBlock({ title, enabled, onToggle, greeting, onGreeting }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; greeting: string; onGreeting: (v: string) => void }) {
  return (
    <div className="mb-3 rounded-md border bg-background p-3">
      <label className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
        {title}
        <span className="inline-flex items-center gap-2 text-xs font-normal">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          Ativo
        </span>
      </label>
      <textarea
        rows={2}
        value={greeting}
        onChange={(e) => onGreeting(e.target.value)}
        placeholder="Mensagem de boas-vindas"
        className="input"
      />
    </div>
  );
}

type KbArticle = { id?: string; title: string; body_md: string; tags: string[]; is_active: boolean; updated_at?: string };

function ChatKbPanel() {
  const listFn = useServerFn(adminListKbArticles);
  const upsertFn = useServerFn(adminUpsertKbArticle);
  const deleteFn = useServerFn(adminDeleteKbArticle);
  const [rows, setRows] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KbArticle | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = (await listFn()) as KbArticle[];
      setRows(r);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setEditing({ title: "", body_md: "", tags: [], is_active: true });
  }
  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertFn({ data: editing });
      setEditing(null);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("Excluir este artigo?")) return;
    await deleteFn({ data: { id } });
    await refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Artigos</h2>
          <button onClick={startNew} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Novo
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum artigo cadastrado.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className={`flex items-start justify-between gap-2 border-b px-3 py-2 hover:bg-accent ${editing?.id === r.id ? "bg-accent" : ""}`}>
                <button onClick={() => setEditing(r)} className="flex-1 text-left">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {r.tags?.length ? r.tags.map((t) => <span key={t} className="rounded bg-muted px-1.5">{t}</span>) : <span>sem tags</span>}
                    {!r.is_active && <span className="rounded bg-amber-100 px-1.5 text-amber-800">inativo</span>}
                  </div>
                </button>
                {r.id && (
                  <button onClick={() => remove(r.id!)} className="rounded p-1 text-destructive hover:bg-destructive/10" aria-label="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        {!editing ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Selecione um artigo ou crie um novo. A base de conhecimento alimenta as respostas do agente sobre políticas (troca, frete, garantia).
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Título">
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input" />
            </Field>
            <Field label="Conteúdo (Markdown)" hint="Descreva a política ou o processo com detalhes; o agente citará esta fonte.">
              <textarea rows={12} value={editing.body_md} onChange={(e) => setEditing({ ...editing, body_md: e.target.value })} className="input font-mono text-xs" />
            </Field>
            <Field label="Tags (separadas por vírgula)">
              <input
                value={editing.tags.join(", ")}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                className="input"
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Ativo (visível para o agente)
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Cancelar</button>
              <button onClick={save} disabled={saving || !editing.title.trim() || !editing.body_md.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
