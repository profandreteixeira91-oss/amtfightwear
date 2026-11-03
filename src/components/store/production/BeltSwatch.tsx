import { useId } from "react";
import { beltColorText, beltShapes, type BeltSpec } from "@/lib/store/belt";
import { cn } from "@/lib/utils";

const W = 200;
const H = 26;

/** Desenho da faixa (cor, listra, pontas e ponteira), igual ao da impressão. */
export function BeltSwatch({ spec, className, title }: { spec: BeltSpec; className?: string; title?: string }) {
  const label = title ?? beltColorText(spec);
  // useId traz ":" — fora de um id seguro dentro de url(#…).
  const clipId = `belt${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-4 w-full max-w-[180px]", className)}
      role="img"
      aria-label={`Faixa: ${label}`}
      preserveAspectRatio="none"
    >
      <title>{label}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="4" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {beltShapes(spec).map((s, i) => (
          <rect key={i} x={s.x * W} y={s.y * H} width={s.w * W} height={s.h * H} fill={s.fill} />
        ))}
        {/* Pespontos: dão leitura de faixa mesmo nas cores claras. */}
        <line x1="0" x2={W} y1={H * 0.18} y2={H * 0.18} stroke="#000" strokeOpacity="0.14" strokeDasharray="3 2" />
        <line x1="0" x2={W} y1={H * 0.82} y2={H * 0.82} stroke="#000" strokeOpacity="0.14" strokeDasharray="3 2" />
      </g>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="4" fill="none" stroke="#000" strokeOpacity="0.3" />
    </svg>
  );
}
