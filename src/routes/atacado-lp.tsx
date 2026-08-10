import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Truck,
  Palette,
  ShieldCheck,
  CheckCircle2,
  Star,
  ArrowRight,
  Factory,
  Award,
  Sparkles,
  Layers,
  Scissors,
  Ribbon,
  Menu,
  X,
  MessageCircle,
  Headphones,
} from "lucide-react";

const WHATSAPP_PHONE = "5582920016732";
const WHATSAPP_MSG = "Olá! Vim pela página de atacado e gostaria de tirar uma dúvida.";
const whatsappHref = (from: string) =>
  `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MSG + " (origem: " + from + ")")}`;
const FAIXAS_HREF = "/loja/atacado";
import { useEffect, useRef, useState } from "react";
import amtLogo from "@/assets/amt-logo.jpg";
import f1 from "@/assets/atacado-lp/f1-clean.jpg";
import f2 from "@/assets/atacado-lp/f2.jpg";
import f3 from "@/assets/atacado-lp/f3-clean.jpg";
import f4 from "@/assets/atacado-lp/f4-clean.jpg";
import f5 from "@/assets/atacado-lp/f5-clean.jpg";
import f6 from "@/assets/atacado-lp/f6.jpg";
import kimonoStoreAsset from "@/assets/kimono-branco.jpg.asset.json";
const kimonoStore = kimonoStoreAsset.url;

const META_PIXEL_ID = "2149647638877087";


