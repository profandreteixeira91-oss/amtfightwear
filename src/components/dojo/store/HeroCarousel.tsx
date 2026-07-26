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
  image: string;
  focus?: string;
};

// Fotos reais dos produtos publicados em amtfightwear.com.br
const SLIDES: Slide[] = [
  {
    eyebrow: "Novos modelos",
    title: "Kimonos AMT — Lanus Premium Series",
    description: "Corte competição, tecido leve e acabamento premium.",
    ctaLabel: "Ver kimonos",
    categoria: "kimonos-de-jiu-jitsu",
    image:
      "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/0942e202-4ed2-406f-a3d7-d71773d8b064/2e851916-ee1b-4a35-b246-6922e147667c.jpg",
    focus: "center",
  },
  {
    eyebrow: "Personalização premium",
    title: "Faixas de Jiu-Jitsu bordadas",
    description: "Do branco ao coral, prontas para a graduação.",
    ctaLabel: "Explorar faixas",
    categoria: "faixas-de-jiu-jitsu",
    image:
      "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/6a8dde04-897a-4bd0-88d8-6e549e028aaa/9bdb3b0b-7a5b-4cfe-a179-71e986bb1457.jpg",
    focus: "center",
  },
  {
    eyebrow: "Tradição no tatame",
    title: "Faixas de Judô — linha oficial",
    description: "Cores por graduação, tecido reforçado para o dia a dia.",
    ctaLabel: "Ver faixas de judô",
    categoria: "faixas-de-judo",
    image:
      "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/c503c54b-f770-4a9b-85f0-802b5a8e3849/3bb4938e-b34e-4b5a-887e-00496d1009a6.jpg",
    focus: "center",
  },
  {
    eyebrow: "Identidade visual",
    title: "Patches reforçados para kimono",
    description: "Sublimação em alta densidade, prontos para aplicar.",
    ctaLabel: "Ver patches",
    categoria: "patches",
    image:
      "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images/81ce0ac8-ae59-4bb6-b53b-eb64836de4ce/2f03631d-e3d9-451f-bc3f-1e79c4f83c18.png",
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
            <img
              src={s.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: s.focus ?? "center" }}
              loading={i === 0 ? "eager" : "lazy"}
            />
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
