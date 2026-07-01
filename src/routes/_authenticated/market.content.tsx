import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Wand2, Instagram, MessageCircle, Mail, Sparkles, Loader2, Send, Clock, ExternalLink, XCircle, CheckCircle2, AlertCircle, Bot, Play } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import { generateMarketingContent } from "@/lib/marketing.functions";
import { createInstagramPost, listInstagramPosts, cancelInstagramPost } from "@/lib/instagram.functions";
import { getAutoPostSettings, updateAutoPostSettings, runAutoPostNow } from "@/lib/autopost.functions";

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

const STATUS_STYLE: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  draft: { label: "Rascunho", icon: Clock, className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Agendado", icon: Clock, className: "bg-blue-500/15 text-blue-500" },
  publishing: { label: "Publicando", icon: Loader2, className: "bg-amber-500/15 text-amber-500" },
  published: { label: "Publicado", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-500" },
  failed: { label: "Falhou", icon: AlertCircle, className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelado", icon: XCircle, className: "bg-muted text-muted-foreground" },
};

function ContentPage() {
  const generate = useServerFn(generateMarketingContent);
  const publishFn = useServerFn(createInstagramPost);
  const listFn = useServerFn(listInstagramPosts);
  const cancelFn = useServerFn(cancelInstagramPost);
  const qc = useQueryClient();

  const { data: products, isLoading } = useQuery({ queryKey: ["products", "list"], queryFn: fetchProducts });
  const { data: posts } = useQuery({
    queryKey: ["ig-posts"],
    queryFn: () => listFn(),
    refetchInterval: 15000,
  });

  const [productId, setProductId] = useState<string>("");
  const [objective, setObjective] = useState<"atacado" | "varejo">("atacado");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<Generated | null>(null);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

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

  const mut = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Selecione um produto");
      return await generate({
        data: {
          productName: product.name,
          productCategory: product.category,
          productPrice: Number(product.price),
          objective,
          extraInstructions: extra || null,
        },
      });
    },
    onSuccess: (r) => {
      const gen = r as Generated;
      setResult(gen);
      setCaption(gen.instagram);
      if (product?.image_url) setImageUrl(product.image_url);
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

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Agendamento cancelado"); qc.invalidateQueries({ queryKey: ["ig-posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="IA Content Hub"
        description="Gere copies com IA, publique ou agende posts direto no Instagram da AMT."
      />

      <AutoPilotPanel />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <SectionCard title="Briefing">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (products?.length ?? 0) === 0 ? (
            <EmptyState title="Nenhum produto disponível" description="Importe o catálogo antes de gerar conteúdo." />
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Produto em destaque</Label>
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

              <div>
                <Label>Objetivo</Label>
                <Select value={objective} onValueChange={(v) => setObjective(v as "atacado" | "varejo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atacado">Atacado para Professores / Academias</SelectItem>
                    <SelectItem value="varejo">Venda Direta para Aluno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Instruções extras (opcional)</Label>
                <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ex.: foco em graduação, mencionar frete grátis..." />
              </div>

              <Button className="w-full gap-2" disabled={!productId || mut.isPending} onClick={() => mut.mutate()}>
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

                <div className="space-y-2">
                  <Label>URL da imagem (pública)</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
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

      <SectionCard title="Histórico de publicações" delay={0.2}>
        {!posts?.length ? (
          <EmptyState title="Nenhum post ainda" description="Gere uma copy e publique ou agende para começar." />
        ) : (
          <div className="space-y-2">
            {posts.map((p) => {
              const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
              const Icon = s.icon;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="flex items-center gap-3 p-3">
                    <img src={p.image_url} alt="" className="h-14 w-14 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-2 text-sm">{p.caption}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className={s.className}>
                          <Icon className={`mr-1 h-3 w-3 ${p.status === "publishing" ? "animate-spin" : ""}`} />
                          {s.label}
                        </Badge>
                        {p.scheduled_for && <span>Agendado: {new Date(p.scheduled_for).toLocaleString("pt-BR")}</span>}
                        {p.published_at && <span>Publicado: {new Date(p.published_at).toLocaleString("pt-BR")}</span>}
                        {p.error && <span className="text-destructive">{p.error}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.ig_permalink && (
                        <a href={p.ig_permalink} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1">
                          Ver <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {p.status === "scheduled" && (
                        <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(p.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function AutoPilotPanel() {
  const getFn = useServerFn(getAutoPostSettings);
  const updateFn = useServerFn(updateAutoPostSettings);
  const runFn = useServerFn(runAutoPostNow);
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["auto-post-settings"],
    queryFn: () => getFn(),
    refetchInterval: 30000,
  });

  const upd = useMutation({
    mutationFn: (patch: { enabled?: boolean; tone?: string }) => updateFn({ data: patch }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["auto-post-settings"] }); toast.success("Configuração salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: (type?: "post" | "carousel" | "story" | "reel") => runFn({ data: type ? { type } : {} }),
    onSuccess: (r: unknown) => {
      const res = r as { ok?: boolean; skipped?: string; error?: string; theme?: string; type?: string };
      if (res.ok) toast.success(`Publicado (${res.type ?? "post"}): ${res.theme ?? ""}`);
      else if (res.skipped) toast.info(`Ignorado: ${res.skipped}`);
      else if (res.error) toast.error(res.error);
      qc.invalidateQueries({ queryKey: ["ig-posts"] });
      qc.invalidateQueries({ queryKey: ["auto-post-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  type PlanSlot = { hour_utc: number; type: "post" | "carousel" | "story" | "reel"; label?: string };
  const plan = ((settings as unknown as { daily_plan?: PlanSlot[] } | null)?.daily_plan) ?? [];
  const sortedPlan = [...plan].sort((a, b) => {
    const ah = (a.hour_utc - 3 + 24) % 24;
    const bh = (b.hour_utc - 3 + 24) % 24;
    return ah - bh;
  });

  const TYPE_META: Record<PlanSlot["type"], { label: string; emoji: string; className: string }> = {
    post: { label: "Post", emoji: "📸", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
    carousel: { label: "Carrossel", emoji: "🎞️", className: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
    story: { label: "Story", emoji: "⚡", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    reel: { label: "Reels", emoji: "🎬", className: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  };

  return (
    <SectionCard title="🤖 Piloto Automático de Instagram" delay={0.05}>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">Postagens 100% automáticas</div>
                <div className="text-sm text-muted-foreground">
                  A IA usa o <strong>produto real</strong> do catálogo AMT como base, aplica o <strong>logotipo</strong> e insere <strong>texto publicitário</strong> na imagem. Publica sozinha no plano diário abaixo.
                </div>
              </div>
            </div>
            <Switch
              checked={!!settings?.enabled}
              onCheckedChange={(v) => upd.mutate({ enabled: v })}
              disabled={upd.isPending}
            />
          </div>

          <div>
            <Label>📅 Plano diário de conteúdo (horários de Brasília)</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {sortedPlan.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground">Nenhum slot configurado.</div>
              )}
              {sortedPlan.map((slot) => {
                const meta = TYPE_META[slot.type];
                const brHour = (slot.hour_utc - 3 + 24) % 24;
                return (
                  <Card key={`${slot.hour_utc}-${slot.type}`} className={`border p-3 ${meta.className}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{meta.emoji}</span>
                      <Badge variant="outline" className="text-xs">{String(brHour).padStart(2, "0")}:00</Badge>
                    </div>
                    <div className="mt-2 font-semibold">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 min-h-[28px]">{slot.label ?? ""}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 w-full gap-1 text-xs"
                      disabled={runNow.isPending}
                      onClick={() => runNow.mutate(slot.type)}
                    >
                      {runNow.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Rodar agora
                    </Button>
                  </Card>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Total: <strong>1 post + 1 carrossel + 2 stories + 1 reels por dia</strong>, distribuídos nos melhores horários do Instagram para o público de artes marciais.
            </div>
          </div>

          <div>
            <Label>Tom da IA</Label>
            <Select value={settings?.tone ?? "motivacional"} onValueChange={(v) => upd.mutate({ tone: v })}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="motivacional">Motivacional</SelectItem>
                <SelectItem value="tecnico">Técnico / Especialista</SelectItem>
                <SelectItem value="promocional">Promocional / Oferta</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="atacado">Atacado B2B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs">
            <div>
              <div>Última execução: <span className="font-medium">{settings?.last_run_at ? new Date(settings.last_run_at).toLocaleString("pt-BR") : "nunca"}</span></div>
              <div>Status: <span className={settings?.last_status === "published" ? "text-emerald-500" : settings?.last_status === "failed" ? "text-destructive" : "text-muted-foreground"}>{settings?.last_status ?? "—"}</span> {settings?.last_error && <span className="text-destructive">— {settings.last_error}</span>}</div>
            </div>
            <Button size="sm" variant="secondary" className="gap-2" disabled={runNow.isPending} onClick={() => runNow.mutate(undefined)}>
              {runNow.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Rodar slot atual
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

