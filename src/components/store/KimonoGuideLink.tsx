import { Link } from "@tanstack/react-router";
import { ArrowRight, Ruler } from "lucide-react";

/**
 * Detecta se um produto/categoria pertence ao universo "kimono / gi",
 * onde o Guia do Kimono é relevante para o cliente.
 */
const KIMONO_RE =
  /(kimono|kimonos|\bgi\b|jiu[\s-]?jitsu|jiujitsu|bjj|jud[oô]|karat[eê]|dobok|taekwondo)/i;

export function isKimonoContext(...values: (string | null | undefined)[]) {
  return values.some((v) => (v ? KIMONO_RE.test(v) : false));
}

/** Link discreto para o guia — usado ao lado do seletor de tamanhos. */
export function KimonoSizeGuideLink({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/loja/guia-kimono"
      hash="tamanhos"
      className={`inline-flex items-center gap-1 font-medium normal-case tracking-normal text-primary underline-offset-4 hover:underline ${className}`}
    >
      <Ruler className="h-3.5 w-3.5" aria-hidden />
      Guia de medidas
    </Link>
  );
}

/**
 * Faixa de destaque para o Guia do Kimono.
 * variant "banner" = largura total (páginas de categoria / carrinho)
 * variant "card"   = bloco compacto (buy box da página de produto)
 */
export function KimonoGuideCallout({
  variant = "banner",
  className = "",
}: {
  variant?: "banner" | "card";
  className?: string;
}) {
  if (variant === "card") {
    return (
      <Link
        to="/loja/guia-kimono"
        hash="tamanhos"
        className={`group flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 transition hover:border-primary/50 hover:bg-primary/10 ${className}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Ruler className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Na dúvida do tamanho?</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            Tabela A0–A5, infantil e tramas explicadas no Guia do Kimono.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    );
  }

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Ruler className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Antes de comprar
          </div>
          <h2 className="mt-1 font-display text-lg font-bold leading-tight tracking-tight text-foreground">
            Guia do kimono: escolha o tamanho certo de primeira
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Tabela oficial A0 a A5, medidas infantis, diferença entre as tramas (pérola, trançada, gold) e
            cuidados para o gi não encolher.
          </p>
        </div>
      </div>
      <Link
        to="/loja/guia-kimono"
        className="btn-ruby inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest"
      >
        Ver o guia <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
