import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageOff, Loader2, Save } from "lucide-react";
import { useAdsManager } from "./AdsManagerContext";
import { amUpdateAdCreative } from "@/lib/ads/ads-manager.functions";

export type CreativeTarget = {
  adId: string;
  adName: string;
  creativeId: string | null;
  title: string;
  body: string;
  thumbnail: string | null;
};

const CTAS = [
  "SHOP_NOW",
  "LEARN_MORE",
  "SIGN_UP",
  "BOOK_TRAVEL",
  "CONTACT_US",
  "WHATSAPP_MESSAGE",
  "SEND_MESSAGE",
  "GET_OFFER",
  "SUBSCRIBE",
];

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: "Comprar agora",
  LEARN_MORE: "Saiba mais",
  SIGN_UP: "Cadastre-se",
  BOOK_TRAVEL: "Reservar",
  CONTACT_US: "Fale conosco",
  WHATSAPP_MESSAGE: "Enviar WhatsApp",
  SEND_MESSAGE: "Enviar mensagem",
  GET_OFFER: "Ver oferta",
  SUBSCRIBE: "Assinar",
};

export function CreativeEditor({
  target,
  onOpenChange,
}: {
  target: CreativeTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { accountId } = useAdsManager();
  const update = useServerFn(amUpdateAdCreative);

  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");
  const [link, setLink] = useState("");
  const [utm, setUtm] = useState("");

  useEffect(() => {
    if (!target) return;
    setMessage(target.body ?? "");
    setTitle(target.title ?? "");
    setDescription("");
    setCta("");
    setLink("");
    setUtm("");
  }, [target]);

  const save = useMutation({
    mutationFn: () => {
      if (!target?.creativeId) throw new Error("Anúncio sem criativo associado");
      return update({
        data: {
          ...(accountId ? { accountId } : {}),
          adId: target.adId,
          creativeId: target.creativeId,
          ...(message ? { message } : {}),
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(cta ? { cta } : {}),
          ...(link ? { link } : {}),
          ...(utm ? { utm } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Criativo atualizado", {
        description: "Uma nova versão foi criada e associada ao anúncio.",
      });
      void qc.invalidateQueries({ queryKey: ["ads-manager"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate">{target?.adName ?? "Editar criativo"}</SheetTitle>
          <SheetDescription>
            Edite os textos sem recriar o anúncio. A Meta gera uma nova versão do criativo e ela é
            aplicada automaticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-4">
          {/* Preview */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pré-visualização
            </p>
            <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
              <p className="whitespace-pre-wrap break-words px-3 py-2 text-sm">
                {message || "Texto principal do anúncio…"}
              </p>
              {target?.thumbnail ? (
                <img
                  src={target.thumbnail}
                  alt="Pré-visualização do criativo"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center bg-muted/40">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{title || "Título"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {description || "Descrição opcional"}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold">
                  {CTA_LABELS[cta] ?? "CTA"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cr-message">Texto principal</Label>
            <Textarea
              id="cr-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cr-title">Título</Label>
            <Input id="cr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cr-desc">Descrição</Label>
            <Input
              id="cr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deixe vazio para manter"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Chamada para ação</Label>
            <Select value={cta} onValueChange={setCta}>
              <SelectTrigger>
                <SelectValue placeholder="Manter atual" />
              </SelectTrigger>
              <SelectContent>
                {CTAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CTA_LABELS[c] ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cr-link">URL de destino</Label>
            <Input
              id="cr-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://amtfightwear.com.br/loja"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cr-utm">Parâmetros UTM</Label>
            <Input
              id="cr-utm"
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              placeholder="utm_source=facebook&utm_medium=paid"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !target?.creativeId}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar criativo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
