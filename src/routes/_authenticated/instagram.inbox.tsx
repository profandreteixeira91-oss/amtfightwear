import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Send, Sparkles, ExternalLink, User, Tag, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations, getConversation, sendMessage,
  updateConversation, promoteConversationToLead, aiConversationTools,
  syncIgInbox,
} from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/instagram/inbox")({
  component: IgInbox,
});

const STATUS = [
  { v: "novo_lead", label: "Novo Lead" },
  { v: "em_atendimento", label: "Em Atendimento" },
  { v: "aguardando", label: "Aguardando" },
  { v: "cliente", label: "Cliente" },
  { v: "finalizado", label: "Finalizado" },
];

function IgInbox() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const getFn = useServerFn(getConversation);
  const sendFn = useServerFn(sendMessage);
  const updateFn = useServerFn(updateConversation);
  const promoteFn = useServerFn(promoteConversationToLead);
  const aiFn = useServerFn(aiConversationTools);
  const syncFn = useServerFn(syncIgInbox);

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: convs, isLoading } = useQuery({
    queryKey: ["ig-conversations", filterStatus, search],
    queryFn: () => listFn({ data: { status: filterStatus || undefined, search: search || undefined } }),
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["ig-conversation", selected],
    queryFn: () => selected ? getFn({ data: { id: selected } }) : Promise.resolve(null),
    enabled: !!selected,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("ig-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "ig_conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["ig-conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ig_messages" }, () => {
        if (selected) qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, selected]);

  const mSend = useMutation({
    mutationFn: (text: string) => sendFn({ data: { conversationId: selected!, text } }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
      toast.success("Mensagem enviada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mStatus = useMutation({
    mutationFn: (status: string) => updateFn({ data: { id: selected!, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
      qc.invalidateQueries({ queryKey: ["ig-conversations"] });
    },
  });

  const mPromote = useMutation({
    mutationFn: () => promoteFn({ data: { conversationId: selected! } }),
    onSuccess: (r) => {
      toast.success(r.created ? "Lead criado no CRM." : "Já existia um lead vinculado.");
      qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
    },
  });

  const mAi = useMutation({
    mutationFn: (action: "summarize" | "suggest_reply" | "classify_intent" | "next_steps" | "score") =>
      aiFn({ data: { conversationId: selected!, action } }),
    onSuccess: (r, action) => {
      if (action === "suggest_reply") setDraft(r.result);
      else toast.info(r.result, { duration: 8000 });
      qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mSync = useMutation({
    mutationFn: () => syncFn({ data: {} }),
    onSuccess: (r) => {
      toast.success(`Sincronizado: ${r.conversations} conversas · ${r.messages} mensagens`);
      qc.invalidateQueries({ queryKey: ["ig-conversations"] });
      if (selected) qc.invalidateQueries({ queryKey: ["ig-conversation", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const inWindow = detail?.conversation?.window_expires_at
    ? new Date(detail.conversation.window_expires_at) > new Date()
    : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader
        title="Inbox Instagram"
        description="Central de conversas. Responder dentro da janela de 7 dias da Meta é obrigatório."
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_320px] min-h-[70vh]">
        {/* LIST */}
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
          <Input placeholder="Buscar @ ou nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : (convs ?? []).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">Sem conversas ainda.</div>
            ) : (
              (convs ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left rounded-md p-2 hover:bg-muted transition ${selected === c.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    {c.participant_avatar_url ? (
                      <img src={c.participant_avatar_url} className="h-8 w-8 rounded-full" alt="" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-muted-foreground/10">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate text-sm font-medium">{c.participant_name ?? c.participant_username ?? "—"}</div>
                        {c.unread_count > 0 && <Badge variant="destructive" className="h-4 text-[10px]">{c.unread_count}</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{c.last_message_preview ?? "—"}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* THREAD */}
        <div className="flex flex-col rounded-lg border bg-card">
          {!selected ? (
            <div className="grid flex-1 place-items-center text-muted-foreground text-sm">
              Selecione uma conversa
            </div>
          ) : loadingDetail || !detail ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-12 w-1/2 ml-auto" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b p-3">
                <div className="text-sm font-semibold">@{detail.conversation.participant_username ?? "—"}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => mAi.mutate("summarize")} disabled={mAi.isPending}>
                    <Sparkles className="mr-1 h-3 w-3" /> Resumir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => mAi.mutate("suggest_reply")} disabled={mAi.isPending}>
                    <Sparkles className="mr-1 h-3 w-3" /> Sugerir resposta
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "out" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div>{m.text ?? <i className="opacity-60">(anexo)</i>}</div>
                    <div className="mt-0.5 text-[10px] opacity-70">{new Date(m.sent_at).toLocaleString("pt-BR")}</div>
                  </div>
                ))}
              </div>
              <div className="border-t p-3 space-y-2">
                {!inWindow && (
                  <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-3 w-3" />
                    Janela de 7 dias expirou. Use "Abrir Direct" para responder manualmente.
                  </div>
                )}
                <Textarea
                  value={draft} onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva uma resposta institucional…"
                  className="min-h-[70px]" disabled={!inWindow}
                />
                <div className="flex justify-between">
                  <a
                    href={`https://www.instagram.com/direct/new/?username=${detail.conversation.participant_username ?? ""}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir Direct
                  </a>
                  <Button size="sm" onClick={() => draft.trim() && mSend.mutate(draft)} disabled={!inWindow || !draft.trim() || mSend.isPending}>
                    <Send className="mr-1 h-3 w-3" /> Enviar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SIDE PANEL */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {!selected || !detail ? (
            <div className="text-xs text-muted-foreground">Perfil do lead aparece aqui.</div>
          ) : (
            <>
              <div className="text-sm font-semibold">Perfil</div>
              <div className="text-sm">
                <div><b>@</b> {detail.conversation.participant_username ?? "—"}</div>
                <div><b>Nome:</b> {detail.conversation.participant_name ?? "—"}</div>
                {detail.lead?.city && <div><b>Cidade:</b> {detail.lead.city}</div>}
                {detail.lead?.phone && <div><b>Tel:</b> {detail.lead.phone}</div>}
              </div>
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
                <Select value={detail.conversation.status} onValueChange={(v) => mStatus.mutate(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!detail.lead && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => mPromote.mutate()} disabled={mPromote.isPending}>
                  <User className="mr-1 h-3 w-3" /> Criar lead no CRM
                </Button>
              )}
              {detail.conversation.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {detail.conversation.tags.map((t) => <Badge key={t} variant="secondary"><Tag className="mr-1 h-3 w-3" />{t}</Badge>)}
                </div>
              ) : null}
              {detail.conversation.ai_summary && (
                <div className="rounded-md bg-muted p-2 text-xs">
                  <div className="mb-1 font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> Resumo IA</div>
                  <div className="whitespace-pre-wrap">{detail.conversation.ai_summary}</div>
                </div>
              )}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Timeline</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {detail.events.map((e) => (
                    <div key={e.id} className="text-xs">
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                      {" · "}
                      <span>{e.event_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
