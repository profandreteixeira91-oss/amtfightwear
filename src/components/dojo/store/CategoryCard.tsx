import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LucideIcon, Shirt, Sparkles, Shield, Award, Package, Layers } from "lucide-react";
import catFaixas from "@/assets/dojo-store/cat-faixas.jpg";
import catKimonos from "@/assets/dojo-store/cat-kimonos.jpg";
import catPatches from "@/assets/dojo-store/cat-patches.jpg";
import catRashguards from "@/assets/dojo-store/cat-rashguards.jpg";
import catCamisetas from "@/assets/dojo-store/cat-camisetas.jpg";
import catAcessorios from "@/assets/dojo-store/cat-acessorios.jpg";

const ICONS: Record<string, LucideIcon> = {
  faixas: Award,
  kimonos: Shirt,
  patches: Sparkles,
  "rash-guards": Shield,
  camisetas: Shirt,
  acessorios: Package,
  acessórios: Package,
};

const IMAGES: Record<string, string> = {
  faixas: catFaixas,
  kimonos: catKimonos,
  patches: catPatches,
  "rash-guards": catRashguards,
  rashguards: catRashguards,
  camisetas: catCamisetas,
  acessorios: catAcessorios,
  acessórios: catAcessorios,
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
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl border border-[color:var(--dojo-border)] p-5 shadow-[var(--dojo-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--dojo-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.75) 100%)",
            }}
          />
        </>
      )}

      <div className="relative text-white">
        <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      </div>
      <div className="relative text-white">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
          Categoria
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <h3 className="text-2xl font-bold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] md:text-3xl">
            {name}
          </h3>
          <ArrowUpRight
            className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </div>
        {typeof count === "number" && count > 0 && (
          <div className="mt-1 text-xs text-white/85">
            {count} produto{count !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
