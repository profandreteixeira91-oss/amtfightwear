import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BadgePercent,
  Truck,
  Palette,
  ShieldCheck,
  CheckCircle2,
  Star,
  ArrowRight,
  Factory,
  Award,
  Clock,
  Users,
  Package,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import amtLogo from "@/assets/amt-logo.jpg";
import f1 from "@/assets/atacado-lp/f1-clean.jpg";
import f2 from "@/assets/atacado-lp/f2.jpg";
import f3 from "@/assets/atacado-lp/f3-clean.jpg";
import f4 from "@/assets/atacado-lp/f4-clean.jpg";
import f5 from "@/assets/atacado-lp/f5-clean.jpg";
import f6 from "@/assets/atacado-lp/f6.jpg";

export const Route = createFileRoute("/atacado-lp")({
  head: () => ({
    meta: [
      { title: "Faixas Personalizadas no Atacado — Direto da Fábrica | AMT" },
      {
        name: "description",
        content:
          "Faixas personalizadas direto da fábrica com 25% OFF, customização inclusa e envio para todo o Brasil. Fabricação nacional para academias e franquias.",
      },
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
    desc: "Preço de fabricante para academias, franquias e revendedores. Sem intermediários, sem markup de loja.",
  },
  {
    icon: Palette,
    title: "Customização inclusa",
    desc: "Etiqueta com sua logo, cores da sua academia e bordado do nome do aluno — tudo sem custo extra.",
  },
  {
    icon: Truck,
    title: "Envio para todo o Brasil",
    desc: "Produção rápida e envio para qualquer cidade, com frete calculado por metragem de forma justa.",
  },
];

const stats = [
  { value: "+10", label: "Anos de fábrica", icon: Factory },
  { value: "+500", label: "Academias parceiras", icon: Users },
  { value: "+50 mil", label: "Faixas entregues", icon: Package },
  { value: "25%", label: "OFF no atacado", icon: BadgePercent },
];

const steps = [
  {
    n: "01",
    title: "Escolha sua faixa",
    desc: "Selecione o modelo, cor, tamanhos e quantidades no catálogo de atacado.",
    icon: Palette,
  },
  {
    n: "02",
    title: "Envie sua arte",
    desc: "Nos envie a logo da academia e os nomes dos alunos para bordado.",
    icon: MessageCircle,
  },
  {
    n: "03",
    title: "Produção rápida",
    desc: "Fabricamos sua encomenda com controle de qualidade em cada etapa.",
    icon: Factory,
  },
  {
    n: "04",
    title: "Entrega no Brasil",
    desc: "Pagamento seguro via Mercado Pago e entrega em toda a região.",
    icon: Truck,
  },
];

const testimonials = [
  {
    quote:
      "Compramos as faixas da AMT para a nossa equipe há mais de 2 anos. Qualidade impecável e a customização ficou perfeita.",
    author: "Prof. Rodrigo",
    academy: "Academia Team Rocha — SP",
  },
  {
    quote:
      "O preço de atacado é imbatível e as faixas chegam prontas para graduar nossos alunos. Recomendo demais.",
    author: "Prof. Carlos",
    academy: "CT Fight Club — RJ",
  },
  {
    quote:
      "Etiqueta personalizada com a nossa marca fez toda a diferença. Os alunos adoram e nós economizamos muito.",
    author: "Profa. Marina",
    academy: "Studio BJJ Feminino — MG",
  },
];

const guarantees = [
  { icon: ShieldCheck, title: "Pagamento 100% seguro", desc: "Processado pelo Mercado Pago com criptografia bancária." },
  { icon: Award, title: "Qualidade de fábrica", desc: "Tecido resistente, costura reforçada e acabamento premium." },
  { icon: Clock, title: "Prazo garantido", desc: "Produção e envio dentro do prazo combinado no pedido." },
  { icon: CreditCard, title: "Parcele em até 10x", desc: "Compras acima de R$ 1.000 em até 10x sem juros no cartão." },
];

const faqs = [
  {
    q: "Qual é o pedido mínimo de atacado?",
    a: "O mínimo é de 10 unidades por subcategoria de faixa. Você pode misturar cores e tamanhos livremente dentro da mesma linha.",
  },
  {
    q: "A customização com logo e nome tem custo extra?",
    a: "Não. A etiqueta com a sua logo e o bordado do nome do aluno estão inclusos no preço de atacado.",
  },
  {
    q: "Como funciona o frete?",
    a: "O frete é calculado por metragem de faixa enviada, de forma justa e transparente. Enviamos para todo o Brasil.",
  },
  {
    q: "Qual é o prazo de produção?",
    a: "Depende do volume, mas normalmente entre 10 e 20 dias úteis após aprovação da arte. Prazos são combinados no pedido.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "Pix, boleto e cartão de crédito. Acima de R$ 1.000, parcelamos em até 10x sem juros pelo Mercado Pago.",
  },
];

const gallery = [f1, f5, f2, f4, f3, f6];

function AtacadoLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
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
                <Factory className="h-3.5 w-3.5" /> Fabricação nacional · Direto da fábrica
              </div>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                Compre Faixas <span className="text-primary">Personalizadas</span> Direto da Fábrica
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
                Faixas de alta qualidade para academias, franquias e equipes. Preço de atacado,
                customização inclusa e envio para todo o Brasil.
              </p>

              {/* Bullets de confiança */}
              <ul className="mt-6 space-y-2">
                {[
                  "Etiqueta e bordado personalizados sem custo extra",
                  "25% OFF já aplicado no atacado",
                  "Parcele em até 10x sem juros no Mercado Pago",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

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
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Pagamento seguro (Mercado Pago)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mínimo 10 unidades
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
                <img src={f1} alt="Faixas personalizadas AMT" className="h-full w-full object-cover" />

                {/* Badge de destaque 25% OFF */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -8 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 180, damping: 12 }}
                  className="absolute -left-3 -top-3 md:-left-6 md:-top-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                    <div className="relative flex h-28 w-28 md:h-36 md:w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.6)] ring-4 ring-background">
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-90">
                        Desconto
                      </span>
                      <span className="text-4xl md:text-5xl font-black leading-none">25%</span>
                      <span className="text-sm md:text-base font-black uppercase tracking-wider">OFF</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NÚMEROS / PROVA SOCIAL */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="text-center"
            >
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-black tracking-tight md:text-3xl">{s.value}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3 VANTAGENS */}
      <section className="bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Por que comprar da AMT?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Três vantagens que fazem a diferença para sua academia.
            </p>
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

      {/* COMO FUNCIONA — 4 PASSOS */}
      <section className="border-y border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Como funciona seu pedido</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Em 4 passos simples, da escolha à entrega na sua academia.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative rounded-xl border border-border/60 bg-card p-6"
              >
                <div className="absolute right-4 top-4 text-4xl font-black text-primary/15">{step.n}</div>
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIA DE FOTOS REAIS */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Faixas reais, qualidade que se vê</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bordado, etiqueta personalizada e tecido reforçado — direto da nossa produção.
          </p>
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
              <div className="aspect-square overflow-hidden bg-muted">
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

      {/* GARANTIAS */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Comprando com segurança</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fábrica com anos de estrada e pagamento processado pelas melhores plataformas do Brasil.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {guarantees.map((g, i) => (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                  <g.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">{g.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{g.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">O que academias parceiras dizem</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Depoimentos de professores e donos de academia.
            </p>
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

      {/* FAQ */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Perguntas frequentes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ainda com dúvidas? Aqui estão as respostas mais comuns.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-xl border border-border/60 bg-background"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
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
                  {open && (
                    <div className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</div>
                  )}
                </div>
              );
            })}
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
