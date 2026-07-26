import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { LifeBuoy, Plus, Send, MessageCircle, CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listMyTickets,
  createTicket,
  getTicketWithMessages,
  postMessage,
  setTicketStatus,
  type SupportTicket,
} from "@/lib/dojo/support.functions";

export const Route = createFileRoute("/dojo/app/support")({
  head: () => ({
    meta: [
      { title: "Suporte — AMT Dojo Manager" },
      { name: "description", content: "Abra chamados de suporte, dúvidas, sugestões e solicitações de novos módulos ao time AMT." },
    ],
  }),
  component: SupportPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  duvida: "Dúvida",
  solicitacao: "Solicitação",
  modulo: "Módulo exclusivo",
  sugestao: "Sugestão",
  bug: "Reportar problema",
  outro: "Outro",
};

const STATUS_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  aberto: { label: "Aberto", className: "bg-blue-500/15 text-blue-300 border-blue-500/30", icon: AlertCircle },
  em_atendimento: { label: "Em atendimento", className: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
  resolvido: { label: "Resolvido", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  fechado: { label: "Fechado", className: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.aberto;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function SupportPage() {
  const listFn = useServerFn(listMyTickets);
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["dojo-support", "my-tickets"],
    queryFn: () => listFn(),
    refetchInterval: 15_000,
  });

  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeTicket = useMemo(() => tickets.find((t) => t.id === activeId) ?? null, [tickets, activeId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-black to-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/80 via-neutral-950 to-black p-6 shadow-2xl sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 blur-lg opacity-60" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg ring-1 ring-white/10 sm:h-14 sm:w-14">
                  <LifeBuoy className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Central de Suporte</h1>
                <p className="mt-1 max-w-xl text-xs text-neutral-400 sm:text-sm">
                  Fale direto com o time AMT. Dúvidas, sugestões, novos módulos e solicitações — tudo por aqui, com histórico completo.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setOpenNew(true)}
              size="sm"
              className="shrink-0 gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/40 ring-1 ring-white/10 hover:from-red-500 hover:to-red-600 sm:size-default"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo chamado</span><span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {activeTicket ? (
            <TicketConversation
              ticket={activeTicket}
              onBack={() => setActiveId(null)}
              onChanged={() => qc.invalidateQueries({ queryKey: ["dojo-support"] })}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-xl backdrop-blur">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-neutral-400">Carregando...</div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 ring-1 ring-white/10">
                    <MessageCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <p className="text-base font-semibold text-white">Nenhum chamado ainda</p>
                  <p className="mt-1 text-sm text-neutral-400">Abra o primeiro clicando em "Novo chamado".</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setActiveId(t.id)}
                        className="group flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-red-300 transition-colors">{t.subject}</span>
                            <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] text-neutral-300">
                              {CATEGORY_LABELS[t.category] ?? t.category}
                            </Badge>
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            Atualizado {new Date(t.last_message_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        {t.unread_by_client > 0 && (
                          <span className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 px-2 text-xs font-bold text-white shadow-lg shadow-red-900/50">
                            {t.unread_by_client}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <NewTicketDialog open={openNew} onOpenChange={setOpenNew} onCreated={(id) => setActiveId(id)} />
      </div>
    </div>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const createFn = useServerFn(createTicket);
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("duvida");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () => createFn({ data: { subject, category, body, priority } }),
    onSuccess: (ticket) => {
      toast.success("Chamado aberto!");
      qc.invalidateQueries({ queryKey: ["dojo-support"] });
      onOpenChange(false);
      setSubject(""); setBody(""); setCategory("duvida"); setPriority("normal");
      onCreated(ticket.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao abrir chamado"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo chamado de suporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Assunto</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Preciso de ajuda com graduações" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Descreva o quanto for necessário..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={subject.trim().length < 3 || body.trim().length < 3 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Enviando..." : "Abrir chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketConversation({
  ticket,
  onBack,
  onChanged,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onChanged: () => void;
}) {
  const getFn = useServerFn(getTicketWithMessages);
  const postFn = useServerFn(postMessage);
  const statusFn = useServerFn(setTicketStatus);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["dojo-support", "ticket", ticket.id],
    queryFn: () => getFn({ data: { ticketId: ticket.id } }),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  const send = useMutation({
    mutationFn: () => postFn({ data: { ticketId: ticket.id, body: text.trim() } }),
    onSuccess: () => {
      setText("");
      refetch();
      onChanged();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });

  const closeTicket = useMutation({
    mutationFn: () => statusFn({ data: { ticketId: ticket.id, status: "fechado" } }),
    onSuccess: () => { toast.success("Chamado fechado"); refetch(); onChanged(); },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-gradient-to-r from-neutral-900 to-neutral-950 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-neutral-300 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{ticket.subject}</span>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] text-neutral-300">
              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            </Badge>
            <StatusBadge status={data?.ticket.status ?? ticket.status} />
          </div>
        </div>
        {ticket.status !== "fechado" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => closeTicket.mutate()}
            className="border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white"
          >
            Fechar chamado
          </Button>
        )}
      </div>

      <div className="flex h-[60vh] flex-col bg-gradient-to-b from-neutral-950/50 to-black/40">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(data?.messages ?? []).map((m) => {
            const mine = m.author_role === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-lg ring-1 ${
                    mine
                      ? "bg-gradient-to-br from-red-600 to-red-700 text-white ring-red-400/30 rounded-br-sm shadow-red-900/40"
                      : "bg-white/5 text-neutral-100 ring-white/10 rounded-bl-sm backdrop-blur"
                  }`}
                >
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {mine ? "Você" : "Suporte AMT"}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="mt-1 text-[10px] opacity-60">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {ticket.status === "fechado" ? (
          <div className="border-t border-white/10 bg-neutral-950/60 px-4 py-3 text-center text-sm text-neutral-400">
            Este chamado está fechado. Abra um novo se precisar de mais ajuda.
          </div>
        ) : (
          <form
            className="flex items-end gap-2 border-t border-white/10 bg-neutral-950/60 px-3 py-3"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={2}
              className="flex-1 resize-none border-white/10 bg-white/5 text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-red-500/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) send.mutate();
                }
              }}
            />
            <Button
              type="submit"
              disabled={!text.trim() || send.isPending}
              className="gap-1 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/40 ring-1 ring-white/10 hover:from-red-500 hover:to-red-600"
            >
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
