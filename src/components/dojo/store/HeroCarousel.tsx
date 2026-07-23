import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  categoria: string;
  gradient: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Personalização premium",
    title: "Faixas com bordado exclusivo",
    description: "Do branco ao coral, entregues prontas para a graduação.",
    ctaLabel: "Explorar faixas",
    categoria: "faixas",
    gradient:
      "linear-gradient(115deg, oklch(0.16 0 0) 0%, oklch(0.22 0.02 20) 55%, oklch(0.42 0.18 25) 100%)",
  },
  {
    eyebrow: "Novos modelos",
    title: "Kimonos AMT — corte competição",
    description: "Tecido leve, reforço nas costuras e ajuste anatômico.",
    ctaLabel: "Ver kimonos",
    categoria: "kimonos",
    gradient:
      "linear-gradient(115deg, oklch(0.98 0 0) 0%, oklch(0.94 0.01 240) 50%, oklch(0.85 0.02 240) 100%)",
  },
  {
    eyebrow: "Identidade visual",
    title: "Patches oficiais da sua academia",
    description: "Bordados em alta densidade, prontos para aplicar.",
    ctaLabel: "Ver patches",
    categoria: "patches",
    gradient:
      "linear-gradient(115deg, oklch(0.22 0 0) 0%, oklch(0.35 0.02 20) 50%, oklch(0.72 0.16 25) 100%)",
  },
];

export function HeroCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[color:var(--dojo-border)] shadow-[var(--dojo-shadow-md)]"
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[21/9] min-h-[240px] md:aspect-[21/8]">
        {SLIDES.map((s, i) => {
          const isLight = i === 1;
          return (
            <div
              key={s.categoria}
              aria-hidden={i !== idx}
              className={cn(
                "absolute inset-0 flex flex-col justify-end p-6 transition-opacity duration-700 md:p-12",
                i === idx ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ background: s.gradient }}
            >
              <div
                className={cn(
                  "max-w-xl space-y-3",
                  isLight ? "text-foreground" : "text-white",
                )}
              >
                <div
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur",
                    isLight ? "bg-black/5 text-foreground" : "bg-white/15 text-white",
                  )}
                >
                  {s.eyebrow}
                </div>
                <h2
                  className={cn(
                    "text-3xl font-bold leading-tight tracking-tight md:text-5xl",
                  )}
                >
                  {s.title}
                </h2>
                <p
                  className={cn(
                    "max-w-md text-sm md:text-base",
                    isLight ? "text-muted-foreground" : "text-white/80",
                  )}
                >
                  {s.description}
                </p>
                <Link
                  to="/dojo/app/store/c/$categoria"
                  params={{ categoria: s.categoria }}
                  className={cn(
                    "mt-2 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition",
                    isLight
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-white text-foreground hover:bg-white/90",
                  )}
                >
                  {s.ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 right-4 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === idx ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
            )}
          />
        ))}
      </div>
    </section>
  );
}
