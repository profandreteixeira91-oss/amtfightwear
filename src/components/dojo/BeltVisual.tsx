interface BeltVisualProps {
  colorHex: string;
  stripeHex?: string | null;
  degree?: number;
  maxDegrees?: number;
  className?: string;
  label?: string;
  /** Belt name — used to auto-detect special renderings */
  name?: string;
  /** When true, stripeHex is rendered as top/bottom trim (aparador) instead of a center band */
  trim?: boolean;
}

/**
 * Visual representation of a BJJ / martial arts belt matching the AMT belt system.
 *
 * Special high-rank belts (mandatory fixed degrees):
 * - "Vermelha e Preta" (7 graus): alternating red/black blocks + white tip with red stripes
 * - "Vermelha e Branca" (8 graus): alternating red/white blocks + white tip with red stripes
 * - "Vermelha" (9 graus): solid red + gold dividers + white tip with red stripes
 * These belts do not accept degree choice — degree is forced to the mandatory count.
 *
 * Other belts:
 * - Base color fills the belt
 * - stripe_hex renders as a middle horizontal band (default) or as top/bottom trim (aparador)
 * - Black tip on the right holds white stripes; Faixa Preta uses a red tip with white stripes.
 */
export function BeltVisual({
  colorHex,
  stripeHex,
  degree = 0,
  maxDegrees = 4,
  className = "",
  label,
  name,
  trim,
}: BeltVisualProps) {
  const n = (name ?? "").trim();
  const isBlack = /^preta$/i.test(n);
  const isRedBlack = /^vermelha e preta$/i.test(n);
  const isRedWhite = /^vermelha e branca$/i.test(n);
  const isRedSolid = /^vermelha$/i.test(n);
  const isHighRank = isRedBlack || isRedWhite || isRedSolid;
  const isTrim = trim ?? /aparador/i.test(n);

  // Special layout for the three top-tier belts
  if (isHighRank) {
    const forcedDegrees = isRedBlack ? 7 : isRedWhite ? 8 : 9;
    const blockAlt = isRedBlack ? "#111111" : "#FFFFFF"; // black or white
    const dividerColor = isRedSolid ? "#C5A657" : "#8A8A8A"; // gold for pure red, gray otherwise
    const stripeColor = "#B71C1C";

    return (
      <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
        <div
          className="relative flex w-full min-w-[220px] h-8 rounded-sm overflow-hidden border border-black/25 shadow-sm"
          aria-label={label ?? `Faixa ${n}`}
        >
          {/* Body: alternating blocks (or solid red) */}
          <div className="flex-1 flex">
            {isRedSolid ? (
              <div className="flex-1" style={{ background: "#B71C1C" }} />
            ) : (
              <>
                <div className="flex-1" style={{ background: "#B71C1C" }} />
                <div className="flex-1" style={{ background: blockAlt }} />
                <div className="flex-1" style={{ background: "#B71C1C" }} />
                <div className="flex-1" style={{ background: blockAlt }} />
              </>
            )}
          </div>
          {/* Left divider */}
          <div className="h-full w-[10px]" style={{ background: dividerColor }} />
          {/* White tip with red vertical stripes */}
          <div
            className="h-full flex items-stretch justify-center gap-[3px] px-2 bg-white"
            style={{ width: `${Math.max(38, forcedDegrees * 6 + 12)}%` }}
          >
            {Array.from({ length: forcedDegrees }).map((_, i) => (
              <div
                key={i}
                className="h-full w-[4px]"
                style={{ background: stripeColor, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.35)" }}
              />
            ))}
          </div>
          {/* Right end divider */}
          <div className="h-full w-[10px]" style={{ background: dividerColor }} />
        </div>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  // Standard belts
  const stripes = Math.max(0, Math.min(degree, maxDegrees));
  const base = (colorHex || "#F5F5F5").toLowerCase();
  const isLight = base === "#ffffff" || base === "#f5f5f5" || base === "#fdd835";
  const tipBg = isBlack ? "#B71C1C" : "#111111";
  const stripeColor = "#FFFFFF";

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <div
        className="relative w-full min-w-[140px] h-8 rounded-sm overflow-hidden border border-black/20 shadow-sm"
        style={{ background: colorHex }}
        aria-label={label ?? `Faixa ${colorHex}`}
      >
        {/* Two-tone center band (regular two-tone belts) */}
        {stripeHex && !isTrim && !isBlack && (
          <div
            className="absolute inset-x-0"
            style={{ background: stripeHex, top: "33.333%", height: "33.333%" }}
          />
        )}
        {/* Trim (aparador) on top and bottom — legacy belts */}
        {stripeHex && isTrim && (
          <>
            <div className="absolute inset-x-0 top-0" style={{ background: stripeHex, height: "18%" }} />
            <div className="absolute inset-x-0 bottom-0" style={{ background: stripeHex, height: "18%" }} />
          </>
        )}
        {/* Tip on the right */}
        <div
          className="absolute right-0 top-0 h-full flex items-center justify-center gap-[3px] px-1.5"
          style={{
            width: "38%",
            background: tipBg,
            borderLeft: isLight ? "1px solid rgba(0,0,0,0.35)" : "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {Array.from({ length: stripes }).map((_, i) => (
            <div
              key={i}
              className="h-full w-[3px] rounded-sm"
              style={{ background: stripeColor, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.4)" }}
            />
          ))}
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
