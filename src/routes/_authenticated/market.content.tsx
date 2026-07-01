import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Loader2,
  Instagram,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MessageSquare,
  Mail,
  CalendarClock,
  Rocket,
  CheckCircle2,
  Users,
  Target,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { growthService, type Product } from "@/services/growthService";
import { brl as formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/content")({
  head: () => ({ meta: [{ title: "IA Marketing Hub — AMT MarketEngine" }] }),
  component: ContentHubPage,
});

type Objective = "atacado" | "aluno";

type GeneratedCampaign = {
  product: Product;
  objective: Objective;
  extra: string;
  instagram: { caption: string; hashtags: string; cta: string };
  whatsapp: string;
  email: { subject: string; body: string };
};

function ContentHubPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "content-hub"],
    queryFn: () => growthService.products(),
    staleTime: 60_000,
  });

  const [productId, setProductId] = useState<string>("");
  const [objective, setObjective] = useState<Objective>("atacado");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<GeneratedCampaign | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, Product[]> = {};
    (products ?? []).forEach((p) => {
      const k = p.category ?? "Outros";
      (g[k] ??= []).push(p);
    });
    return g;
  }, [products]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === productId),
    [products, productId],
  );

  const generate = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto AMT antes de gerar.");
      return;
    }
    setLoading(true);
    setCampaign(null);
    await new Promise((r) => setTimeout(r, 1400));
    setCampaign(buildCampaign(selectedProduct, objective, extra));
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="IA Marketing Hub"
        description="Copys, posts e mensagens de abordagem geradas para o nicho de Jiu-Jitsu e Judô, com o catálogo real da AMT Fight Wear."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> IA Ativa
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ============ COLUNA ESQUERDA — CONFIGURAÇÃO ============ */}
        <SectionCard title="Configuração da campanha">
          <div className="space-y-5">
            <div>
              <Label className="mb-2 flex items-center gap-2 text-xs">
                <Target className="h-3.5 w-3.5" /> Produto AMT alvo
              </Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto do catálogo AMT" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {Object.entries(grouped).map(([cat, list]) => (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat}
                        </div>
                        {list.slice(0, 30).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex w-full items-center justify-between gap-3">
                              <span className="truncate">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatBRL(p.price)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="min-w-0 text-xs">
                    <div className="truncate font-medium">{selectedProduct.name}</div>
                    <div className="text-muted-foreground">
                      {selectedProduct.category} · Estoque {selectedProduct.stock}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block text-xs">Objetivo da campanha</Label>
              <div className="grid grid-cols-2 gap-2">
                <ObjectiveCard
                  active={objective === "atacado"}
                  onClick={() => setObjective("atacado")}
                  icon={<Users className="h-4 w-4" />}
                  title="Atacado"
                  subtitle="Professores & academias"
                />
                <ObjectiveCard
                  active={objective === "aluno"}
                  onClick={() => setObjective("aluno")}
                  icon={<Target className="h-4 w-4" />}
                  title="Venda direta"
                  subtitle="Aluno final (B2C)"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs">Instruções extras de nicho</Label>
              <Textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={4}
                placeholder="Ex: enfatizar período de graduação de dezembro, incluir bordado Kanji personalizado, mencionar frete grátis para lotes acima de 20 peças…"
              />
            </div>

            <Button onClick={generate} disabled={loading} className="w-full gap-2" size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando copys e imagens…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Gerar Copys e Imagens
                </>
              )}
            </Button>
          </div>
        </SectionCard>

        {/* ============ COLUNA DIREITA — PREVIEW ============ */}
        <SectionCard title="Painel de pré-visualização">
          <AnimatePresence mode="wait">
            {loading && <LoadingPreview key="l" />}

            {!loading && !campaign && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid h-[520px] place-items-center rounded-lg border border-dashed"
              >
                <div className="text-center text-sm text-muted-foreground">
                  <Wand2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Configure o briefing e clique em <b>Gerar Copys e Imagens</b> para visualizar
                  <br />o feed Instagram e as mensagens de abordagem.
                </div>
              </motion.div>
            )}

            {!loading && campaign && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Tabs defaultValue="instagram" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="instagram" className="gap-1.5">
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="email" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="instagram" className="mt-4">
                    <InstagramMock campaign={campaign} />
                  </TabsContent>

                  <TabsContent value="whatsapp" className="mt-4">
                    <WhatsAppMock campaign={campaign} />
                  </TabsContent>

                  <TabsContent value="email" className="mt-4">
                    <EmailMock campaign={campaign} />
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      toast.success("Postagem agendada", {
                        description: "Publicação programada para amanhã 09:00 no Instagram AMT.",
                        icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
                      })
                    }
                  >
                    <CalendarClock className="h-4 w-4" />
                    Agendar Postagem Automática
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={() =>
                      toast.success("Disparo iniciado", {
                        description: "48 leads segmentados receberão o e-mail nas próximas horas.",
                        icon: <Rocket className="h-4 w-4" />,
                      })
                    }
                  >
                    <Rocket className="h-4 w-4" />
                    Disparar E-mails p/ Leads
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>
      </div>
    </>
  );
}

