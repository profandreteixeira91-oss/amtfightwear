import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { LifeBuoy, Send, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  adminListTickets,
  getTicketWithMessages,
  postMessage,
  setTicketStatus,
} from "@/lib/dojo/support.functions";

export const Route = createFileRoute("/_authenticated/store/dojo-support")({
  head: () => ({
    meta: [{ title: "Suporte Dojo — Admin AMT" }],
  }),
  component: AdminSupportPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  duvida: "Dúvida",
  solicitacao: "Solicitação",
  modulo: "Módulo exclusivo",
  sugestao: "Sugestão",
  bug: "Problema",
  outro: "Outro",
};
const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};
const STATUS_STYLE: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-700 border-blue-200",
  em_atendimento: "bg-amber-100 text-amber-800 border-amber-200",
  resolvido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  fechado: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

function AdminSupportPage() {
  const listFn = useServerFn(adminListTickets);
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-dojo-support", "tickets"],
    queryFn: () => listFn(),
    refetchInterval: 10_000,
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return tickets.filter((x) => {
      if (statusFilter !== "all" && x.status !== statusFilter) return false;
      if (!t) return true;
      return (
        x.subject.toLowerCase().includes(t) ||
        (x.owner_email ?? "").toLowerCase().includes(t) ||
        (x.owner_name ?? "").toLowerCase().includes(t)
      );
    });
  }, [tickets, q, statusFilter]);

  const active = tickets.find((t) => t.id === activeId) ?? null;

  const kpis = useMemo(() => {
    const abertos = tickets.filter((t) => t.status === "aberto").length;
    const emAt = tickets.filter((t) => t.status === "em_atendimento").length;
    const unread = tickets.reduce((s, t) => s + (t.unread_by_admin ?? 0), 0);
    return { total: tickets.length, abertos, emAt, unread };
  }, [tickets]);

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <LifeBuoy className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" /> Suporte AMT Dojo Manager
        </h1>
        <p className="text-sm text-muted-foreground">Chamados abertos pelos donos de dojo — atendimento humano por chat.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Chamados" value={kpis.total} />
        <Kpi label="Abertos" value={kpis.abertos} accent="text-blue-700" />
        <Kpi label="Em atendimento" value={kpis.emAt} accent="text-amber-700" />
        <Kpi label="Não lidas (você)" value={kpis.unread} accent="text-primary" />
      </div>

      {active ? (
        <AdminConversation
          ticketId={active.id}
          headerName={active.owner_name ?? active.owner_email ?? "Cliente"}
          subject={active.subject}
          category={active.category}
          onBack={() => setActiveId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["admin-dojo-support"] })}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por assunto, e-mail ou nome" className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{t.subject}</span>
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status] ?? ""}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {t.owner_name ?? "—"} · {t.owner_email ?? "—"} · atualizado {new Date(t.last_message_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    {t.unread_by_admin > 0 && (
                      <span className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                        {t.unread_by_admin}
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
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function AdminConversation({
  ticketId,
  headerName,
  subject,
  category,
  onBack,
  onChanged,
}: {
  ticketId: string;
  headerName: string;
  subject: string;
  category: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const getFn = useServerFn(getTicketWithMessages);
  const postFn = useServerFn(postMessage);
  const statusFn = useServerFn(setTicketStatus);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["admin-dojo-support", "ticket", ticketId],
    queryFn: () => getFn({ data: { ticketId } }),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  const send = useMutation({
    mutationFn: () => postFn({ data: { ticketId, body: text.trim() } }),
    onSuccess: () => { setText(""); refetch(); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) => statusFn({ data: { ticketId, status } }),
    onSuccess: () => { toast.success("Status atualizado"); refetch(); onChanged(); },
  });

  const status = data?.ticket.status ?? "aberto";

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="order-3 min-w-0 flex-1 basis-full sm:order-none sm:basis-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{subject}</span>
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[category] ?? category}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">{headerName}</div>
        </div>
        <Select value={status} onValueChange={(s) => changeStatus.mutate(s)}>
          <SelectTrigger className="w-[160px] sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-[65vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(data?.messages ?? []).map((m) => {
            const mine = m.author_role === "support";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {mine ? "Suporte AMT (você)" : "Cliente"}
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

        <form
          className="flex items-end gap-2 border-t border-border px-3 py-3"
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Responder ao cliente..."
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
      </div>
    </div>
  );
}
