import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Wand2, Instagram, MessageCircle, Mail, Sparkles, Loader2, Send, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { generateMarketingContent, suggestViralTopics, autoBriefFromViral } from "@/lib/marketing.functions";
import { createInstagramPost, listInstagramPosts } from "@/lib/instagram.functions";
import { PostCalendar, type CalendarPost } from "@/components/marketing/PostCalendar";


export const Route = createFileRoute("/_authenticated/market/content")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — IA Content Hub" }] }),
  component: ContentPage,
});


type Product = { id: string; name: string; category: string | null; price: number; image_url: string | null };
type Generated = { instagram: string; whatsapp: string; email_subject: string; email_body: string };

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("id,name,category,price,image_url").limit(500);
  if (error) throw error;
  return (data ?? []) as Product[];
}

type ImageBriefingProduct = { name: string; category: string | null } | null;
function buildImagePrompt(args: {
  product: ImageBriefingProduct;
  contentType: string;
  topic: string;
  objective: "atacado" | "varejo";
  instagram: string;
}): string {
  const { product, contentType, topic, objective, instagram } = args;
  const firstLine = instagram.split("\n").find((l) => l.trim().length > 0)?.slice(0, 120) ?? "";
  const productBlock = product
    ? `Produto em destaque: ${product.name}${product.category ? ` (${product.category})` : ""}. Fotografia comercial premium, iluminação de estúdio, produto nítido em primeiro plano.`
    : "Cena editorial de artes marciais (Jiu-Jitsu / Judô): dojo, tatame, atleta de kimono, mood cinematográfico. SEM produto fictício.";
  const angleMap: Record<string, string> = {
    product: "foto de produto premium, fundo neutro com textura sutil",
    category: "linha de produtos em composição editorial",
    motivational: "atleta em silhueta dramática, dojo à noite, contraste forte",
    educational: "detalhe técnico de jiu-jitsu, mão ajustando faixa, mood instrucional",
    athlete: "atleta em treino, foco em expressão e postura, ambiente de dojo",
    event: "cena de competição / arena, energia coletiva, luzes de tatame",
    behind: "bastidores da marca AMT: costura de kimono, tecidos, processo artesanal",
    brand_story: "identidade AMT Fight Wear: preto, dourado suave, tipografia forte, mood premium",
    engagement: "composição com espaço para pergunta/enquete, mood conversacional",
  };
  const angle = angleMap[contentType] ?? "cena editorial de artes marciais";
  const audience = objective === "atacado" ? "público: professores/academias" : "público: praticantes/alunos";
  return [
    `AMT Fight Wear — creative para Instagram. ${angle}.`,
    productBlock,
    topic ? `Tema: ${topic}.` : "",
    firstLine ? `Mote da copy: "${firstLine}".` : "",
    audience + ".",
    "Paleta: preto, dourado suave, textura de tatame. Sem texto na imagem (a legenda vai fora). Alta resolução, publish-ready.",
  ].filter(Boolean).join(" ");
}


