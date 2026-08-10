import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Sparkles, 
  Wand2, 
  ArrowRight, 
  Layers, 
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Rocket,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoAdGenerator from "./VideoAdGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateAdCreativeSet } from "@/lib/ads/ads-creative-ai.functions";
import { Badge } from "@/components/ui/badge";

export default function AdsAiGenerator() {
  const [type, setType] = useState<"bjj_belts" | "judo_belts" | "kimonos" | "mixed">("bjj_belts");
  const [style, setStyle] = useState<"carousel" | "single_image" | "video">("carousel");

  const generate = useServerFn(generateAdCreativeSet);

  const mutation = useMutation({
    mutationFn: (data: any) => generate({ data }),
    onSuccess: (res) => {
      toast.success("Conjunto de criativos gerado!", {
        description: "Os prompts e textos estão prontos para revisão."
      });
      setResult(res);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar criativos")
  });

  const [result, setResult] = useState<any>(null);

  return (
    <div className="space-y-6">
      {!result ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerador de Criativos IA
            </CardTitle>
            <CardDescription>
              Crie campanhas completas para Instagram com estética Ruby Noir.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <Label>O que vamos anunciar?</Label>
              <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <RadioGroupItem value="bjj_belts" id="bjj" className="peer sr-only" />
                  <Label htmlFor="bjj" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <span className="mb-2 text-xs font-bold">JIU-JITSU</span>
                    <span className="text-[10px] text-muted-foreground">Faixas</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="judo_belts" id="judo" className="peer sr-only" />
                  <Label htmlFor="judo" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <span className="mb-2 text-xs font-bold">JUDÔ</span>
                    <span className="text-[10px] text-muted-foreground">Faixas</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="kimonos" id="kimonos" className="peer sr-only" />
                  <Label htmlFor="kimonos" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <span className="mb-2 text-xs font-bold">KIMONOS</span>
                    <span className="text-[10px] text-muted-foreground">Premium</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="mixed" id="mixed" className="peer sr-only" />
                  <Label htmlFor="mixed" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <span className="mb-2 text-xs font-bold">MIX</span>
                    <span className="text-[10px] text-muted-foreground">Conjunto</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-3">
              <Label>Formato do Anúncio</Label>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant={style === "carousel" ? "default" : "outline"} 
                  className="flex-1 min-w-[120px] gap-2"
                  onClick={() => setStyle("carousel")}
                >
                  <Layers className="h-4 w-4" /> Carrossel
                </Button>
                <Button 
                  variant={style === "single_image" ? "default" : "outline"} 
                  className="flex-1 min-w-[120px] gap-2"
                  onClick={() => setStyle("single_image")}
                >
                  <ImageIcon className="h-4 w-4" /> Imagem Única
                </Button>
                <Button 
                  variant={style === "video" ? "default" : "outline"} 
                  className="flex-1 min-w-[120px] gap-2 border-primary/40 text-primary hover:text-primary-foreground"
                  onClick={() => setStyle("video")}
                >
                  <Video className="h-4 w-4" /> Vídeo 9:16
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {style === "video" ? (
              <div className="w-full">
                <VideoAdGenerator />
              </div>
            ) : (
              <Button 
                className="w-full gap-2 py-6 text-lg" 
                onClick={() => mutation.mutate({ type, style, name: "Campanha IA " + new Date().toLocaleDateString() })}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                Gerar Conjunto de Imagens e Copy
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{result.campaign_name}</h2>
              <p className="text-sm text-muted-foreground">Gerado via IA • Prumo Ruby Noir</p>
            </div>
            <Button variant="outline" onClick={() => setResult(null)}>Novo Conjunto</Button>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Texto Principal (Ad Copy)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm italic">
                {result.ad_copy}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Badge>{result.cta_label}</Badge>
                <span className="text-xs text-muted-foreground">CTA selecionado para alta conversão</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.suggested_ads.map((ad: any, idx: number) => (
              <Card key={ad.id} className="overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img src={ad.thumbnail} alt={ad.title} className="h-full w-full object-cover opacity-60 grayscale" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <ImageIcon className="h-4 w-4" /> Ver Prompt IA
                    </Button>
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Card {idx + 1}: {ad.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{ad.body}</CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button variant="ghost" className="w-full gap-2 text-xs" size="sm">
                    <CheckCircle2 className="h-3 w-3" /> Revisado
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Rocket className="h-10 w-10 text-primary" />
              <div>
                <h3 className="text-lg font-bold">Pronto para o Próximo Passo?</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  As imagens estruturadas podem ser geradas automaticamente usando o gerador de ativos DALL-E 3 da AMT ou enviadas diretamente para a sua biblioteca de mídias da Meta.
                </p>
              </div>
              <Button className="gap-2">
                Enviar para Biblioteca da Meta <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
