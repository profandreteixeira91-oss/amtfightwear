import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KIND_LABEL,
  LINE_LABEL,
  MODALITY_LABEL,
  STYLE_LABEL,
  swapProduct,
  lineToItem,
  type DraftItem,
  type CatalogProduct,
  type QuoteLine,
} from "@/lib/store/quote-from-message";
import {
  adminQuoteFromText,
  type QuoteDraftFromMessage,
} from "@/lib/store/quote-from-message.functions";

/**
 * Orçamento a partir da mensagem do cliente: o diálogo para colar um texto e o painel de revisão que aparece no
 * editor (o que foi entendido de cada trecho, avisos e outros modelos para trocar com um clique).
 */

const BRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Colar o pedido (WhatsApp de outro número, Instagram, e-mail, anotação) e gerar o orçamento. */
export function QuoteMessageDialog({
  open,
  onOpenChange,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDraft: (draft: QuoteDraftFromMessage) => void;
}) {
  const parseFn = useServerFn(adminQuoteFromText);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (text.trim().length < 2) return;
    setBusy(true);
    try {
      const draft = await parseFn({ data: { text } });
      if (!draft.lines.length) {
        toast.error(
          "Não encontrei produtos nessa mensagem. Confira o texto ou monte o orçamento à mão.",
        );
        return;
      }
      onDraft(draft);
      setText("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler a mensagem.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Orçamento a partir de uma mensagem</DialogTitle>
          <DialogDescription>
            Cole o pedido do cliente. O sistema identifica modalidade, modelo, tamanho e quantidade
            e abre o orçamento para você revisar.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={7}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Ex.: Boa tarde! Quero 10 faixas brancas de jiu-jitsu A2 e 5 azuis A3, linha pro"
          }
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={busy || text.trim().length < 2} onClick={() => void run()}>
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Gerar orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONF = {
  alta: { label: "Certeza alta", cls: "bg-emerald-100 text-emerald-800" },
  media: { label: "Confira", cls: "bg-amber-100 text-amber-800" },
  baixa: { label: "Revise", cls: "bg-red-100 text-red-800" },
} as const;

/** Painel no editor: o que foi lido de cada trecho, avisos e troca de modelo. */
export function QuoteMessageReview({
  draft,
  items,
  onReplace,
  onClose,
}: {
  draft: QuoteDraftFromMessage;
  items: DraftItem[];
  onReplace: (ref: string, item: DraftItem) => void;
  onClose: () => void;
}) {
  const [showText, setShowText] = useState(false);
  const products = new Map<string, CatalogProduct>(draft.products.map((p) => [p.id, p]));
  const lines = draft.lines.map((l) => {
    const atual = items.find((it) => it._ref === l.ref);
    return { l, atual };
  });
  const pendencias = draft.lines.reduce((n, l) => n + l.issues.length, 0);

  return (
    <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">Lido da mensagem do cliente</h3>
            <p className="text-xs text-emerald-900/70">
              {draft.lines.length} item(ns) identificados
              {pendencias ? ` · ${pendencias} ponto(s) para conferir` : " · nada pendente"}. Os
              itens abaixo são editáveis.
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowText((v) => !v)}
          >
            {showText ? (
              <ChevronUp className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="mr-1 h-3.5 w-3.5" />
            )}
            Mensagem
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Fechar o painel"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showText ? (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-sans text-xs text-foreground/80">
          {draft.text}
        </pre>
      ) : null}

      <ul className="space-y-2">
        {lines.map(({ l, atual }) => {
          const u = l.understood;
          const chips = [
            u.modality ? MODALITY_LABEL[u.modality] : null,
            u.kind ? KIND_LABEL[u.kind] : null,
            u.line ? LINE_LABEL[u.line] : null,
            u.style ? STYLE_LABEL[u.style] : null,
            u.colors.length ? u.colors.join(" / ") : null,
            u.kids ? "Infantil" : null,
            l.size ? `Tam. ${l.size.split(" - ")[0]}` : null,
          ].filter(Boolean) as string[];
          const opcoes = [l.product_id, ...l.alternatives.map((a) => a.product_id)].filter(
            Boolean,
          ) as string[];
          return (
            <li key={l.ref} className="rounded-lg bg-white p-2.5 text-xs shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold tabular-nums">{l.quantity}×</span>
                {chips.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="h-5 rounded-full px-2 text-[10px] font-medium"
                  >
                    {c}
                  </Badge>
                ))}
                <Badge
                  className={`ml-auto h-5 rounded-full border-0 px-2 text-[10px] ${CONF[l.confidence].cls}`}
                >
                  {CONF[l.confidence].label}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">“{l.source}”</p>
              {l.issues.map((i) => (
                <p key={i} className="mt-1 flex items-start gap-1 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {i}
                </p>
              ))}
              {!atual ? (
                <p className="mt-1 text-muted-foreground">Item removido do orçamento.</p>
              ) : opcoes.length > 1 ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">Modelo:</span>
                  <Select
                    value={atual.product_id ?? ""}
                    onValueChange={(id) => {
                      const p = products.get(id);
                      if (!p) return;
                      const trocada = swapProduct(
                        { ...l, size: l.size, quantity: atual.quantity },
                        p,
                      );
                      onReplace(l.ref, {
                        ...atual,
                        ...lineToItem(trocada),
                        quantity: atual.quantity,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escolha o modelo">
                        {atual.product_id ? products.get(atual.product_id)?.name : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {opcoes.map((id) => {
                        const p = products.get(id);
                        return p ? (
                          <SelectItem key={id} value={id} className="text-xs">
                            {p.name} · {BRL(p.price)}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {draft.ignored.length ? (
        <p className="text-xs text-emerald-900/70">
          Sem produto (não entrou no orçamento): {draft.ignored.map((t) => `“${t}”`).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
