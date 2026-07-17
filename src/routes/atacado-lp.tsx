import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BadgePercent, Truck, Palette, ShieldCheck, CheckCircle2, Star, ArrowRight, Factory } from "lucide-react";
import amtLogo from "@/assets/amt-logo.jpg";
import f1 from "@/assets/atacado-lp/f1.jpg";
import f2 from "@/assets/atacado-lp/f2.jpg";
import f3 from "@/assets/atacado-lp/f3.jpg";
import f4 from "@/assets/atacado-lp/f4.jpeg";
import f5 from "@/assets/atacado-lp/f5.jpeg";
import f6 from "@/assets/atacado-lp/f6.jpg";

export const Route = createFileRoute("/atacado-lp")({
  head: () => ({
    meta: [
      { title: "Faixas Personalizadas no Atacado — Direto da Fábrica | AMT" },
      { name: "description", content: "Compre faixas personalizadas direto da fábrica com 25% OFF, customização inclusa e envio para todo o Brasil." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Faixas Personalizadas no Atacado — Direto da Fábrica" },
      { property: "og:description", content: "25% OFF, customização inclusa e envio para todo o Brasil." },
    ],
  }),
  component: AtacadoLandingPage,
});

const advantages = [
  {
    icon: BadgePercent,
    title: "25% OFF direto da fábrica",
    desc: "Preço de fabricante para academias, franquias e revendedores. Sem intermediários.",
  },
  {
    icon: Palette,
    title: "Customização inclusa",
    desc: "Etiqueta com sua logo, cores da sua academia e bordados personalizados — sem custo extra.",
  },
  {
    icon: Truck,
    title: "Envio para todo o Brasil",
    desc: "Produção rápida e envio para qualquer cidade do país, com frete calculado por metragem.",
  },
];

const testimonials = [
  {
    quote: "Compramos as faixas da AMT para a nossa equipe há mais de 2 anos. Qualidade impecável e a customização ficou perfeita.",
    author: "Prof. Rodrigo",
    academy: "Academia Team Rocha — SP",
  },
  {
    quote: "O preço de atacado é imbatível e as faixas chegam prontas para graduar nossos alunos. Recomendo demais.",
    author: "Prof. Carlos",
    academy: "CT Fight Club — RJ",
  },
  {
    quote: "Etiqueta personalizada com a nossa marca fez toda a diferença. Os alunos adoram e nós economizamos muito.",
    author: "Profa. Marina",
    academy: "Studio BJJ Feminino — MG",
  },
];

const gallery = [f1, f2, f3, f4, f5, f6];

function AtacadoLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP BAR COM LOGO */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-10 w-auto rounded-md object-contain" />
            <span className="hidden text-sm font-black uppercase tracking-widest sm:inline">AMT Fight Wear</span>
          </div>
          <Link
            to="/loja/atacado"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5"
          >
            Comprar Agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${f1})` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Factory className="h-3.5 w-3.5" /> Direto da fábrica
              </div>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                Compre Faixas <span className="text-primary">Personalizadas</span> Direto da Fábrica
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
                Faixas de alta qualidade para academias, franquias e equipes. Preço de atacado, customização inclusa e envio para todo o Brasil.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/loja/atacado"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
                >
                  Comprar Agora
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Pagamento seguro (Mercado Pago)</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mínimo 10 unidades</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
                <img src={f1} alt="Faixas personalizadas AMT" className="h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-primary px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg">
                  25% OFF
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3 VANTAGENS */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Por que comprar da AMT?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Três vantagens que fazem a diferença para sua academia.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {advantages.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/30">
                  <a.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIA DE FOTOS REAIS */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Faixas reais, qualidade que se vê</h2>
          <p className="mt-2 text-sm text-muted-foreground">Fotos reais das nossas faixas personalizadas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {gallery.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={src}
                  alt={`Faixa personalizada AMT ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">O que academias parceiras dizem</h2>
            <p className="mt-2 text-sm text-muted-foreground">Depoimentos de professores e donos de academia.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <div className="mb-3 flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90">"{t.quote}"</p>
                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="text-sm font-bold">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.academy}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Pronto para equipar sua academia?</h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            25% OFF direto da fábrica, com customização inclusa e envio para todo o Brasil.
          </p>
          <div className="mt-8">
            <Link
              to="/loja/atacado"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-10 py-5 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-primary/50"
            >
              Comprar Agora
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Mínimo de 10 unidades por subcategoria · Pagamento 100% seguro via Mercado Pago
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-6 w-auto rounded object-contain" />
            <span>© {new Date().getFullYear()} AMT Fight Wear</span>
          </div>
          <span>Fábrica de artigos esportivos para artes marciais.</span>
        </div>
      </footer>
    </div>
  );
}