export const Route = createFileRoute("/atacado-lp")({
  head: () => ({
    meta: [
      { title: "Atacado de Faixas e Kimonos | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Equipe sua academia com produtos personalizados de fabricação própria. Faixas, kimonos e patches para Jiu-Jitsu e Judô com 25% OFF acima de 10 unidades.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Atacado AMT — Personalizados de fabricação própria" },
      {
        property: "og:description",
        content: "Faixas, kimonos e patches personalizados. 25% OFF acima de 10 unidades do mesmo modelo.",
      },
      { property: "og:type", content: "website" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Atacado AMT Fight Wear — Personalizados",
          itemListElement: [
            {
              "@type": "Product",
              name: "Faixas personalizadas para Jiu-Jitsu e Judô",
              brand: "AMT Fight Wear",
              description:
                "Faixas de fabricação própria com etiqueta personalizada e bordado incluso. 25% OFF acima de 10 unidades.",
            },
            {
              "@type": "Product",
              name: "Kimonos personalizados",
              brand: "AMT Fight Wear",
              description: "Kimonos com bordado e patches da sua academia — atacado direto da fábrica.",
            },
            {
              "@type": "Product",
              name: "Patches personalizados",
              brand: "AMT Fight Wear",
              description: "Patches bordados personalizados para uniformes de artes marciais.",
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: AtacadoLandingPage,
});

// ============ Tracking helpers ============
type FbqFn = (event: string, action: string, data?: Record<string, unknown>) => void;
function fbqTrack(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
  if (typeof fbq === "function") fbq("track", event, data);
}
function fbqCustom(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
  if (typeof fbq === "function") fbq("trackCustom", event, data);
}

function trackCTA(label: string, extra?: Record<string, unknown>) {
  fbqCustom("CTA_Click", { label, ...extra });
}
function trackViewContent(name: string) {
  fbqTrack("ViewContent", { content_name: name, content_category: "atacado" });
}

// ============ Data ============
const benefits = [
  "Personalização inclusa",
  "Produção própria",
  "Envio para todo o Brasil",
  "Atendimento especializado",
];

const products = [
  {
    id: "faixas",
    name: "Faixas Personalizadas",
    desc: "Todas as graduações com etiqueta da sua academia e bordado do aluno inclusos.",
    image: f1,
    href: "/loja/atacado",
  },
  {
    id: "kimonos",
    name: "Kimonos Personalizados",
    desc: "Trançado premium, gola reforçada e bordado da sua marca em cores oficiais.",
    image: kimonoStore,
    href: "/loja/atacado",
  },
  {
    id: "patches",
    name: "Patches Bordados",
    desc: "Patches customizados para uniformes, kimonos e mochilas da sua equipe.",
    image: f6,
    href: "/loja/atacado",
  },
];

const whyUs = [
  { icon: Factory, title: "Produção própria", desc: "Fábrica nacional — sem intermediários." },
  { icon: Award, title: "Acabamento premium", desc: "Costura e bordado profissionais em cada peça." },
  { icon: Palette, title: "Personalização inclusa", desc: "Logo, cores e nomes sem custo extra." },
  { icon: Layers, title: "Alta resistência", desc: "Tecidos reforçados que aguentam o treino pesado." },
  { icon: Headphones, title: "Atendimento especializado", desc: "Time direto da fábrica orientando o seu pedido." },
  { icon: Truck, title: "Entrega para todo o Brasil", desc: "Envio de norte a sul, com prazo combinado." },
];

const steps = [
  { n: "01", title: "Escolha o modelo", desc: "Selecione faixa, kimono ou patch no catálogo de atacado." },
  { n: "02", title: "Envie sua arte", desc: "Compartilhe a logo, cores e lista de alunos para bordado." },
  { n: "03", title: "Aprovamos o layout", desc: "Você recebe o mockup e aprova antes da produção começar." },
  { n: "04", title: "Produzimos e enviamos", desc: "Fabricamos, testamos e enviamos direto para sua academia." },
];

const qualityPoints = [
  { icon: Sparkles, title: "Bordado de alta definição", desc: "Detalhes nítidos que não descolam com o uso." },
  { icon: Ribbon, title: "Materiais premium", desc: "Brim, oxford e algodão selecionados na fábrica." },
  { icon: ShieldCheck, title: "Alta durabilidade", desc: "Peças testadas para resistir a anos de treino." },
  { icon: Scissors, title: "Costura reforçada", desc: "Costura dupla nas pontas de maior desgaste." },
];

const faqs = [
  { q: "Qual o pedido mínimo?", a: "10 unidades do mesmo modelo. Você pode misturar cores e tamanhos livremente." },
  {
    q: "Como funciona a personalização?",
    a: "Envie sua logo e a lista de nomes. Aplicamos etiqueta e bordado sem custo extra no atacado.",
  },
  {
    q: "Qual o prazo de produção?",
    a: "Normalmente entre 10 e 20 dias úteis após aprovação da arte, dependendo do volume.",
  },
  { q: "Vocês entregam em todo o Brasil?", a: "Sim. Enviamos para qualquer cidade, com frete calculado por metragem." },
  {
    q: "Como funciona o desconto de atacado?",
    a: "25% OFF automático em pedidos acima de 10 unidades do mesmo modelo, direto na plataforma.",
  },
  {
    q: "Posso misturar produtos?",
    a: "Sim. O mínimo é por modelo — você pode combinar faixas, kimonos e patches no mesmo pedido.",
  },
];

const galleryImages = [f1, f5, f2, f4, f3, f6];

// ============ Reusable CTA ============
function BuyButton({
  from,
  size = "md",
  className = "",
  label = "Comprar Agora",
  href = "/loja/atacado",
}: {
  from: string;
  size?: "md" | "lg";
  className?: string;
  label?: string;
  href?: string;
}) {
  const sizing =
    size === "lg"
      ? "h-14 px-8 text-[15px] md:h-[60px] md:px-10 md:text-base"
      : "h-11 px-6 text-[13px] md:text-sm";
  return (
    <a
      href={href}
      onClick={() => {
        trackCTA(`buy_${from}`);
        fbqTrack("InitiateCheckout", { source: from });
      }}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary font-bold tracking-tight text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] ring-1 ring-primary/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 ${sizing} ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative">{label}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 md:h-[18px] md:w-[18px]" />
    </a>
  );
}

function WhatsAppButton({
  from,
  size = "md",
  className = "",
  label = "Falar no WhatsApp",
}: {
  from: string;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}) {
  const sizing =
    size === "lg"
      ? "h-14 px-8 text-[15px] md:h-[60px] md:px-10 md:text-base"
      : "h-11 px-6 text-[13px] md:text-sm";
  return (
    <a
      href={whatsappHref(from)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackCTA(`whatsapp_${from}`);
        fbqCustom("ClickWhatsApp", { source: from });
      }}
      className={`group inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background/60 font-semibold tracking-tight text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${sizing} ${className}`}
    >
      <MessageCircle className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />
      {label}
    </a>
  );
}

// ============ Meta Pixel Noscript ============
function MetaPixelNoscript() {
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// ============ Small primitives ============
function EyebrowTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  invert = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
      {eyebrow && (
        <div className="mb-4 inline-flex">
          <span
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] ${
              invert
                ? "bg-white/15 text-white ring-1 ring-white/25"
                : "bg-primary/[0.08] text-primary ring-1 ring-primary/20"
            }`}
          >
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`text-balance text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px] md:text-[44px] ${
          invert ? "text-white" : "text-foreground"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mx-auto mt-5 max-w-xl text-[15px] leading-relaxed md:text-base ${
            invert ? "text-white/80" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ============ Page ============
function AtacadoLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll depth tracking (25/50/75/100)
  const scrollFired = useRef<Set<number>>(new Set());
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = (h.scrollTop || document.body.scrollTop) + window.innerHeight;
      const total = h.scrollHeight;
      if (total <= 0) return;
      const pct = Math.round((scrolled / total) * 100);
      [25, 50, 75, 100].forEach((mark) => {
        if (pct >= mark && !scrollFired.current.has(mark)) {
          scrollFired.current.add(mark);
          fbqCustom("ScrollDepth", { depth: mark });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#produtos", label: "Produtos" },
    { href: "#personalizacao", label: "Personalização" },
    { href: "#qualidade", label: "Qualidade" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-background text-foreground antialiased [font-feature-settings:'ss01','cv11']">
      <MetaPixelNoscript />

      {/* HEADER FIXO */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 lg:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-9 w-auto shrink-0 rounded-md object-contain" />
            <span className="truncate text-[12.5px] font-semibold tracking-[0.02em] sm:text-sm">
              AMT Fight Wear
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-3">
            <nav className="hidden md:flex md:items-center md:gap-7">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="relative text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="hidden sm:block">
              <BuyButton from="header" label="Comprar Faixas" href={FAIXAS_HREF} />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-border/60 transition-colors hover:bg-card md:hidden"
            >
              {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="animate-fade-in border-t border-border/50 bg-background md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-card"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/50 pt-3">
                <BuyButton from="mobile_menu" label="Comprar Faixas" href={FAIXAS_HREF} />
                <WhatsAppButton from="mobile_menu" label="Solicitar Atendimento" />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        {/* Ambient background */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.05]"
          style={{ backgroundImage: `url(${f1})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 opacity-30 blur-[120px]"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />

        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 lg:px-6 lg:py-32">
          <div className="grid gap-14 md:grid-cols-2 md:items-center md:gap-10 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <EyebrowTag>
                <Factory className="h-3 w-3" /> Fabricação própria · Direto da fábrica
              </EyebrowTag>

              <h1 className="mt-6 text-balance text-[38px] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[46px] md:text-[54px] lg:text-[64px]">
                Equipe sua academia com produtos{" "}
                <span className="bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                  personalizados de fabricação própria
                </span>
                <span className="text-primary">.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground md:text-lg">
                Faixas, Kimonos e Patches personalizados para academias de Jiu-Jitsu e Judô.
              </p>

              {/* Bloco de oferta */}
              <div className="mt-8 flex items-stretch overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] via-primary/[0.04] to-transparent shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.35)] ring-1 ring-primary/10">
                <div className="grid shrink-0 place-items-center bg-primary px-5 py-4 text-primary-foreground">
                  <span className="text-2xl md:text-3xl">🥋</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
                  <div className="text-[32px] font-semibold leading-none tracking-tight text-primary md:text-[38px]">
                    25% OFF
                  </div>
                  <div className="text-[13px] leading-tight text-foreground/80 sm:text-sm">
                    em pedidos acima de <b className="font-semibold text-foreground">10 unidades</b>
                    <br className="hidden sm:block" /> do mesmo modelo.
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <BuyButton from="hero" size="lg" label="Comprar Faixas" href={FAIXAS_HREF} className="w-full sm:w-auto" />
                <WhatsAppButton from="hero" size="lg" label="Solicitar Atendimento" className="w-full sm:w-auto" />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Pagamento seguro
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Personalização inclusa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-500" /> Envio Brasil
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="relative"
            >
              {/* Soft glow behind image */}
              <div
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl"
                aria-hidden
              />
              <div className="group relative overflow-hidden rounded-[1.75rem] border border-border/60 shadow-2xl ring-1 ring-black/5">
                <img
                  src={f1}
                  alt="Faixas personalizadas AMT Fight Wear"
                  className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  fetchPriority="high"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-transparent" />
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -8 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 180, damping: 12 }}
                  className="absolute -left-3 -top-3 md:-left-6 md:-top-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                    <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_0_50px_hsl(var(--primary)/0.55)] ring-4 ring-background md:h-36 md:w-36">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-90 md:text-[11px]">
                        Atacado
                      </span>
                      <span className="text-[32px] font-semibold leading-none tracking-tight md:text-[52px]">25%</span>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] md:text-sm">OFF</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BARRA DE BENEFÍCIOS — fundo escuro, elementos claros */}
      <section className="border-y border-white/10 bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4 md:gap-8 md:py-6 lg:px-6">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2.5 text-[12.5px] font-medium tracking-tight text-background sm:text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/10 ring-1 ring-background/25">
                <CheckCircle2 className="h-3.5 w-3.5 text-background" />
              </span>
              <span className="min-w-0 text-background/90">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:py-28 lg:px-6">
        <SectionHeading
          eyebrow="Catálogo"
          title={
            <>
              Nossos produtos <span className="text-primary">personalizados</span>
            </>
          }
          subtitle="Fabricação própria com identidade da sua academia em cada peça."
        />

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {products.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              onViewportEnter={() => trackViewContent(p.name)}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.15)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-md ring-1 ring-primary/40">
                  25% OFF
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] md:text-xl">{p.name}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-muted-foreground">{p.desc}</p>
                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  <Link
                    to={p.href}
                    onClick={() => trackCTA(`view_${p.id}`)}
                    className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-border/70 bg-background px-4 text-[12px] font-semibold tracking-tight transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-card"
                  >
                    Ver Produto
                  </Link>
                  <Link
                    to={p.href}
                    onClick={() => {
                      trackCTA(`buy_${p.id}`);
                      fbqTrack("AddToCart", { content_name: p.name, content_category: "atacado" });
                    }}
                    className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-primary px-4 text-[12px] font-semibold tracking-tight text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/35"
                  >
                    Comprar
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* POR QUE A AMT */}
      <section className="border-y border-border/60 bg-gradient-to-b from-card/30 to-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 lg:px-6">
          <SectionHeading
            eyebrow="Diferenciais"
            title={
              <>
                Por que escolher a <span className="text-primary">AMT Fight Wear</span>
              </>
            }
            subtitle="Fábrica nacional pensada para academias sérias."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {whyUs.map((w, i) => (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex gap-4 rounded-2xl border border-border/60 bg-background/80 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-background hover:shadow-lg"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                  <w.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15.5px] font-semibold tracking-tight">{w.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONALIZAÇÃO — 4 PASSOS */}
      <section id="personalizacao" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:py-28 lg:px-6">
        <SectionHeading
          eyebrow="Processo"
          title={
            <>
              Como funciona a <span className="text-primary">personalização</span>
            </>
          }
          subtitle="Em 4 passos simples, do envio da arte à entrega na sua academia."
        />

        {/* Steps with connecting line on desktop */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[calc(12.5%)] right-[calc(12.5%)] top-[46px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-card hover:shadow-lg"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-full border border-primary/25 bg-background text-[13px] font-semibold tracking-[0.05em] text-primary shadow-sm">
                  {s.n}
                </div>
                <h3 className="text-[15.5px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BuyButton from="personalizacao" size="lg" label="Personalizar Agora" />
          <WhatsAppButton from="personalizacao" size="lg" label="Falar com Especialista" />
        </div>
      </section>

      {/* QUALIDADE + GALERIA — fundo escuro, elementos claros */}
      <section id="qualidade" className="scroll-mt-24 border-y border-white/10 bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 lg:px-6">
          <SectionHeading
            eyebrow="Qualidade"
            title={
              <>
                Qualidade que <span className="text-primary">se vê e se sente</span>
              </>
            }
            subtitle="Cada detalhe é pensado para durar temporadas inteiras de treino."
            invert
          />

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              {galleryImages.slice(0, 4).map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                >
                  <div className="aspect-square overflow-hidden bg-white/5">
                    <img
                      src={src}
                      alt={`Detalhe de produção AMT ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <ul className="grid list-none gap-3.5 pl-0">
              {qualityPoints.map((q, i) => (
                <motion.li
                  key={q.title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.10]"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.7)] ring-1 ring-primary/50 transition-transform duration-300 group-hover:scale-110">
                    <q.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15.5px] font-semibold tracking-tight text-white">{q.title}</div>
                    <div className="mt-1.5 text-[14px] leading-relaxed text-white/75">{q.desc}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PARA ACADEMIAS */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.07]"
          style={{ backgroundImage: `url(${f5})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 opacity-30 blur-[120px]"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28 lg:px-6">
          <EyebrowTag>Para academias e equipes</EyebrowTag>
          <h2 className="mt-6 text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[42px] md:text-[54px]">
            Sua academia merece uma <span className="text-primary">identidade forte</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-lg">
            Personalizamos faixas, kimonos e patches para fortalecer a identidade visual da sua equipe —
            do detalhe da etiqueta ao bordado do nome de cada aluno.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/loja/atacado"
              onClick={() => {
                trackCTA("equip_academy");
                fbqTrack("InitiateCheckout", { source: "equip_academy" });
              }}
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-bold tracking-tight text-primary-foreground shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] ring-1 ring-primary/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-15px_hsl(var(--primary)/0.8)] md:h-[60px] md:px-10 md:text-base"
            >
              Equipar Minha Academia
              <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <WhatsAppButton from="equip_academy" size="lg" label="Solicitar Atendimento" />
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL — estrutura pronta */}
      <section className="border-y border-border/60 bg-gradient-to-b from-card/30 to-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 lg:px-6">
          <SectionHeading
            eyebrow="Prova social"
            title={
              <>
                Academias que já confiam na <span className="text-primary">AMT</span>
              </>
            }
            subtitle="Novos depoimentos verificados serão publicados aqui em breve."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl border border-dashed border-border/70 bg-background/80 p-8 text-center transition-colors hover:border-primary/30"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Star className="h-5 w-5" />
                </div>
                <div className="mt-5 text-[14px] font-medium text-muted-foreground">
                  Espaço reservado para depoimento
                </div>
                <div className="mt-1.5 text-[12px] text-muted-foreground/70">
                  Foto · Nome · Academia · Avaliação
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <BuyButton from="social_proof" label="Quero fazer parte" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-background">
        <div className="mx-auto max-w-3xl px-5 py-20 md:py-28 lg:px-6">
          <SectionHeading
            eyebrow="Suporte"
            title="Perguntas frequentes"
            subtitle="Tudo o que você precisa saber antes de comprar no atacado."
          />
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`overflow-hidden rounded-2xl border bg-card/50 transition-all duration-300 ${
                    open ? "border-primary/30 bg-card shadow-[0_8px_24px_-16px_rgba(0,0,0,0.15)]" : "border-border/60 hover:border-border"
                  }`}
                >
                  <button
                    onClick={() => {
                      setOpenFaq(open ? null : i);
                      if (!open) fbqCustom("FAQ_Open", { question: item.q });
                    }}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
                  >
                    <span className="text-[14.5px] font-semibold tracking-tight md:text-[15.5px]">{item.q}</span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                      }`}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                  {open && (
                    <div className="animate-fade-in px-6 pb-6 text-[14px] leading-relaxed text-muted-foreground">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/25 via-background to-background"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/25 opacity-40 blur-[120px]"
          aria-hidden
        />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center md:py-32 lg:px-6">
          <h2 className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[42px] md:text-[54px]">
            Pronto para <span className="text-primary">equipar sua academia</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-lg">
            Solicite agora mesmo seu pedido com desconto exclusivo para atacado.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BuyButton from="final_cta" size="lg" />
            <WhatsAppButton from="final_cta" size="lg" />
          </div>
          <p className="mt-8 text-[12.5px] text-muted-foreground">
            25% OFF acima de 10 unidades · Pagamento 100% seguro · Envio para todo o Brasil
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-card/40 pb-24 sm:pb-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center text-[12px] text-muted-foreground sm:flex-row sm:justify-between sm:text-left lg:px-6">
          <div className="flex items-center gap-2.5">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-6 w-auto rounded object-contain" />
            <span>© {new Date().getFullYear()} AMT Fight Wear · Fábrica nacional de artigos esportivos</span>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP */}
      <a
        href={whatsappHref("float")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackCTA("whatsapp_float");
          fbqCustom("ClickWhatsApp", { source: "float" });
        }}
        aria-label="Falar no WhatsApp"
        className="fixed right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/40 transition-transform duration-300 hover:scale-105 sm:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
          <MessageCircle className="relative h-6 w-6" strokeWidth={2.4} />
        </span>
        <span className="hidden text-sm font-semibold sm:inline">Fale conosco</span>
      </a>

      {/* MOBILE STICKY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl sm:hidden">
        <div className="px-3 py-2.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}>
          <BuyButton from="sticky_mobile" label="Comprar Faixas" href={FAIXAS_HREF} className="w-full" />
        </div>
      </div>
    </div>
  );
}
