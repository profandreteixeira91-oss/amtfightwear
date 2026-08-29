import { BeltVisual } from "./BeltVisual";

/**
 * Spec de aparência da faixa — estrutura declarativa que permite desenhar
 * qualquer combinação sem depender de heurísticas por nome.
 *
 * Um segmento é uma faixa vertical (esquerda→direita) com uma cor.
 * `flex` distribui o espaço restante; `widthPct` fixa uma largura em %.
 * Se nenhum segmento tiver `flex`, o último assume flex=1 automaticamente.
 */
export type BeltSpec = {
  /** Segmentos do corpo (esq. → dir.). Se vazio, cai para color_hex sólido. */
  segments?: Array<{ color: string; flex?: number; widthPct?: number }>;
  /** Aparador top/bottom (ex.: faixa preta com aparador branco). */
  aparador?: { color: string; sizePct?: number } | null;
  /** Faixa central horizontal (ex.: duas cores). */
  centerBand?: { color: string; heightPct?: number } | null;
  /** Ponteira à direita — segmento que carrega as listras de graduação. */
  tip?: {
    color: string;
    widthPct: number;
    /** Cor das listras verticais dentro da ponteira. */
    stripeColor?: string;
    /** Número de listras (opcional). Quando omitido, usa `degree` do call-site. */
    forcedStripes?: number;
  } | null;
  /** Divisórias verticais entre corpo e ponteira. */
  dividers?: Array<{ color: string; widthPx?: number; side: "before-tip" | "after-tip" }>;
};

export function beltSpecIsEmpty(spec: BeltSpec | null | undefined): boolean {
  if (!spec) return true;
  const hasSeg = (spec.segments?.length ?? 0) > 0;
  return !hasSeg && !spec.aparador && !spec.centerBand && !spec.tip;
}

export function BeltSpecVisual({
  spec, degree = 0, label, className = "", fallback,
}: {
  spec: BeltSpec | null | undefined;
  degree?: number;
  label?: string;
  className?: string;
  /** Renderização de fallback quando o spec é vazio. */
  fallback?: React.ReactNode;
}) {
  if (beltSpecIsEmpty(spec)) return <>{fallback ?? null}</>;

  const segs = spec!.segments ?? [];
  const tip = spec!.tip ?? null;
  const stripes = tip?.forcedStripes ?? Math.max(0, degree);
  const before = (spec!.dividers ?? []).filter((d) => d.side === "before-tip");
  const after = (spec!.dividers ?? []).filter((d) => d.side === "after-tip");

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <div
        className="relative flex w-full min-w-[220px] h-8 rounded-sm overflow-hidden border border-black/25 shadow-sm"
        aria-label={label}
      >
        {/* Aparador topo */}
        {spec!.aparador && (
          <div
            className="absolute inset-x-0 top-0 z-10"
            style={{ background: spec!.aparador.color, height: `${spec!.aparador.sizePct ?? 15}%` }}
          />
        )}
        {/* Aparador base */}
        {spec!.aparador && (
          <div
            className="absolute inset-x-0 bottom-0 z-10"
            style={{ background: spec!.aparador.color, height: `${spec!.aparador.sizePct ?? 15}%` }}
          />
        )}

        {/* Segmentos do corpo */}
        {segs.length > 0 ? (
          segs.map((s, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                background: s.color,
                ...(s.widthPct != null ? { width: `${s.widthPct}%` } : { flex: s.flex ?? 1 }),
              }}
            />
          ))
        ) : (
          <div className="h-full flex-1" style={{ background: "#F5F5F5" }} />
        )}

        {/* Divisórias antes da ponteira */}
        {before.map((d, i) => (
          <div key={`bt${i}`} className="h-full" style={{ background: d.color, width: d.widthPx ?? 8 }} />
        ))}

        {/* Ponteira com listras */}
        {tip && (
          <div
            className="relative h-full flex items-center justify-center gap-[3px] px-1.5"
            style={{ background: tip.color, width: `${tip.widthPct}%` }}
          >
            {Array.from({ length: stripes }).map((_, i) => (
              <div
                key={i}
                className="h-[80%] rounded-sm"
                style={{
                  width: 4,
                  background: tip.stripeColor ?? "#FFFFFF",
                  boxShadow: "0 0 0 0.5px rgba(0,0,0,0.35)",
                }}
              />
            ))}
          </div>
        )}

        {/* Divisórias após a ponteira */}
        {after.map((d, i) => (
          <div key={`at${i}`} className="h-full" style={{ background: d.color, width: d.widthPx ?? 8 }} />
        ))}

        {/* Faixa central */}
        {spec!.centerBand && (
          <div
            className="absolute inset-x-0 pointer-events-none"
            style={{
              background: spec!.centerBand.color,
              top: `${50 - (spec!.centerBand.heightPct ?? 25) / 2}%`,
              height: `${spec!.centerBand.heightPct ?? 25}%`,
            }}
          />
        )}
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

/**
 * Preferimos o spec quando existe; caso contrário caímos na renderização
 * automática do BeltVisual (baseada em nome/modalidade). Assim faixas
 * antigas continuam funcionando sem alteração.
 *
 * Quando a faixa tem `variants` com override específico para o grau atual
 * (kind === "degree"), o visual do grau prevalece — assim edições feitas no
 * Belt Studio (modalidades, faixas e graus) são propagadas para todo o
 * sistema: perfil do aluno, graduações, certificados e dashboard.
 */
export function BeltAuto({
  belt, degree = 0, className,
}: {
  belt?: {
    name?: string;
    modality?: string | null;
    color_hex?: string;
    stripe_hex?: string | null;
    visual?: BeltSpec | null;
    variants?: Array<{ id?: string; name?: string; degree: number; kind?: "degree" | "variant"; visual?: BeltSpec | null }> | null;
    max_degrees?: number;
  };
  degree?: number;
  className?: string;
}) {
  // Aluno matriculado em turma sem graduação registrada chega aqui com belt
  // nulo. Nunca lançar: renderiza um placeholder neutro.
  if (!belt) {
    return <div className={`h-8 w-full rounded-sm border border-dashed border-slate-300 ${className ?? ""}`} />;
  }
  const degreeOverride = (belt.variants ?? []).find(
    (v) => v && v.kind === "degree" && Number(v.degree) === Number(degree) && !beltSpecIsEmpty(v.visual),
  );
  if (degreeOverride && !beltSpecIsEmpty(degreeOverride.visual)) {
    return <BeltSpecVisual spec={degreeOverride.visual!} degree={degree} className={className} />;
  }
  if (!beltSpecIsEmpty(belt.visual)) {
    return <BeltSpecVisual spec={belt.visual!} degree={degree} className={className} />;
  }
  return (
    <BeltVisual
      colorHex={belt.color_hex ?? "#F5F5F5"}
      stripeHex={belt.stripe_hex ?? null}
      degree={degree}
      maxDegrees={belt.max_degrees ?? 4}
      name={belt.name}
      modality={belt.modality ?? undefined}
      className={className}
    />
  );
}
