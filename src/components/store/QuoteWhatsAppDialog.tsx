import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, FileText, Loader2, Send, TriangleAlert } from "lucide-react";
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

/** Só dígitos com DDI 55 — o mesmo critério do servidor. */
function waNumber(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d.length >= 12 ? d : null;
}

function prettyPhone(digits: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${digits}`;
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

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [markSent, setMarkSent] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote) return;
    setPhone(quote.customer_phone ?? "");
    setMessage(defaultQuoteMessage(quote));
    setMarkSent(quote.status === "draft");
  }, [quote]);

  const number = useMemo(() => waNumber(phone), [phone]);
  const ready = wa.data?.configured && wa.data?.connected;

  const send = async () => {
    if (!quote) return;
    if (!number) {
      toast.error("Informe o WhatsApp do cliente com DDD");
      return;
    }
    setBusy(true);
    try {
      const { blob } = await makePdf(quote);
      const pdf_base64 = await blobToBase64(blob);
      const r = await sendFn({
        data: {
          id: quote.id,
          phone: number,
          message,
          pdf_base64,
          file_name: whatsappFileName(quote),
          mark_sent: markSent,
        },
      });
      toast.success(`Orçamento enviado para ${prettyPhone(r.to.replace(/^\+/, ""))}`, {
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
      toast.error("Informe o WhatsApp do cliente com DDD");
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
      <DialogContent className="max-w-lg">
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
            <Label htmlFor="qw-phone" className="text-[10px] uppercase text-muted-foreground">
              WhatsApp do cliente
            </Label>
            <Input
              id="qw-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(82) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {number ? (
                <>
                  Vai para <strong>{prettyPhone(number)}</strong>
                  {quote?.customer_phone ? "" : " · fica salvo no orçamento"}
                </>
              ) : (
                "DDD + número. Outro país: inclua o código (ex.: +351…)."
              )}
            </p>
          </div>

          <div>
            <Label htmlFor="qw-msg" className="text-[10px] uppercase text-muted-foreground">
              Mensagem (vai junto com o PDF)
            </Label>
            <Textarea
              id="qw-msg"
              rows={7}
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
            disabled={busy || !number || !ready}
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
