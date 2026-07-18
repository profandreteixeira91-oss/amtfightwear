interface BeltVisualProps {
  colorHex: string;
  stripeHex?: string | null;
  degree?: number;
  maxDegrees?: number;
  className?: string;
  label?: string;
}

/**
 * Visual representation of a BJJ / martial arts belt.
 * - Base color fills the belt.
 * - Optional secondary color (stripe_hex) fills the lower third for two-tone belts
 *   (ex.: Cinza com Preto, Amarela com Branco).
 * - A black tip on the right holds `degree` white stripes (or black stripes if the tip is white).
 */
export function BeltVisual({ colorHex, stripeHex, degree = 0, maxDegrees = 4, className = "", label }: BeltVisualProps) {
  const tipIsDark = true; // always render a black tip section per BJJ convention
  const stripeColor = colorHex.toLowerCase() === "#111111" || colorHex.toLowerCase() === "#000000" ? "#FFFFFF" : "#FFFFFF";
  const stripes = Math.max(0, Math.min(degree, maxDegrees));

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <div
        className="relative w-full min-w-[140px] h-8 rounded-sm overflow-hidden border border-black/20 shadow-sm"
        style={{ background: colorHex }}
        aria-label={label ?? `Faixa ${colorHex}`}
      >
        {/* Two-tone lower half */}
        {stripeHex && (
          <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: stripeHex }} />
        )}
        {/* Black tip on the right */}
        <div
          className="absolute right-0 top-0 h-full flex items-center justify-center gap-1 px-2"
          style={{ width: "38%", background: tipIsDark ? "#111111" : "#FFFFFF", borderLeft: "1px solid rgba(0,0,0,0.35)" }}
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
