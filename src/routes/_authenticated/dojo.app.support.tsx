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

export const Route = createFileRoute("/_authenticated/dojo/app/support")({
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
  aberto: { label: "Aberto", className: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  em_atendimento: { label: "Em atendimento", className: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  resolvido: { label: "Resolvido", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  fechado: { label: "Fechado", className: "bg-neutral-200 text-neutral-700 border-neutral-300", icon: CheckCircle2 },
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LifeBuoy className="h-6 w-6 text-primary" /> Suporte
          </h1>
          <p className="text-sm text-muted-foreground">
            Abra chamados para dúvidas, sugestões, solicitações e novos módulos. Nosso time responde por aqui.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo chamado
        </Button>
      </div>

      {activeTicket ? (
        <TicketConversation
          ticket={activeTicket}
          onBack={() => setActiveId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["dojo-support"] })}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center">
              <LifeBuoy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum chamado ainda. Abra o primeiro clicando em "Novo chamado".</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{t.subject}</span>
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Atualizado {new Date(t.last_message_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    {t.unread_by_client > 0 && (
                      <span className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
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

      <NewTicketDialog open={openNew} onOpenChange={setOpenNew} onCreated={(id) => setActiveId(id)} />
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
      <DialogContent className="max-w-lg">
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
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{ticket.subject}</span>
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</Badge>
            <StatusBadge status={data?.ticket.status ?? ticket.status} />
          </div>
        </div>
        {ticket.status !== "fechado" && (
          <Button variant="outline" size="sm" onClick={() => closeTicket.mutate()}>
            Fechar chamado
          </Button>
        )}
      </div>

      <div className="flex h-[60vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(data?.messages ?? []).map((m) => {
            const mine = m.author_role === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
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
          <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
            Este chamado está fechado. Abra um novo se precisar de mais ajuda.
          </div>
        ) : (
          <form
            className="flex items-end gap-2 border-t border-border px-3 py-3"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) send.mutate();
                }
              }}
            />
            <Button type="submit" disabled={!text.trim() || send.isPending} className="gap-1">
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