/* -------------------- Sub-componentes -------------------- */

function ObjectiveCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <div className={`mb-1 ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </button>
  );
}

function LoadingPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid h-[520px] place-items-center"
    >
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Refinando copys para o nicho de artes marciais…
        </p>
      </div>
    </motion.div>
  );
}

function InstagramMock({ campaign }: { campaign: GeneratedCampaign }) {
  const { product, instagram } = campaign;
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-primary-foreground">
            AMT
          </div>
          <div>
            <div className="text-sm font-semibold">amtfightwear</div>
            <div className="text-[10px] text-muted-foreground">Patrocinado · Brasil</div>
          </div>
        </div>
        <Instagram className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="aspect-square w-full bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            sem imagem
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="ml-auto h-5 w-5" />
      </div>
      <div className="space-y-1 px-3 pb-3 text-sm">
        <div className="font-semibold">2.481 curtidas</div>
        <p className="whitespace-pre-line">
          <span className="font-semibold">amtfightwear</span> {instagram.caption}
        </p>
        <p className="font-medium text-primary">{instagram.cta}</p>
        <p className="text-xs text-primary/80">{instagram.hashtags}</p>
      </div>
    </div>
  );
}

function WhatsAppMock({ campaign }: { campaign: GeneratedCampaign }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-[#0b141a] p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs text-[#8696a0]">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#25d366] text-xs font-bold text-white">
          AMT
        </div>
        <div>
          <div className="text-sm font-medium text-white">AMT Fight Wear · Comercial</div>
          <div className="text-[10px]">online agora</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-sm text-white shadow">
          <p className="whitespace-pre-line">{campaign.whatsapp}</p>
          <div className="mt-1 text-right text-[10px] text-white/60">09:42 ✓✓</div>
        </div>
      </div>
    </div>
  );
}

function EmailMock({ campaign }: { campaign: GeneratedCampaign }) {
  return (
    <div className="mx-auto max-w-lg overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Assunto</div>
        <div className="text-sm font-semibold">{campaign.email.subject}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          De: comercial@amtfightwear.com.br · Para: leads segmentados
        </div>
      </div>
      {campaign.product.image_url && (
        <img
          src={campaign.product.image_url}
          alt=""
          className="h-40 w-full object-cover"
        />
      )}
      <div className="space-y-3 p-4 text-sm">
        <p className="whitespace-pre-line leading-relaxed">{campaign.email.body}</p>
        <Button size="sm" className="w-full">
          Ver oferta exclusiva
        </Button>
        <p className="text-[10px] text-muted-foreground">
          AMT Fight Wear · Você recebe este e-mail porque foi qualificado como parceiro do nicho de
          artes marciais.
        </p>
      </div>
    </div>
  );
}

/* -------------------- Geração de copy -------------------- */

function buildCampaign(product: Product, objective: Objective, extra: string): GeneratedCampaign {
  const price = formatBRL(product.price);
  const wholesale = formatBRL(product.price * 0.7);
  const extraLine = extra.trim() ? `\n\n📌 ${extra.trim()}` : "";

  if (objective === "atacado") {
    return {
      product,
      objective,
      extra,
      instagram: {
        caption: `🥋 PROFESSOR, o período de graduação está chegando — e sua academia merece equipar os alunos com o padrão AMT.\n\nO ${product.name} foi desenvolvido para resistir aos treinos mais duros do tatame: reforço nos pontos de tração, acabamento profissional e o bordado que só a AMT entrega.${extraLine}\n\n💼 Condição especial ATACADO a partir de 10 unidades — de ${price} por ${wholesale}/un.`,
        hashtags: "#AMTFightWear #JiuJitsu #Judo #Academia #Graduacao #AtacadoBJJ #ProfessorBJJ",
        cta: "👉 Chame no direct e receba a tabela de professor.",
      },
      whatsapp: `Fala, Professor! Aqui é do comercial da AMT Fight Wear 🥋

Vi que sua academia está próxima do período de graduação e separei uma condição exclusiva no ${product.name}:

• Preço cheio: ${price}
• Atacado (10+ un): ${wholesale}/un
• Bordado personalizado da academia incluso
• Frete grátis Brasil todo para lotes 20+${extraLine}

Posso enviar a tabela completa e reservar o lote da sua graduação? 🤝`,
      email: {
        subject: `Professor, condição de atacado no ${product.name} — graduação 2026`,
        body: `Olá, Professor!

O calendário de graduação está apertado — e faltar faixa ou kimono na cerimônia não é opção.

Preparei uma condição exclusiva AMT para sua academia no ${product.name}:

• De ${price} por ${wholesale}/un (pedidos 10+)
• Bordado com o logo da academia sem custo adicional
• Prazo garantido de produção antes da graduação${extraLine}

Somos a marca de confiança de mais de 480 academias de BJJ e Judô no Brasil. Podemos reservar o lote da sua turma esta semana?

Um abraço,
Equipe Comercial AMT Fight Wear`,
      },
    };
  }

  // Aluno / venda direta
  return {
    product,
    objective,
    extra,
    instagram: {
      caption: `🔥 Chegou o ${product.name} — a peça que o guerreiro do tatame esperava.\n\nDesenvolvido com o DNA da AMT Fight Wear: matéria-prima premium, costura reforçada e o acabamento que faz diferença no dia da competição.${extraLine}\n\n🎯 De ${formatBRL(product.price * 1.15)} por apenas ${price} — só nesta semana.`,
      hashtags: "#AMTFightWear #BJJLife #JiuJitsu #Kimono #Faixa #ArteSuave #Guerreiro",
      cta: "🛒 Link direto na bio — estoque limitado.",
    },
    whatsapp: `E aí, guerreiro! 🥋

Aqui é da AMT Fight Wear — vi que você curtiu nosso ${product.name}.

Separei um cupom exclusivo pra fechar hoje:
🎁 5% OFF extra + frete grátis acima de ${formatBRL(299)}
💰 Preço final: ${formatBRL(product.price * 0.95)}${extraLine}

Bora garantir a sua? Posso enviar o link direto do checkout 👊`,
    email: {
      subject: `${product.name} chegou por ${price} — cupom exclusivo dentro`,
      body: `Fala, atleta!

O ${product.name} está entre os mais procurados da linha AMT esta semana — e a gente separou uma condição especial pra você.

• Preço nesta semana: ${price}
• Cupom extra: WARRIOR5 (5% OFF no checkout)
• Frete grátis Brasil todo acima de ${formatBRL(299)}${extraLine}

A AMT é a marca de milhares de faixas-pretas Brasil afora — feita por quem treina, pra quem vive o tatame.

Vamos treinar com o kit certo?
Equipe AMT Fight Wear`,
    },
  };
}
