interface BeltVisualProps {
  colorHex: string;
  stripeHex?: string | null;
  degree?: number;
  maxDegrees?: number;
  className?: string;
  label?: string;
  /** Belt name — used to auto-detect "aparador" (trim) rendering */
  name?: string;
  /** When true, stripeHex is rendered as top/bottom trim (aparador) instead of a center band */
  trim?: boolean;
}

/**
 * Visual representation of a BJJ / martial arts belt matching the AMT belt system reference.
 * - Base color fills the belt.
 * - stripe_hex renders as a middle horizontal band (default) for two-tone belts
 *   (ex.: Cinza com Branco, Amarela com Preto) — matches the reference image.
 * - When trim=true or the belt name contains "aparador", stripe_hex renders as top/bottom edges.
 * - A black tip on the right holds `degree` white stripes.
 */
export function BeltVisual({
  colorHex,
  stripeHex,
  degree = 0,
  maxDegrees = 4,
  className = "",
  label,
  trim = false,
}: BeltVisualProps) {
  const stripes = Math.max(0, Math.min(degree, maxDegrees));
  const base = (colorHex || "#F5F5F5").toLowerCase();
  const isLight = base === "#ffffff" || base === "#f5f5f5" || base === "#fdd835";
  // Red belts (9º) use a black tip; solid red is treated normally.
  const tipBg = "#111111";
  const stripeColor = "#FFFFFF";

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <div
        className="relative w-full min-w-[140px] h-8 rounded-sm overflow-hidden border border-black/20 shadow-sm"
        style={{ background: colorHex }}
        aria-label={label ?? `Faixa ${colorHex}`}
      >
        {/* Two-tone rendering */}
        {stripeHex && !trim && (
          <div
            className="absolute inset-x-0"
            style={{ background: stripeHex, top: "33.333%", height: "33.333%" }}
          />
        )}
        {stripeHex && trim && (
          <>
            <div className="absolute inset-x-0 top-0" style={{ background: stripeHex, height: "18%" }} />
            <div className="absolute inset-x-0 bottom-0" style={{ background: stripeHex, height: "18%" }} />
          </>
        )}
        {/* Black tip on the right */}
        <div
          className="absolute right-0 top-0 h-full flex items-center justify-center gap-1 px-2"
          style={{
            width: "38%",
            background: tipBg,
            borderLeft: isLight ? "1px solid rgba(0,0,0,0.35)" : "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {Array.from({ length: stripes }).map((_, i) => (
            <div
              key={i}
              className="h-5 w-1 rounded-sm"
              style={{ background: stripeColor, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.4)" }}
            />
          ))}
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
