import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import heroFaixas from "@/assets/dojo-store/hero-faixas.jpg";
import heroKimonos from "@/assets/dojo-store/hero-kimonos.jpg";
import heroPatches from "@/assets/dojo-store/hero-patches.jpg";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  categoria: string;
  image: string;
  focus?: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Personalização premium",
    title: "Faixas com bordado exclusivo",
    description: "Do branco ao coral, entregues prontas para a graduação.",
    ctaLabel: "Explorar faixas",
    categoria: "faixas",
    image: heroFaixas,
    focus: "center",
  },
  {
    eyebrow: "Novos modelos",
    title: "Kimonos AMT — corte competição",
    description: "Tecido leve, reforço nas costuras e ajuste anatômico.",
    ctaLabel: "Ver kimonos",
    categoria: "kimonos",
    image: heroKimonos,
    focus: "center",
  },
  {
    eyebrow: "Identidade visual",
    title: "Patches oficiais da sua academia",
    description: "Bordados em alta densidade, prontos para aplicar.",
    ctaLabel: "Ver patches",
    categoria: "patches",
    image: heroPatches,
    focus: "center",
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
        {SLIDES.map((s, i) => (
          <div
            key={s.categoria}
            aria-hidden={i !== idx}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === idx ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Foto real do produto */}
            <img
              src={s.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: s.focus ?? "center" }}
              loading={i === 0 ? "eager" : "lazy"}
            />
            {/* Overlay para legibilidade — sempre escurece o fundo à esquerda para o texto branco */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.05) 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)",
              }}
            />

            <div className="relative flex h-full flex-col justify-end p-6 md:p-12">
              <div className="max-w-xl space-y-3 text-white">
                <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                  {s.eyebrow}
                </div>
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] md:text-5xl">
                  {s.title}
                </h2>
                <p className="max-w-md text-sm text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] md:text-base">
                  {s.description}
                </p>
                <Link
                  to="/dojo/app/store/c/$categoria"
                  params={{ categoria: s.categoria }}
                  className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-foreground transition hover:bg-white/90"
                >
                  {s.ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
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
