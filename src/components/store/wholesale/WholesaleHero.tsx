import { Check, ArrowRight, Layers } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";

const HIGHLIGHTS = [
  "Produção própria",
  "Personalização profissional",
  "Desconto por quantidade",
  "Atendimento especializado",
  "Entrega para todo Brasil",
];

type Props = {
  discountPercent: number;
  minPerSubcategory: number;
  conditions?: string;
  /** Fotos reais dos produtos do catálogo (nunca ilustrações). */
  photos: { src: string | null; alt: string }[];
  onStart: () => void;
  onCatalog: () => void;
};

export function WholesaleHero({
  discountPercent,
  minPerSubcategory,
  conditions,
  photos,
  onStart,
  onCatalog,
}: Props) {
  return (
    <section className="border-b bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
            <Layers className="h-3.5 w-3.5" aria-hidden /> Atacado B2B
          </div>
          <h1 className="mt-4 font-display text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Compre em atacado diretamente da fábrica.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-background/80 sm:text-base">
            Personalize faixas, kimonos, patches e outros produtos com preços exclusivos para
            academias, equipes e revendedores.
          </p>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-background/90">
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
            >
              Começar pedido <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onCatalog}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-background/40 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-background transition hover:border-background hover:bg-background hover:text-foreground"
            >
              Ver catálogo
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-widest text-background/70">
            <span className="rounded-full border border-background/20 px-3 py-1">
              Até {discountPercent}% OFF
            </span>
            <span className="rounded-full border border-background/20 px-3 py-1">
              Mín. {minPerSubcategory} un. por subcategoria
            </span>
            <span className="rounded-full border border-background/20 px-3 py-1">
              Etiqueta personalizada grátis
            </span>
          </div>

          {conditions && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-xs text-background/60">{conditions}</p>
          )}
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {photos.slice(0, 4).map((ph, i) => (
              <div
                key={`${ph.src ?? "x"}-${i}`}
                className={`overflow-hidden rounded-2xl border border-background/15 bg-background/5 ${
                  i === 0 ? "col-span-2" : ""
                }`}
              >
                <ProductImage src={ph.src} alt={ph.alt} aspect={i === 0 ? "video" : "square"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
