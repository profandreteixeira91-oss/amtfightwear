import { useState } from "react";
import {
  ShieldCheck,
  Factory,
  Palette,
  Headphones,
  Truck,
  Award,
  ChevronDown,
  ArrowRight,
  MessageCircle,
  Instagram,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProductImage } from "@/components/store/ProductImage";

/* ---------------------------------- Descontos --------------------------------- */

export function WholesaleTiers({
  minPerSubcategory,
  discountPercent,
}: {
  minPerSubcategory: number;
  discountPercent: number;
}) {
  const tiers = [
    { qty: minPerSubcategory, label: `${discountPercent}% OFF`, note: "Preço de atacado liberado" },
    { qty: minPerSubcategory * 2, label: `${discountPercent}% OFF`, note: "Prioridade na fila de produção" },
    { qty: minPerSubcategory * 3, label: `${discountPercent}% OFF`, note: "Etiqueta personalizada grátis" },
  ];
  return (
    <section aria-label="Descontos por quantidade" className="rounded-2xl border bg-card p-4">
      <h2 className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
        Desconto por quantidade
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.qty} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-sm font-black tabular-nums">{t.qty}+ un.</div>
            <div className="text-lg font-black text-primary">{t.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{t.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        O desconto é aplicado por subcategoria: basta atingir {minPerSubcategory} unidades da mesma
        subcategoria.
      </p>
    </section>
  );
}

/* --------------------------------- Comparativo -------------------------------- */

const COMPARISON = [
  { label: "Material", training: "Algodão resistente", pro: "Algodão premium", premium: "Algodão premium + acabamento fino" },
  { label: "Camadas", training: "Padrão", pro: "Reforçada", premium: "Reforço máximo" },
  { label: "Costuras", training: "Retas reforçadas", pro: "Duplas reforçadas", premium: "Duplas + travete" },
  { label: "Personalização", training: "Bordado simples", pro: "Bordado + patch", premium: "Bordado completo + patches" },
  { label: "Indicação", training: "Uso diário", pro: "Competição", premium: "Competição e revenda premium" },
  { label: "Prazo", training: "10 dias úteis", pro: "10 dias úteis", premium: "12 dias úteis" },
  { label: "Preço", training: "Entrada", pro: "Intermediário", premium: "Alto padrão" },
];

export function WholesaleComparison() {
  return (
    <section className="mt-14">
      <div className="eyebrow">Comparativo</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Qual linha escolher
      </h2>
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Comparação entre as linhas Training, Pro e Premium</caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-black uppercase tracking-widest">
              <th scope="col" className="p-3">Característica</th>
              <th scope="col" className="p-3">Training</th>
              <th scope="col" className="p-3">Pro</th>
              <th scope="col" className="p-3 text-primary">Premium</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <th scope="row" className="p-3 text-left font-semibold">{row.label}</th>
                <td className="p-3 text-muted-foreground">{row.training}</td>
                <td className="p-3 text-muted-foreground">{row.pro}</td>
                <td className="p-3 font-semibold">{row.premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------------------------- Qualidade --------------------------------- */

const QUALITY_STEPS = ["Bordado", "Costura", "Revisão", "Acabamento", "Embalagem"];

export function WholesaleQuality({ photos }: { photos: { src: string | null; alt: string }[] }) {
  return (
    <section className="mt-14">
      <div className="eyebrow">Fabricação própria</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Cada peça passa pelo nosso controle de qualidade
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUALITY_STEPS.map((label, i) => (
          <figure key={label} className="overflow-hidden rounded-2xl border bg-card">
            <ProductImage src={photos[i]?.src ?? null} alt={photos[i]?.alt ?? label} aspect="square" />
            <figcaption className="p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                Etapa {i + 1}
              </div>
              <div className="text-sm font-semibold">{label}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Por que a AMT ------------------------------- */

const REASONS = [
  { icon: Factory, title: "Produção própria", text: "Fabricamos do corte ao acabamento, sem intermediários." },
  { icon: ShieldCheck, title: "Controle de qualidade", text: "Revisão peça por peça antes do envio." },
  { icon: Award, title: "Materiais premium", text: "Tecidos e aviamentos selecionados para alta durabilidade." },
  { icon: Palette, title: "Personalização profissional", text: "Bordados, patches e etiquetas com a sua marca." },
  { icon: Headphones, title: "Atendimento especializado", text: "Consultoria para academias, equipes e revendedores." },
  { icon: Truck, title: "Entrega para todo Brasil", text: "Envio rastreado com prazos claros por região." },
];

export function WholesaleWhyAmt() {
  return (
    <section className="mt-14">
      <div className="eyebrow">Por que comprar da AMT</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Fábrica, qualidade e suporte no mesmo lugar
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.title} className="rounded-2xl border bg-card p-4">
            <r.icon className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="mt-2.5 text-sm font-black">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------- FAQ ------------------------------------ */

export const WHOLESALE_FAQ = (minQty: number, pct: number) => [
  {
    q: "Qual é a quantidade mínima para atacado?",
    a: `São ${minQty} unidades por subcategoria. Você pode misturar modelos e tamanhos dentro da mesma subcategoria para atingir o mínimo.`,
  },
  { q: "Qual o prazo de produção?", a: "O prazo padrão é de 10 dias úteis após a confirmação do pagamento, acrescido do prazo de transporte." },
  { q: "Como funciona a personalização?", a: "Você envia o logotipo no resumo do pedido e aplicamos na etiqueta personalizada, sem custo adicional. Bordados e patches são combinados no atendimento." },
  { q: "Quais formas de pagamento?", a: "PIX, boleto e cartão de crédito com parcelamento sem juros conforme o valor do pedido." },
  { q: "Como é calculado o frete?", a: "O frete é calculado na etapa final do pedido, com base no CEP de entrega e nas dimensões reais das peças." },
  { q: "Posso trocar produtos?", a: "Sim. Peças com defeito de fabricação são trocadas sem custo. Itens personalizados seguem a política de trocas informada no atendimento." },
  { q: "Existe garantia?", a: "Todos os produtos têm garantia contra defeitos de fabricação." },
  { q: "O desconto de atacado é cumulativo?", a: `O desconto de até ${pct}% é aplicado automaticamente aos produtos habilitados assim que a regra de quantidade é atingida.` },
];

export function WholesaleFaq({ minQty, pct }: { minQty: number; pct: number }) {
  const [open, setOpen] = useState<number | null>(0);
  const items = WHOLESALE_FAQ(minQty, pct);
  return (
    <section className="mt-14">
      <div className="eyebrow">Dúvidas frequentes</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Perguntas sobre o atacado
      </h2>
      <div className="mt-5 divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-semibold transition hover:bg-muted/50"
                >
                  {f.q}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
              </h3>
              {isOpen && <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------- CTA ------------------------------------ */

export function WholesaleCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="mt-14 overflow-hidden rounded-3xl border bg-foreground p-6 text-background sm:p-10">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_auto] lg:items-center">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            Monte seu pedido em minutos
          </h2>
          <p className="mt-2 max-w-xl text-sm text-background/80">
            Escolha os produtos, ajuste as quantidades e acompanhe o desconto sendo aplicado em tempo
            real. Precisa de um orçamento formal? Fale com o nosso time.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            Monte seu pedido <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <a
            href="https://wa.me/5551999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-background/40 px-6 py-3.5 text-sm font-black uppercase tracking-widest transition hover:border-background hover:bg-background hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Solicitar orçamento
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ Rodapé ---------------------------------- */

export function WholesaleFooterLinks() {
  return (
    <section className="mt-12 rounded-2xl border bg-card p-5">
      <h2 className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
        Informações e contato
      </h2>
      <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
        <ul className="space-y-1.5 text-muted-foreground">
          <li>Garantia contra defeitos de fabricação</li>
          <li>Trocas conforme política vigente</li>
          <li>Produção própria em 10 dias úteis</li>
        </ul>
        <ul className="space-y-1.5">
          <li>
            <a href="#faq-atacado" className="text-muted-foreground transition hover:text-primary">
              Perguntas frequentes
            </a>
          </li>
          <li>
            <a
              href="https://wa.me/5551999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
            </a>
          </li>
          <li>
            <a
              href="https://instagram.com/amtfightwear"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-primary"
            >
              <Instagram className="h-3.5 w-3.5" aria-hidden /> Instagram
            </a>
          </li>
        </ul>
        <ul className="space-y-1.5">
          <li>
            <Link to="/" className="text-muted-foreground transition hover:text-primary">
              Loja AMT Fight Wear
            </Link>
          </li>
          <li>
            <Link to="/atacado-lp" className="text-muted-foreground transition hover:text-primary">
              Programa de revenda
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
