import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminQuoteWhatsAppStatus, adminSendQuoteWhatsApp } from "@/lib/store/quotes.functions";
import { adminWaListChats, type WaChat } from "@/lib/whatsapp/inbox.functions";
import { cn } from "@/lib/utils";

type QuoteLike = {
  id: string;
  quote_number: string;
  status: string;
  customer_name: string;
  customer_company?: string | null;
  customer_phone?: string | null;
  total: number | string;
  valid_until?: string | null;
};

const BRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso?: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const fold = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const STOP = new Set(["the", "dos", "das", "de", "da", "do", "e"]);

function prettyPhone(digits: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${digits}`;
}

function chatTitle(c: WaChat): string {
  return (
    c.customer?.full_name ||
    c.name ||
    (c.phone_normalized ? prettyPhone(c.phone_normalized) : "Contato")
  );
}

function chatSubtitle(c: WaChat): string {
  return [c.customer?.company, c.phone_normalized ? prettyPhone(c.phone_normalized) : null]
    .filter(Boolean)
    .join(" · ");
}

function ago(iso: string | null): string {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Conversa que parece ser deste cliente: mesmo telefone ou nome/empresa parecidos. */
function matchScore(c: WaChat, q: QuoteLike): number {
  const phone = digits(q.customer_phone);
  if (phone.length >= 8 && digits(c.phone_normalized).endsWith(phone.slice(-8))) return 100;
  const hay = fold([c.name, c.customer?.full_name, c.customer?.company].filter(Boolean).join(" "));
  if (!hay) return 0;
  let best = 0;
  for (const who of [q.customer_company, q.customer_name]) {
    const words = fold(who)
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w));
    if (!words.length) continue;
    const hits = words.filter((w) => hay.includes(w)).length;
    best = Math.max(best, Math.round((hits / words.length) * 80));
  }
  return best;
}

function defaultQuoteMessage(q: QuoteLike): string {
  const who = (q.customer_company || q.customer_name || "").trim();
  const validity = q.valid_until ? ` · válido até ${brDate(q.valid_until)}` : "";
  return [
    "Olá, tudo bem? 👊",
    "",
    `Segue o orçamento *${q.quote_number}* da AMT Fight Wear${who ? ` para *${who}*` : ""}.`,
    `Total: *${BRL(Number(q.total))}*${validity}.`,
    "",
    "Qualquer dúvida, é só responder por aqui.",
  ].join("\n");
}

/** Nome do arquivo que o cliente vê: número do orçamento + cliente (dois orçamentos do mesmo dia não se confundem). */
function whatsappFileName(q: QuoteLike): string {
  const who = (q.customer_company || q.customer_name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${q.quote_number}${who ? `_${who}` : ""}.pdf`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).replace(/^data:[^,]*,/, ""));
    fr.onerror = () => reject(fr.error ?? new Error("Falha ao ler o PDF"));
    fr.readAsDataURL(blob);
  });
}

