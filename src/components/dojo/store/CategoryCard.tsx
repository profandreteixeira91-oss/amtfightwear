import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LucideIcon, Shirt, Sparkles, Shield, Award, Package, Layers } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  faixas: Award,
  kimonos: Shirt,
  patches: Sparkles,
  "rash-guards": Shield,
  camisetas: Shirt,
  acessorios: Package,
  acessórios: Package,
};

const GRADIENTS: Record<string, string> = {
  faixas: "linear-gradient(135deg, oklch(0.18 0 0), oklch(0.35 0.14 25))",
  kimonos: "linear-gradient(135deg, oklch(0.94 0 0), oklch(0.86 0.01 240))",
  patches: "linear-gradient(135deg, oklch(0.22 0.02 25), oklch(0.6 0.18 25))",
  "rash-guards": "linear-gradient(135deg, oklch(0.24 0.02 250), oklch(0.42 0.1 250))",
  camisetas: "linear-gradient(135deg, oklch(0.92 0 0), oklch(0.78 0.02 200))",
  acessorios: "linear-gradient(135deg, oklch(0.3 0 0), oklch(0.55 0.04 60))",
};

const LIGHT_KEYS = new Set(["kimonos", "camisetas"]);

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
  const gradient = GRADIENTS[key] ?? "linear-gradient(135deg, oklch(0.22 0 0), oklch(0.5 0.04 25))";
  const isLight = LIGHT_KEYS.has(key);

  return (
    <Link
      to="/dojo/app/store/c/$categoria"
      params={{ categoria: slug }}
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl border border-[color:var(--dojo-border)] p-5 shadow-[var(--dojo-shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--dojo-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{ background: gradient }}
      aria-label={`Ver produtos da categoria ${name}`}
    >
      <div className={isLight ? "text-foreground" : "text-white"}>
        <div
          className={
            "inline-grid h-12 w-12 place-items-center rounded-2xl backdrop-blur transition-transform duration-300 group-hover:scale-105 " +
            (isLight ? "bg-black/5" : "bg-white/15")
          }
        >
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      </div>
      <div className={isLight ? "text-foreground" : "text-white"}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
          Categoria
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h3>
          <ArrowUpRight
            className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </div>
        {typeof count === "number" && count > 0 && (
          <div className="mt-1 text-xs opacity-80">
            {count} produto{count !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
