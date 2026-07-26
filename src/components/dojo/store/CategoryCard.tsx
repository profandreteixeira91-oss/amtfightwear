import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LucideIcon, Shirt, Sparkles, Award, Layers } from "lucide-react";

// Fotos reais dos produtos publicados em amtfightwear.com.br
const SB =
  "https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/product-images";

const ICONS: Record<string, LucideIcon> = {
  "faixas-de-jiu-jitsu": Award,
  "faixas-de-judo": Award,
  "kimonos-de-jiu-jitsu": Shirt,
  patches: Sparkles,
  // aliases curtos
  faixas: Award,
  kimonos: Shirt,
};

const IMAGES: Record<string, string> = {
  "faixas-de-jiu-jitsu": `${SB}/2a3cafcb-ce4e-4f35-9448-660aee6352a5/e26d3b68-35d3-4b0b-94e2-06416d6ef387.jpg`,
  "faixas-de-judo": `${SB}/6986425a-ad49-4a23-8aed-8332d9215402/a22e459c-4aa1-495b-afc6-3d78b26f958c.jpg`,
  "kimonos-de-jiu-jitsu": `${SB}/eed4853a-6aea-4e0e-957b-552ba5c8d0e5/3080bad7-e6ed-4655-944d-451c748b5c9a.jpg`,
  patches: `${SB}/23801fbf-5a82-41c9-9b96-fbf1196295a5/0bc8191b-4444-45d9-b666-417260bae53e.jpg`,
};

const FALLBACK_GRADIENT =
  "linear-gradient(135deg, oklch(0.22 0 0), oklch(0.5 0.04 25))";

export function CategoryCard({
  slug,
  name,
  count,
}: {
  slug: string;
  name: string;
  count?: number;
}) {
  const key = slug.toLowerCase();
  const Icon = ICONS[key] ?? Layers;
  const image = IMAGES[key];

  return (
    <Link
      to="/dojo/app/store/c/$categoria"
      params={{ categoria: slug }}
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] p-3.5 shadow-[var(--dojo-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--dojo-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:rounded-3xl sm:p-5"
      style={image ? undefined : { background: FALLBACK_GRADIENT }}
      aria-label={`Ver produtos da categoria ${name}`}
    >
      {image && (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay escuro garante texto branco legível independente da foto */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.78) 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10"
          />
        </>
      )}

      <div className="relative text-white">
        <div className="inline-grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12 sm:rounded-2xl">
          <Icon className="h-4 w-4 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </div>
      </div>
      <div className="relative text-white">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:text-[10px]">
          Categoria
        </div>
        <div className="mt-0.5 flex items-end justify-between gap-2 sm:mt-1">
          <h3 className="min-w-0 truncate text-base font-bold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:whitespace-normal sm:text-2xl md:text-3xl">
            {name}
          </h3>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:h-6 sm:w-6"
            strokeWidth={1.75}
          />
        </div>
        {typeof count === "number" && count > 0 && (
          <div className="mt-0.5 text-[10px] text-white/85 sm:mt-1 sm:text-xs">
            {count} produto{count !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