export function QuoteWhatsAppDialog({
  quote,
  onOpenChange,
  makePdf,
  onSent,
}: {
  quote: QuoteLike | null;
  onOpenChange: (open: boolean) => void;
  makePdf: (q: QuoteLike) => Promise<{ blob: Blob; filename: string }>;
  onSent?: () => void;
}) {
  const statusFn = useServerFn(adminQuoteWhatsAppStatus);
  const sendFn = useServerFn(adminSendQuoteWhatsApp);
  const open = !!quote;
  const wa = useQuery({
    queryKey: ["store", "quote-whatsapp-status"],
    queryFn: () => statusFn(),
    enabled: open,
    staleTime: 60_000,
  });

  const chatsFn = useServerFn(adminWaListChats);
  const chats = useQuery({
    queryKey: ["store", "wa-chats-for-quote"],
    queryFn: () => chatsFn({ data: { filter: "todas" } }),
    enabled: open,
    staleTime: 30_000,
  });
  const [search, setSearch] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [markSent, setMarkSent] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote) return;
    setSearch("");
    setChatId(null);
    setMessage(defaultQuoteMessage(quote));
    setMarkSent(quote.status === "draft");
  }, [quote]);

  // Sugestões (mesmo telefone ou nome do cliente) primeiro; depois as conversas mais recentes.
  const ranked = useMemo(() => {
    if (!quote) return [] as Array<{ chat: WaChat; score: number }>;
    const strong = (n: number) => (n >= 50 ? n : 0);
    return (chats.data ?? [])
      .map((chat) => ({ chat, score: matchScore(chat, quote) }))
      .sort((a, b) => strong(b.score) - strong(a.score));
  }, [chats.data, quote]);
  const visible = useMemo(() => {
    const q = fold(search);
    const qd = digits(search);
    const list = !q
      ? ranked
      : ranked.filter(({ chat }) => {
          const hay = fold(
            [chat.name, chat.customer?.full_name, chat.customer?.company].filter(Boolean).join(" "),
          );
          return hay.includes(q) || (qd.length >= 3 && digits(chat.phone_normalized).includes(qd));
        });
    return list.slice(0, 40);
  }, [ranked, search]);

  // Uma única sugestão forte já vem escolhida.
  useEffect(() => {
    if (chatId || !ranked.length) return;
    const strong = ranked.filter((r) => r.score >= 80);
    if (strong.length === 1) setChatId(strong[0].chat.id);
  }, [ranked, chatId]);

  const selected = (chats.data ?? []).find((c) => c.id === chatId) ?? null;
  const number = selected?.phone_normalized ?? null;
  const ready = wa.data?.configured && wa.data?.connected;

  const send = async () => {
    if (!quote) return;
    if (!selected) {
      toast.error("Escolha a conversa do cliente");
      return;
    }
    setBusy(true);
    try {
      const { blob } = await makePdf(quote);
      const pdf_base64 = await blobToBase64(blob);
      const r = await sendFn({
        data: {
          id: quote.id,
          chat_id: selected.id,
          message,
          pdf_base64,
          file_name: whatsappFileName(quote),
          mark_sent: markSent,
        },
      });
      toast.success(`Orçamento enviado para ${chatTitle(selected)}`, {
        description: r.markedSent ? "Situação alterada para Enviado." : undefined,
      });
      onSent?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Não foi possível enviar");
    } finally {
      setBusy(false);
    }
  };

  /** Sem a conexão da loja: baixa o PDF e abre a conversa para anexar à mão. */
  const openManual = async () => {
    if (!quote || !number) {
      toast.error("Escolha uma conversa com número de telefone");
      return;
    }
    try {
      const { blob, filename } = await makePdf(quote);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener",
      );
      toast.message("PDF baixado", { description: "Anexe o arquivo na conversa que abriu." });
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erro ao gerar o PDF");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white">
              <Send className="h-4 w-4" />
            </span>
            Enviar pelo WhatsApp
          </DialogTitle>
          <DialogDescription>
            O PDF do orçamento <strong>{quote?.quote_number}</strong> vai direto para o cliente,
            pelo WhatsApp da loja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
            <FileText className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {quote?.customer_company || quote?.customer_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {quote?.quote_number} · {BRL(Number(quote?.total ?? 0))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="qw-search" className="text-[10px] uppercase text-muted-foreground">
              Conversa do cliente no WhatsApp
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="qw-search"
                placeholder="Buscar por nome, empresa ou número…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
                autoComplete="off"
              />
            </div>
            <div
              role="listbox"
              aria-label="Conversas do WhatsApp"
              className="mt-2 max-h-56 overflow-y-auto rounded-xl border"
            >
              {chats.isLoading ? (
                <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando conversas…
                </div>
              ) : chats.error ? (
                <div className="p-3 text-xs text-destructive">
                  Não foi possível carregar as conversas.
                </div>
              ) : visible.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  {search
                    ? "Nenhuma conversa encontrada. O cliente precisa ter falado com a loja no WhatsApp."
                    : "Nenhuma conversa no WhatsApp da loja ainda."}
                </div>
              ) : (
                visible.map(({ chat, score }) => {
                  const active = chat.id === chatId;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setChatId(active ? null : chat.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors last:border-0",
                        active ? "bg-[#25D366]/10" : "hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                          active ? "bg-[#25D366] text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          chatTitle(chat).slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{chatTitle(chat)}</span>
                          {score >= 50 && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              <Sparkles className="h-2.5 w-2.5" /> Sugerido
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {chatSubtitle(chat) || chat.last_message_preview || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {ago(chat.last_message_at)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected ? (
                <>
                  Vai para <strong>{chatTitle(selected)}</strong>
                  {number ? ` (${prettyPhone(number)})` : ""}
                  {!quote?.customer_phone && number ? " · o número fica salvo no orçamento" : ""}
                </>
              ) : (
                "Escolha a conversa de quem já falou com a loja."
              )}
            </p>
          </div>

          <div>
            <Label htmlFor="qw-msg" className="text-[10px] uppercase text-muted-foreground">
              Mensagem (vai junto com o PDF)
            </Label>
            <Textarea
              id="qw-msg"
              rows={6}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {quote?.status === "draft" && (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm">
              <span>
                <span className="font-medium">Marcar como Enviado</span>
                <span className="block text-xs text-muted-foreground">
                  O rascunho passa a Enviado e o CRM acompanha.
                </span>
              </span>
              <Switch checked={markSent} onCheckedChange={setMarkSent} />
            </label>
          )}

          {wa.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando o WhatsApp da loja…
            </div>
          ) : ready ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> WhatsApp da loja conectado
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {wa.data?.configured
                  ? "O WhatsApp da loja está desconectado. Reconecte em WhatsApp ou envie pelo seu WhatsApp (o PDF é baixado para você anexar)."
                  : "O WhatsApp da loja não está configurado. Envie pelo seu WhatsApp (o PDF é baixado para você anexar)."}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={openManual} disabled={busy || !number}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Pelo meu WhatsApp
          </Button>
          <Button
            className="bg-[#25D366] text-white hover:bg-[#1ebe5a]"
            onClick={send}
            disabled={busy || !selected || !ready}
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            {busy ? "Enviando…" : "Enviar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
