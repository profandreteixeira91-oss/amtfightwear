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
  /** Modality slug (jiu-jitsu, judo, karate, taekwondo, etc). Controls rendering style. */
  modality?: string | null;
}

/**
 * Visual representation of a martial arts belt.
 *
 * Jiu-Jitsu (default) — belt with black tip on the right holding white stripes for degrees.
 * Preta/Vermelha families remain BJJ-only (matched by name).
 *
 * Other modalities (Judô, Karatê, Taekwondo, etc.) — no black tip. The belt is a solid
 * color band. Names containing "ponta {cor}" (e.g. "Branca ponta cinza") render as
 * three horizontal segments: tip-color / main-color / tip-color, matching the Judô
 * infant/youth belt system (kohaku / mon).
 * Degree marks (when applicable) render as thin vertical stripes at the right end,
 * directly over the belt color — no black rectangle.
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
  modality,
}: BeltVisualProps) {
  const n = (name ?? "").trim();
  const mod = (modality ?? "").toString().toLowerCase().trim();
  const isJiuJitsu = mod === "" || mod === "jiu-jitsu" || mod === "jiujitsu" || mod === "bjj";

  // Preta family variants — BJJ only.
  const isPretaPlain = /^preta$/i.test(n);
  const isPretaAparador = /^preta\s+com\s+aparador/i.test(n);
  const pretaGrauMatch = n.match(/^preta\s+(\d)\s*grau/i);
  const pretaGrau = pretaGrauMatch ? parseInt(pretaGrauMatch[1], 10) : 0;
  const isPretaGrau = pretaGrau > 0;
  const isPretaFamily = isJiuJitsu && (isPretaPlain || isPretaAparador || isPretaGrau);

  const isRedBlack = isJiuJitsu && /^vermelha e preta$/i.test(n);
  const isRedWhite = isJiuJitsu && /^vermelha e branca$/i.test(n);
  const isRedSolid = isJiuJitsu && /^vermelha$/i.test(n);
  const isHighRank = isRedBlack || isRedWhite || isRedSolid;
  const isTrim = (trim ?? /aparador/i.test(n)) && !isPretaFamily;

  // Preta family layout — black body, red tip, optional white aparador borders, N white stripes.
  if (isPretaFamily) {
    const showAparador = isPretaAparador || isPretaGrau;
    const stripes = pretaGrau;
    return (
      <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
        <div
          className="relative flex w-full min-w-[220px] h-8 rounded-sm overflow-hidden border border-black/25 shadow-sm"
          aria-label={label ?? `Faixa ${n}`}
        >
          <div className="h-full" style={{ flex: "0 0 55%", background: "#111111" }} />
          {showAparador && <div className="h-full" style={{ width: 6, background: "#FFFFFF" }} />}
          <div
            className="h-full flex items-stretch justify-end gap-[3px] pr-1.5 pl-2"
            style={{ flex: "1 1 auto", background: "#D32F2F" }}
          >
            {Array.from({ length: stripes }).map((_, i) => (
              <div
                key={i}
                className="h-full"
                style={{ width: 4, background: "#FFFFFF", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.35)" }}
              />
            ))}
          </div>
          {showAparador && <div className="h-full" style={{ width: 6, background: "#FFFFFF" }} />}
          <div className="h-full" style={{ width: 10, background: "#111111" }} />
        </div>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  // Special layout for the three top-tier BJJ belts
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

  const stripes = Math.max(0, Math.min(degree, maxDegrees));
  const base = (colorHex || "#F5F5F5").toLowerCase();
  const isLight = base === "#ffffff" || base === "#f5f5f5" || base === "#fdd835";

  // === Non-BJJ modalities: Judô / Karatê / Taekwondo / etc. ===
  // Render without the black tip rectangle.
  if (!isJiuJitsu) {
    // Detect "ponta {cor}" pattern in the belt name for Judô-style kohaku/mon belts.
    // Examples: "Branca ponta cinza", "Cinza ponta azul", "Azul ponta amarela".
    const pontaMatch = n.match(/ponta[s]?\s+([a-zç\s]+?)(?:\s+\d.*)?$/i);
    const pontaName = pontaMatch ? pontaMatch[1].trim().toLowerCase() : "";
    // Fall back to stripe_hex when the name does not encode a "ponta" color.
    const pontaColor = pontaName ? colorNameToHex(pontaName) : stripeHex || null;
    const hasPonta = !!pontaMatch && !!pontaColor;

    return (
      <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
        <div
          className="relative flex w-full min-w-[220px] h-8 rounded-sm overflow-hidden border border-black/20 shadow-sm"
          aria-label={label ?? `Faixa ${n || colorHex}`}
        >
          {hasPonta ? (
            <>
              {/* Left tip */}
              <div className="h-full" style={{ flex: "0 0 22%", background: pontaColor! }} />
              {/* Middle (main color) */}
              <div className="h-full flex-1 relative" style={{ background: colorHex }}>
                {/* Optional center trim/band if stripe_hex is set and unrelated to ponta */}
                {stripeHex && !isTrim && pontaName === "" && (
                  <div
                    className="absolute inset-x-0"
                    style={{ background: stripeHex, top: "33.333%", height: "33.333%" }}
                  />
                )}
              </div>
              {/* Right tip */}
              <div className="h-full" style={{ flex: "0 0 22%", background: pontaColor! }} />
            </>
          ) : (
            <div className="relative w-full h-full" style={{ background: colorHex }}>
              {/* Center band */}
              {stripeHex && !isTrim && (
                <div
                  className="absolute inset-x-0"
                  style={{ background: stripeHex, top: "33.333%", height: "33.333%" }}
                />
              )}
              {/* Aparador (top/bottom trim) */}
              {stripeHex && isTrim && (
                <>
                  <div className="absolute inset-x-0 top-0" style={{ background: stripeHex, height: "18%" }} />
                  <div className="absolute inset-x-0 bottom-0" style={{ background: stripeHex, height: "18%" }} />
                </>
              )}
              {/* Degree marks — thin dark stripes near the right end, no black rectangle */}
              {stripes > 0 && (
                <div className="absolute right-2 top-0 h-full flex items-center gap-[3px]">
                  {Array.from({ length: stripes }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[70%] w-[3px] rounded-sm"
                      style={{
                        background: isLight ? "#111111" : "#FFFFFF",
                        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.35)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  // === Jiu-Jitsu standard belts (with black tip) ===
  const tipBg = "#111111";
  const stripeColor = "#FFFFFF";

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <div
        className="relative w-full min-w-[140px] h-8 rounded-sm overflow-hidden border border-black/20 shadow-sm"
        style={{ background: colorHex }}
        aria-label={label ?? `Faixa ${colorHex}`}
      >
        {/* Two-tone center band (regular two-tone belts) */}
        {stripeHex && !isTrim && (
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
        {/* Black tip on the right */}
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

/** Map common Portuguese color names to hex — used to render "ponta {cor}" tips. */
function colorNameToHex(raw: string): string | null {
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const map: Record<string, string> = {
    branca: "#FFFFFF",
    branco: "#FFFFFF",
    cinza: "#9CA3AF",
    "cinza claro": "#D1D5DB",
    "cinza escuro": "#4B5563",
    preta: "#111111",
    preto: "#111111",
    amarela: "#FDD835",
    amarelo: "#FDD835",
    laranja: "#FB923C",
    verde: "#16A34A",
    azul: "#2563EB",
    "azul claro": "#60A5FA",
    "azul escuro": "#1E3A8A",
    roxa: "#7C3AED",
    roxo: "#7C3AED",
    marrom: "#78350F",
    vermelha: "#B71C1C",
    vermelho: "#B71C1C",
    rosa: "#EC4899",
    dourada: "#C5A657",
    dourado: "#C5A657",
    prata: "#C0C0C0",
  };
  return map[key] ?? null;
}
