import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, Instagram, Linkedin, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AMT_CATALOG } from "@/lib/marketMock";

export const Route = createFileRoute("/_authenticated/market/content")({
  head: () => ({ meta: [{ title: "IA Content Hub — AMT MarketEngine" }] }),
  component: ContentHubPage,
});

const OBJECTIVES = [
  "Venda por atacado para academias",
  "Graduação de alunos",
  "Lançamento de linha Premium",
  "Engajamento com Professores",
  "Projeto Social / Escolas",
];

const PRODUCT_IMG: Record<string, string> = {
  Kimono: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&auto=format&fit=crop",
  Faixa: "https://images.unsplash.com/photo-1591117207239-788bf8de6c3b?w=800&auto=format&fit=crop",
  "Patch/Backnumber": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&auto=format&fit=crop",
};

function ContentHubPage() {
  const [productId, setProductId] = useState(AMT_CATALOG[2].id);
  const [objective, setObjective] = useState(OBJECTIVES[1]);
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<{ text: string; hashtags: string; product: typeof AMT_CATALOG[0] } | null>(null);

  const generate = async () => {
    setLoading(true);
    setPost(null);
    await new Promise((r) => setTimeout(r, 1600));
    const product = AMT_CATALOG.find((p) => p.id === productId)!;
    const text = buildCopy(product.name, objective);
    setPost({
      text,
      hashtags: "#AMTFightWear #JiuJitsu #Judo #BJJLife #Kimono #Faixa #ArteSuave",
      product,
    });
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="IA Content Hub"
        description="Geração de conteúdo especializado em Jiu-Jitsu e Judô com produtos AMT em destaque."
        actions={<Badge variant="secondary" className="gap-1"><Wand2 className="h-3 w-3" /> IA</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Briefing do post">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs">Produto AMT em destaque</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMT_CATALOG.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Objetivo do post</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Observações opcionais</Label>
              <Textarea placeholder="Ex: destacar bordado Kanji e entrega para academias..." rows={3} />
            </div>
            <Button onClick={generate} disabled={loading} className="w-full gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando conteúdo…</> : <><Wand2 className="h-4 w-4" /> Gerar Post com IA</>}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Preview — Feed">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-[420px] place-items-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Refinando copy para {objective.toLowerCase()}…</p>
                </div>
              </motion.div>
            )}
            {!loading && post && (
              <motion.div key="p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">AMT</div>
                      <div>
                        <div className="text-sm font-semibold">amtfightwear</div>
                        <div className="text-[10px] text-muted-foreground">Patrocinado</div>
                      </div>
                    </div>
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="aspect-square w-full bg-muted">
                    <img src={PRODUCT_IMG[post.product.category]} alt={post.product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" />
                    <Bookmark className="ml-auto h-5 w-5" />
                  </div>
                  <div className="space-y-1 px-3 pb-3 text-sm">
                    <div className="font-semibold">2.481 curtidas</div>
                    <p className="whitespace-pre-line"><span className="font-semibold">amtfightwear</span> {post.text}</p>
                    <p className="text-xs text-primary">{post.hashtags}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Linkedin className="h-4 w-4" /> Variação para LinkedIn (B2B / Academias)
                  </div>
                  <p className="text-sm">
                    {post.product.name} — solução AMT para academias que buscam padronização e durabilidade nas graduações. Fale com nosso comercial e receba condição especial para lotes acima de 20 unidades.
                  </p>
                </div>
              </motion.div>
            )}
            {!loading && !post && (
              <div className="grid h-[420px] place-items-center text-sm text-muted-foreground">
                Configure o briefing e gere o primeiro post.
              </div>
            )}
          </AnimatePresence>
        </SectionCard>
      </div>
    </>
  );
}

function buildCopy(product: string, objective: string) {
  const hooks: Record<string, string> = {
    "Venda por atacado para academias": `🥋 Sua academia merece o melhor. O ${product} foi desenvolvido para resistir aos treinos mais intensos do tatame — e agora com condição especial para pedidos em atacado.`,
    "Graduação de alunos": `⚡ Chegou a hora da graduação. Presenteie seus alunos com o ${product} — a peça oficial da AMT Fight Wear pra marcar essa evolução no Jiu-Jitsu.`,
    "Lançamento de linha Premium": `🔥 Novidade AMT: o ${product} acaba de chegar. Trançado premium, bordado impecável e a assinatura de quem entende de arte suave.`,
    "Engajamento com Professores": `👊 Professor, você é a base do nosso esporte. O ${product} foi feito pensando em quem passa horas no tatame formando novos campeões.`,
    "Projeto Social / Escolas": `❤️ O Jiu-Jitsu transforma vidas. O ${product} está disponível em condição especial para escolas e projetos sociais que levam a arte suave para novas gerações.`,
  };
  return hooks[objective] ?? `Conheça o ${product} da AMT Fight Wear.`;
}
