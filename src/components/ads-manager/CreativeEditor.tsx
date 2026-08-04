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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ImageOff, 
  Loader2, 
  Save, 
  Eye, 
  Settings2, 
  Smartphone, 
  Monitor,
  Instagram,
  Facebook,
  Sparkles,
  Target
} from "lucide-react";
import { useAdsManager } from "./AdsManagerContext";
import { amUpdateAdCreative } from "@/lib/ads/ads-manager.functions";

export type CreativeTarget = {
  adId: string;
  adName: string;
  creativeId: string | null;
  title: string;
  body: string;
  thumbnail: string | null;
  cta?: string;
  link?: string;
  utm?: string;
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
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram">("facebook");

  useEffect(() => {
    if (!target) return;
    setMessage(target.body ?? "");
    setTitle(target.title ?? "");
    setDescription("");
    setCta(target.cta ?? "");
    setLink(target.link ?? "");
    setUtm(target.utm ?? "");
  }, [target]);

  const save = useMutation({
    mutationFn: () => {
      if (!target?.creativeId) throw new Error("Anúncio sem criativo associado");
      return update({
        data: {
          accountId: accountId ?? undefined,
          adId: target.adId,
          creativeId: target.creativeId,
          message,
          title,
          description,
          cta,
          link,
          utm,
        },
      });
    },
    onSuccess: () => {
      toast.success("Anúncio atualizado com sucesso", {
        description: "As alterações foram enviadas para a Meta.",
      });
      void qc.invalidateQueries({ queryKey: ["ads-manager"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent className="w-full flex flex-col p-0 sm:max-w-4xl border-l border-border/40 bg-background/95 backdrop-blur-md">
        <SheetHeader className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-black tracking-tight truncate max-w-[300px]">
                {target?.adName || "Editar Anúncio"}
              </SheetTitle>
              <SheetDescription className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
                Editor de Criativo Profissional
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col lg:flex-row">
            {/* Form Side */}
            <div className="flex-1 overflow-y-auto border-r border-border/40 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Conteúdo do Anúncio
                </div>

                <div className="grid gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-message" className="text-xs font-bold uppercase tracking-wider opacity-70">Texto principal (Body)</Label>
                    <Textarea
                      id="cr-message"
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Escreva a copy do anúncio aqui..."
                      className="resize-none bg-background border-border/60 focus:border-primary/50 transition-colors"
                    />
                    <div className="text-[10px] text-right text-muted-foreground font-mono">
                      {message.length} caracteres
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-title" className="text-xs font-bold uppercase tracking-wider opacity-70">Título (Headline)</Label>
                    <Input 
                      id="cr-title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título que aparece abaixo da imagem"
                      className="bg-background border-border/60"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-desc" className="text-xs font-bold uppercase tracking-wider opacity-70">Descrição (Opcional)</Label>
                    <Input
                      id="cr-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Texto de apoio abaixo do título"
                      className="bg-background border-border/60"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-foreground pt-2">
                  <Target className="h-4 w-4 text-primary" />
                  Destino e Ação
                </div>

                <div className="grid gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Chamada para ação (CTA)</Label>
                    <Select value={cta} onValueChange={setCta}>
                      <SelectTrigger className="bg-background border-border/60">
                        <SelectValue placeholder="Selecione o botão" />
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
                    <Label htmlFor="cr-link" className="text-xs font-bold uppercase tracking-wider opacity-70">URL de destino</Label>
                    <Input
                      id="cr-link"
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://amtfightwear.com.br/loja"
                      className="bg-background border-border/60"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-utm" className="text-xs font-bold uppercase tracking-wider opacity-70">Rastreamento (UTM)</Label>
                    <Input
                      id="cr-utm"
                      value={utm}
                      onChange={(e) => setUtm(e.target.value)}
                      placeholder="utm_source=meta&utm_medium=cpc"
                      className="bg-background border-border/60 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Side */}
            <div className="w-full lg:w-[380px] bg-muted/10 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Eye className="h-4 w-4 text-primary" />
                  Pré-visualização
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                  <Button 
                    variant={previewPlatform === 'facebook' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-7 w-7 p-0"
                    onClick={() => setPreviewPlatform('facebook')}
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={previewPlatform === 'instagram' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-7 w-7 p-0"
                    onClick={() => setPreviewPlatform('instagram')}
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Ad Frame */}
              <div className="mx-auto w-[300px] bg-background rounded-[2.5rem] p-3 border-[6px] border-foreground/5 shadow-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground/5 rounded-b-2xl"></div>
                
                <div className="bg-background h-full rounded-[2rem] overflow-hidden border border-border/40">
                  {/* Header do Post */}
                  <div className="flex items-center gap-2 p-3 border-b border-border/10">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">AMT</div>
                    <div>
                      <p className="text-[11px] font-black leading-none">AMT Fight Wear</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Patrocinado</p>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="px-3 py-2">
                    <p className="text-[11px] leading-relaxed line-clamp-3">
                      {message || "O texto principal do seu anúncio aparecerá aqui para impactar seu público..."}
                    </p>
                  </div>

                  {/* Image Area */}
                  <div className="aspect-square bg-muted/30 relative">
                    {target?.thumbnail ? (
                      <img
                        src={target.thumbnail}
                        alt="Criativo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                        <ImageOff className="h-10 w-10" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Sem Mídia</span>
                      </div>
                    )}
                  </div>

                  {/* Headline & CTA Area */}
                  <div className="p-3 bg-muted/20 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">
                        {link ? (link.includes('//') ? new URL(link).hostname : link) : "amtfightwear.com.br"}
                      </p>
                      <p className="text-[13px] font-black leading-tight truncate mt-0.5">
                        {title || "Sua Oferta Principal Aqui"}
                      </p>
                    </div>
                    <div className="shrink-0 bg-primary/90 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider">
                      {CTA_LABELS[cta] || "Acesse"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
                  Visualização Mobile
                </div>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border/40 bg-muted/20 flex sm:justify-between items-center gap-4">
          <p className="hidden sm:block text-[10px] text-muted-foreground font-medium max-w-[300px]">
            * As alterações podem levar alguns minutos para serem processadas pela Meta.
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" className="flex-1 sm:flex-none h-10 px-6 font-bold" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 sm:flex-none h-10 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20" 
              onClick={() => save.mutate()} 
              disabled={save.isPending || !target?.creativeId}
            >
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Publicar Alterações
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}