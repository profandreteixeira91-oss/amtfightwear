import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Video, 
  Wand2, 
  Play, 
  Download, 
  Share2,
  Clock,
  Layout,
  FileVideo,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateMetaAdVideo } from "@/lib/ads/video-generator.functions";

export default function VideoAdGenerator() {
  const generateVideo = useServerFn(generateMetaAdVideo);
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: () => generateVideo({ data: { type: "wholesale_belts", format: "9:16", duration: 20 } }),
    onSuccess: (res) => {
      toast.success("Vídeo Publicitário Gerado!", {
        description: "O roteiro e os ativos de Meta Ads estão prontos."
      });
      setResult(res);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar vídeo")
  });

  return (
    <div className="space-y-6">
      {!result ? (
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Gerador de Vídeo Meta Ads</CardTitle>
                <CardDescription>Campanha de Atacado: 25% OFF em Faixas Personalizadas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                  <Layout className="h-3 w-3" /> Formato
                </div>
                <div className="mt-1 text-sm font-bold">Vertical 9:16</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                  <Clock className="h-3 w-3" /> Duração
                </div>
                <div className="mt-1 text-sm font-bold">20 Segundos</div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> IA focado em conversão B2B</p>
              <p className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Estética Ruby Noir (Premium)</p>
              <p className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Roteiro otimizado para Reels/Stories</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full gap-2 py-6 text-lg" 
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
              Gerar Vídeo Publicitário Agora
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preview do Vídeo */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-[9/16] w-full bg-black">
                <img 
                  src={result.preview_url} 
                  alt="Video Preview" 
                  className="h-full w-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-8 rounded-full bg-white/10 p-4 backdrop-blur-sm">
                    <Play className="h-10 w-10 text-white fill-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg">
                    {result.script.scenes[0].overlay}
                  </h3>
                  <Badge variant="secondary" className="mt-4 bg-primary text-white border-none">
                    PREVIEW GERADO
                  </Badge>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="h-1 w-full rounded-full bg-white/20">
                    <div className="h-full w-1/3 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
              <CardFooter className="flex gap-2 p-4">
                <Button 
                  className="flex-1 gap-2" 
                  variant="default"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = result.preview_url;
                    link.download = `amt-ads-video-${result.id || Date.now()}.mp4`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("Download iniciado!");
                  }}
                >
                  <Download className="h-4 w-4" /> Baixar MP4
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Roteiro e Detalhes */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Roteiro Técnico Meta Ads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.script.scenes.map((scene: any, idx: number) => (
                  <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-full before:w-px before:bg-border last:before:hidden">
                    <div className="absolute left-[-4px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {scene.time}
                    </div>
                    <div className="mt-1 font-bold">{scene.overlay}</div>
                    <div className="mt-1 text-xs text-muted-foreground italic">
                      "{scene.visual_description}"
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase opacity-60 flex items-center gap-2">
                  <FileVideo className="h-3 w-3" /> Prompt de Geração IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] font-mono leading-relaxed bg-black/5 p-3 rounded border">
                  {result.script.video_generation_prompt}
                </p>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Gerar Nova Versão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