function ContentPage() {
  const generate = useServerFn(generateMarketingContent);
  const suggestFn = useServerFn(suggestViralTopics);
  const autoBriefFn = useServerFn(autoBriefFromViral);
  const publishFn = useServerFn(createInstagramPost);
  const listFn = useServerFn(listInstagramPosts);
  const qc = useQueryClient();


  const { data: products, isLoading } = useQuery({ queryKey: ["products", "list"], queryFn: fetchProducts });
  const { data: posts } = useQuery({
    queryKey: ["ig-posts"],
    queryFn: () => listFn(),
    refetchInterval: 15000,
  });

  const [productId, setProductId] = useState<string>("");
  const [objective, setObjective] = useState<"atacado" | "varejo">("varejo");
  const [contentType, setContentType] = useState<
    "product" | "category" | "motivational" | "educational" | "athlete" | "event" | "behind" | "brand_story" | "engagement"
  >("product");
  const [topic, setTopic] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<Generated | null>(null);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // ---- Geração de imagem com IA ----
  const uploadImageFn = useServerFn(uploadContentImage);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspect, setImageAspect] = useState<"1:1" | "4:3" | "3:4" | "9:16" | "16:9">("1:1");
  const [genImage, setGenImage] = useState<{ src: string; final: boolean } | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);


  const suggestMut = useMutation({
    mutationFn: async () => {
      const r = await suggestFn({ data: { contentType, objective } });
      return (r as { suggestions: string[] }).suggestions ?? [];
    },
    onSuccess: (list) => {
      setSuggestions(list);
      if (list.length === 0) toast.info("Sem sugestões — sincronize o Instagram para ver dados virais.");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao buscar sugestões"),
  });

  const product = useMemo(() => products?.find((p) => p.id === productId) ?? null, [products, productId]);
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    (products ?? []).forEach((p) => {
      const key = p.category ?? "Outros";
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const productRequired = contentType === "product" || contentType === "category";

  const mut = useMutation({
    mutationFn: async () => {
      if (productRequired && !product) throw new Error("Selecione um produto para este tipo de conteúdo");
      return await generate({
        data: {
          productName: product?.name ?? null,
          productCategory: product?.category ?? null,
          productPrice: product ? Number(product.price) : null,
          objective,
          contentType,
          topic: topic || null,
          callToAction: callToAction || null,
          extraInstructions: extra || null,
        },
      });
    },
    onSuccess: (r) => {
      const gen = r as Generated;
      setResult(gen);
      setCaption(gen.instagram);
      if (product?.image_url) setImageUrl(product.image_url);
      // Auto-preenche o prompt da imagem com base no briefing
      setImagePrompt(buildImagePrompt({
        product,
        contentType,
        topic,
        objective,
        instagram: gen.instagram,
      }));
      toast.success("Conteúdo gerado pela IA");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar conteúdo"),
  });


  const publishMut = useMutation({
    mutationFn: async (mode: "now" | "schedule") => {
      if (!caption.trim()) throw new Error("Legenda vazia");
      if (!imageUrl.trim()) throw new Error("Imagem obrigatória (URL pública)");
      if (mode === "schedule" && !scheduleAt) throw new Error("Escolha data e hora");
      return await publishFn({
        data: {
          caption,
          imageUrl,
          productId: productId || null,
          scheduledFor: mode === "schedule" ? new Date(scheduleAt).toISOString() : null,
          publishNow: mode === "now",
        },
      });
    },
    onSuccess: (_r, mode) => {
      toast.success(mode === "now" ? "Publicado no Instagram!" : "Post agendado com sucesso");
      qc.invalidateQueries({ queryKey: ["ig-posts"] });
      if (mode === "now") { setScheduleAt(""); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autoBriefMut = useMutation({
    mutationFn: async () => await autoBriefFn({ data: { objective } }),
    onSuccess: (r) => {
      const b = r as {
        contentType: typeof contentType;
        productId: string | null;
        topic: string | null;
        callToAction: string | null;
        extraInstructions: string | null;
        rationale: string | null;
      };
      setContentType(b.contentType);
      if (b.productId) {
        setProductId(b.productId);
        const p = products?.find((x) => x.id === b.productId);
        if (p?.image_url) setImageUrl(p.image_url);
      }
      if (b.topic) setTopic(b.topic);
      if (b.callToAction) setCallToAction(b.callToAction);
      if (b.extraInstructions) setExtra(b.extraInstructions);
      toast.success(b.rationale ? `Briefing sugerido: ${b.rationale}` : "Briefing sugerido pela IA");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar briefing"),
  });

  // ---- Geração de imagem com IA ----
  async function handleGenerateImage() {
    let prompt = imagePrompt.trim();
    if (!prompt) {
      prompt = buildImagePrompt({ product, contentType, topic, objective, instagram: caption });
      setImagePrompt(prompt);
    }
    setGenImage({ src: "", final: false });
    setImageBusy(true);
    try {
      await streamImage(
        "/api/generate-ad-image",
        { prompt, aspectRatio: imageAspect },
        (src, final) => setGenImage({ src, final }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem");
      setGenImage(null);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleUseGeneratedImage() {
    if (!genImage?.src || !genImage.final) return;
    setUploadBusy(true);
    try {
      const res = await uploadImageFn({ data: { base64: genImage.src, ext: "png" } });
      const { url } = res as { url: string; path: string };
      setImageUrl(url);
      toast.success("Imagem aplicada ao post");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploadBusy(false);
    }
  }



  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="IA Content Hub"
        description="Gere copies com IA e agende posts no calendário estilo Meta Business."
      />



      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <SectionCard title="Briefing" description="Escolha o tipo de conteúdo — nem toda postagem precisa ser sobre produto.">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Wand2 className="h-4 w-4 text-primary" /> Briefing automático (baseado nos posts virais)
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A IA lê seus posts mais engajados + catálogo e propõe tipo de conteúdo, produto, CTA e ângulo.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 shrink-0"
                    disabled={autoBriefMut.isPending}
                    onClick={() => autoBriefMut.mutate()}
                  >
                    {autoBriefMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Sugerir briefing
                  </Button>
                </div>
              </div>

              <div>
                <Label>Tipo de conteúdo</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">🛒 Produto — divulgar item específico</SelectItem>
                    <SelectItem value="category">📦 Categoria / coleção</SelectItem>
                    <SelectItem value="motivational">🔥 Motivacional — mentalidade de tatame</SelectItem>
                    <SelectItem value="educational">🎓 Educativo — dica técnica, história, glossário</SelectItem>
                    <SelectItem value="athlete">🥋 Atleta / comunidade em destaque</SelectItem>
                    <SelectItem value="event">📅 Evento / competição / lançamento</SelectItem>
                    <SelectItem value="behind">🎬 Bastidores / processo AMT</SelectItem>
                    <SelectItem value="brand_story">🏆 História da marca</SelectItem>
                    <SelectItem value="engagement">💬 Engajamento — pergunta / enquete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(contentType === "product" || contentType === "category") ? (
                (products?.length ?? 0) === 0 ? (
                  <EmptyState title="Nenhum produto disponível" description="Importe o catálogo para postagens de produto." />
                ) : (
                  <div>
                    <Label>Produto {productRequired ? "*" : "(opcional)"}</Label>
                    <Select value={productId} onValueChange={(v) => { setProductId(v); const p = products?.find(x => x.id === v); if (p?.image_url) setImageUrl(p.image_url); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {grouped.map(([cat, items]) => (
                          <div key={cat}>
                            <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{cat}</div>
                            {items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Tema / mote (opcional)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      disabled={suggestMut.isPending}
                      onClick={() => suggestMut.mutate()}
                    >
                      {suggestMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {suggestions.length ? "Atualizar sugestões" : "Sugerir a partir dos posts virais"}
                    </Button>
                  </div>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex.: disciplina no treino, primeira faixa preta, respeito ao oponente"
                  />
                  {suggestions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <TrendingUp className="h-3 w-3" /> Sugestões baseadas nos posts mais virais
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setTopic(s)}
                            className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Público / objetivo comercial</Label>
                <Select value={objective} onValueChange={(v) => setObjective(v as "atacado" | "varejo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="varejo">Aluno / praticante (varejo)</SelectItem>
                    <SelectItem value="atacado">Professor / academia (atacado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Call to action desejado (opcional)</Label>
                <Input
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  placeholder="Ex.: marca um amigo, comenta sua faixa, visita o site, chama no WhatsApp"
                />
              </div>

              <div>
                <Label>Instruções extras (opcional)</Label>
                <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ex.: foco em graduação, mencionar frete grátis, tom mais direto..." />
              </div>

              <Button
                className="w-full gap-2"
                disabled={mut.isPending || (productRequired && !productId)}
                onClick={() => mut.mutate()}
              >
                {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...</> : <><Sparkles className="h-4 w-4" /> Gerar copies</>}
              </Button>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Preview & Publicação" delay={0.1}>
          {!result ? (
            <EmptyState title="Preencha o briefing" description="A IA vai gerar copies para Instagram, WhatsApp e E-mail." />
          ) : (
            <Tabs defaultValue="ig">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ig"><Instagram className="mr-1 h-3 w-3" /> Instagram</TabsTrigger>
                <TabsTrigger value="wa"><MessageCircle className="mr-1 h-3 w-3" /> WhatsApp</TabsTrigger>
                <TabsTrigger value="em"><Mail className="mr-1 h-3 w-3" /> E-mail</TabsTrigger>
              </TabsList>

              <TabsContent value="ig" className="space-y-3">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="overflow-hidden">
                    {imageUrl && (
                      <div className="aspect-square w-full bg-muted">
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda do post..." />
                    </div>
                  </Card>
                </motion.div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <ImageIcon className="h-4 w-4 text-primary" /> Gerar imagem com IA
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Textarea
                      rows={3}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Descreva a arte que quer gerar (auto-preenchido a partir do briefing)..."
                      className="text-xs"
                    />
                    <Select value={imageAspect} onValueChange={(v) => setImageAspect(v as typeof imageAspect)}>
                      <SelectTrigger className="w-24 self-start"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 feed</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="3:4">3:4 retrato</SelectItem>
                        <SelectItem value="9:16">9:16 story</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5" disabled={imageBusy} onClick={handleGenerateImage}>
                      {imageBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {genImage ? "Regenerar" : "Gerar imagem"}
                    </Button>
                    {genImage?.final && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={uploadBusy}
                        onClick={handleUseGeneratedImage}
                      >
                        {uploadBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Usar essa imagem no post
                      </Button>
                    )}
                  </div>

                  {genImage?.src && (
                    <div className="overflow-hidden rounded-md border border-border bg-muted">
                      <img
                        src={genImage.src}
                        alt="Prévia gerada por IA"
                        className={`w-full transition-[filter] duration-300 ${genImage.final ? "" : "blur-2xl"}`}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>URL da imagem (pública)</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... ou use o gerador acima" />
                </div>


                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  <Button variant="outline" className="gap-2" disabled={publishMut.isPending || !scheduleAt} onClick={() => publishMut.mutate("schedule")}>
                    <Clock className="h-4 w-4" /> Agendar
                  </Button>
                </div>

                <Button className="w-full gap-2" disabled={publishMut.isPending} onClick={() => publishMut.mutate("now")}>
                  {publishMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4" /> Publicar agora no Instagram</>}
                </Button>
              </TabsContent>

              <TabsContent value="wa">
                <Card className="bg-[#0b141a] p-4">
                  <div className="ml-auto max-w-[85%] rounded-lg bg-[#005c4b] p-3 text-sm text-white whitespace-pre-wrap">{result.whatsapp}</div>
                </Card>
              </TabsContent>
              <TabsContent value="em">
                <Card className="p-4">
                  <div className="mb-2 text-xs text-muted-foreground">Assunto</div>
                  <div className="mb-4 font-semibold">{result.email_subject}</div>
                  <div className="text-sm whitespace-pre-wrap">{result.email_body}</div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SectionCard>
      </div>

      <SectionCard title="📅 Calendário de postagens" description="Estilo Meta Business — clique num dia para agendar, ou num post para editar." delay={0.2}>
        {!posts?.length ? (
          <EmptyState title="Nenhum post ainda" description="Gere uma copy e agende no calendário para começar." />
        ) : (
          <PostCalendar
            posts={(posts as unknown as CalendarPost[]) ?? []}
            onScheduleAt={(iso) => setScheduleAt(iso)}
          />
        )}
      </SectionCard>
    </>
  );
}


