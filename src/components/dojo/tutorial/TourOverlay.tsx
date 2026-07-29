import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Check, X, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./TutorialProvider";

type Rect = { top: number; left: number; width: number; height: number };

/** Resolve o alvo do passo: seletor CSS ou `text:Frase`. */
function resolveTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === "undefined") return null;
  if (target.startsWith("text:")) {
    const needle = target.slice(5).trim().toLowerCase();
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("button, a, [role='tab'], [role='button']"),
    );
    const found = candidates.find((el) => {
      if (!el.offsetParent && el.offsetHeight === 0) return false;
      return (el.textContent ?? "").trim().toLowerCase().includes(needle);
    });
    return found ?? null;
  }
  return document.querySelector<HTMLElement>(target);
}

export function TourOverlay() {
  const { track, stepIndex, next, prev, stop, minimized, setMinimized } = useTutorial();
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const step = track?.steps[stepIndex];

  const measure = useCallback(() => {
    const el = resolveTarget(step?.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.target]);

  useLayoutEffect(() => {
    if (!track) return;
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(() => {
      const el = resolveTarget(step?.target);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(measure, 400);
    }, 300);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step?.target, track]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, stop]);

  if (!mounted || !track || !step) return null;

  const total = track.steps.length;
  const isLast = stepIndex === total - 1;
  const pad = 8;

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[1200] flex items-center gap-2 rounded-full border border-primary/40 bg-background/95 px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Tutorial · {stepIndex + 1}/{total}
      </button>,
      document.body,
    );
  }

  // Posição do card: abaixo do alvo quando couber, senão acima; sem alvo → rodapé.
  const cardStyle: React.CSSProperties = rect
    ? (() => {
        const below = rect.top + rect.height + pad + 12;
        const spaceBelow = window.innerHeight - (rect.top + rect.height);
        const useBelow = spaceBelow > 260;
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 372));
        return useBelow
          ? { top: below, left }
          : { bottom: window.innerHeight - rect.top + pad + 12, left };
      })()
    : { bottom: 24, right: 24 };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1100]">
      {/* Spotlight */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(2,2,4,0.62)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-background/60" />
      )}

      {/* Card de instrução */}
      <div
        className="pointer-events-auto absolute w-[min(360px,calc(100vw-24px))] rounded-2xl border border-primary/30 bg-background/98 p-4 shadow-2xl backdrop-blur"
        style={cardStyle}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary">
              {track.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Passo {stepIndex + 1} de {total}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(true)} title="Minimizar">
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stop} title="Sair do tutorial">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm font-medium leading-snug">{step.text}</p>
        {step.hint && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{step.hint}</p>}

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={prev} disabled={stepIndex === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button size="sm" onClick={next} className="gap-1">
            {isLast ? (
              <>
                Concluir <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Próximo <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
