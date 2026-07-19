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
} from "lucide-react";
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
      { title: "Atacado AMT Fight Wear — Faixas, Kimonos e Patches Personalizados" },
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
}: {
  from: string;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}) {
  const sizing =
    size === "lg" ? "px-8 py-4 text-base md:px-10 md:py-5 md:text-lg" : "px-6 py-3 text-sm md:text-base";
  return (
    <Link
      to="/loja/atacado"
      onClick={() => {
        trackCTA(`buy_${from}`);
        fbqTrack("InitiateCheckout", { source: from });
      }}
      className={`group inline-flex items-center justify-center gap-2 rounded-lg bg-primary font-black uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 ${sizing} ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 md:h-5 md:w-5" />
    </Link>
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
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-background text-foreground">
      <MetaPixelNoscript />

      {/* HEADER FIXO */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <a href="#top" className="flex min-w-0 items-center gap-2">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-9 w-auto shrink-0 rounded-md object-contain" />
            <span className="truncate text-xs font-black uppercase tracking-widest sm:text-sm">
              AMT Fight Wear
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden md:flex md:items-center md:gap-5">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="hidden sm:block">
              <BuyButton from="header" />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menu"
              className="grid h-10 w-10 place-items-center rounded-md border border-border/60 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border/60 bg-background md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-card"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-1 gap-2 pt-2">
                <BuyButton from="mobile_menu" />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: `url(${f1})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
                <Factory className="h-3.5 w-3.5" /> Fabricação própria · Direto da fábrica
              </div>
              <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.4rem]">
                Equipe sua academia com produtos{" "}
                <span className="text-primary">personalizados de fabricação própria</span>.
              </h1>
              <p className="mt-4 max-w-lg text-sm text-muted-foreground sm:text-base md:text-lg">
                Faixas, Kimonos e Patches personalizados para academias de Jiu-Jitsu e Judô.
              </p>

              {/* Bloco de oferta */}
              <div className="mt-6 flex items-stretch overflow-hidden rounded-xl border-2 border-primary/60 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent shadow-lg shadow-primary/10">
                <div className="grid shrink-0 place-items-center bg-primary px-4 py-3 text-primary-foreground">
                  <span className="text-2xl md:text-3xl">🥋</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <div className="text-3xl font-black leading-none text-primary md:text-4xl">25% OFF</div>
                  <div className="text-xs leading-tight text-foreground/85 sm:text-sm">
                    em pedidos acima de <b>10 unidades</b>
                    <br className="hidden sm:block" /> do mesmo modelo.
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <BuyButton from="hero" size="lg" className="w-full sm:w-auto" />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
                <img
                  src={f1}
                  alt="Faixas personalizadas AMT Fight Wear"
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -8 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 180, damping: 12 }}
                  className="absolute -left-3 -top-3 md:-left-6 md:-top-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                    <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.6)] ring-4 ring-background md:h-36 md:w-36">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-90 md:text-xs">
                        Atacado
                      </span>
                      <span className="text-3xl font-black leading-none md:text-5xl">25%</span>
                      <span className="text-xs font-black uppercase tracking-wider md:text-base">OFF</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BARRA DE BENEFÍCIOS */}
      <section className="border-y border-border/60 bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 md:gap-6">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-4xl">
            Nossos produtos <span className="text-primary">personalizados</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Fabricação própria com identidade da sua academia em cada peça.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onViewportEnter={() => trackViewContent(p.name)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                  25% OFF
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-black">{p.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to={p.href}
                    onClick={() => trackCTA(`view_${p.id}`)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-border/70 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:border-foreground/50 hover:bg-background"
                  >
                    Ver Produto
                  </Link>
                  <Link
                    to={p.href}
                    onClick={() => {
                      trackCTA(`buy_${p.id}`);
                      fbqTrack("AddToCart", { content_name: p.name, content_category: "atacado" });
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-black uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
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
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-4xl">
              Por que escolher a <span className="text-primary">AMT Fight Wear</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Fábrica nacional pensada para academias sérias.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyUs.map((w, i) => (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex gap-4 rounded-xl border border-border/60 bg-background p-5"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <w.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black">{w.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONALIZAÇÃO — 4 PASSOS */}
      <section id="personalizacao" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-4xl">
            Como funciona a <span className="text-primary">personalização</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Em 4 passos simples, do envio da arte à entrega na sua academia.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-xl border border-border/60 bg-card p-5"
            >
              <div className="absolute right-4 top-3 text-4xl font-black text-primary/15">{s.n}</div>
              <h3 className="text-base font-black">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <BuyButton from="personalizacao" size="lg" />
        </div>
      </section>

      {/* QUALIDADE + GALERIA */}
      <section id="qualidade" className="border-y border-border/60 bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-4xl">
              Qualidade que <span className="text-primary">se vê e se sente</span>
            </h2>
            <p className="mt-2 text-sm text-background/70 md:text-base">
              Cada detalhe é pensado para durar temporadas inteiras de treino.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {galleryImages.slice(0, 4).map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="overflow-hidden rounded-xl border border-background/10 shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-background/5">
                    <img
                      src={src}
                      alt={`Detalhe de produção AMT ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <ul className="grid gap-4">
              {qualityPoints.map((q, i) => (
                <motion.li
                  key={q.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex gap-4 rounded-xl border border-background/10 bg-background/5 p-4"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
                    <q.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-black">{q.title}</div>
                    <div className="mt-1 text-sm text-background/70">{q.desc}</div>
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
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${f5})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
            Para academias e equipes
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            Sua academia merece uma <span className="text-primary">identidade forte</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-lg">
            Personalizamos faixas, kimonos e patches para fortalecer a identidade visual da sua equipe —
            do detalhe da etiqueta ao bordado do nome de cada aluno.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/loja/atacado"
              onClick={() => {
                trackCTA("equip_academy");
                fbqTrack("InitiateCheckout", { source: "equip_academy" });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-black uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 md:px-10 md:py-5 md:text-lg"
            >
              Equipar Minha Academia
              <ArrowRight className="h-5 w-5" />
            </Link>
            
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL — estrutura pronta */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-4xl">
              Academias que já confiam na <span className="text-primary">AMT</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Novos depoimentos verificados serão publicados aqui em breve.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-dashed border-border/70 bg-background p-6 text-center"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Star className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-semibold text-muted-foreground">
                  Espaço reservado para depoimento
                </div>
                <div className="mt-1 text-xs text-muted-foreground/70">
                  Foto · Nome · Academia · Avaliação
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <BuyButton from="social_proof" label="Quero fazer parte" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-4xl">Perguntas frequentes</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Tudo o que você precisa saber antes de comprar no atacado.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-xl border border-border/60 bg-card"
                >
                  <button
                    onClick={() => {
                      setOpenFaq(open ? null : i);
                      if (!open) fbqCustom("FAQ_Open", { question: item.q });
                    }}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-card/60"
                  >
                    <span className="text-sm font-bold md:text-base">{item.q}</span>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                  {open && <div className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/25 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
          <h2 className="text-3xl font-black tracking-tight md:text-5xl">
            Pronto para <span className="text-primary">equipar sua academia</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-lg">
            Solicite agora mesmo seu pedido com desconto exclusivo para atacado.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BuyButton from="final_cta" size="lg" />
            
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            25% OFF acima de 10 unidades · Pagamento 100% seguro · Envio para todo o Brasil
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-card/40 pb-24 sm:pb-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-6 w-auto rounded object-contain" />
            <span>© {new Date().getFullYear()} AMT Fight Wear · Fábrica nacional de artigos esportivos</span>
          </div>
        </div>
      </footer>

      {/* MOBILE STICKY BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md sm:hidden">
        <div className="px-3 py-2">
          <BuyButton from="sticky_mobile" className="w-full" />
        </div>
      </div>
    </div>
  );
}
