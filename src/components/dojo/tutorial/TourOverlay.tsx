import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Check, X, Minus, Sparkles, MapPin, ArrowDown, ArrowUp, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./TutorialProvider";
import { describeTarget, findRouteLocation } from "@/lib/dojo/tutorial/locations";

type Rect = { top: number; left: number; width: number; height: number };
type Spot = { rect: Rect; fallback: boolean };

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

/** Item do menu lateral correspondente à rota do passo (usado como plano B). */
function resolveMenuLink(route?: string | null): HTMLElement | null {
  if (!route || typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLElement>(`aside a[href="${route}"]`) ??
    document.querySelector<HTMLElement>(`nav a[href="${route}"]`) ??
    document.querySelector<HTMLElement>(`a[href="${route}"]`)
  );
}

function toRect(el: HTMLElement): Rect | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function TourOverlay() {
  const { track, stepIndex, next, prev, stop, minimized, setMinimized } = useTutorial();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const step = track?.steps[stepIndex];

  /** Rota efetiva do passo (herda do passo anterior que definiu rota). */
  const stepRoute = useMemo(() => {
    if (!track) return null;
    for (let i = stepIndex; i >= 0; i--) {
      const r = track.steps[i]?.route;
      if (r) return r;
    }
    return track.route;
  }, [stepIndex, track]);

  const location = useMemo(() => findRouteLocation(stepRoute), [stepRoute]);
  const targetDesc = describeTarget(step?.target);

  const measure = useCallback(() => {
    const el = resolveTarget(step?.target);
    if (el) {
      const rect = toRect(el);
      if (rect) {
        setSpot({ rect, fallback: false });
        return;
      }
    }
    // Plano B: destaca o item de menu da página deste passo.
    const menu = resolveMenuLink(stepRoute);
    const menuRect = menu ? toRect(menu) : null;
    setSpot(menuRect ? { rect: menuRect, fallback: true } : null);
  }, [step?.target, stepRoute]);

  useLayoutEffect(() => {
    if (!track) return;
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(() => {
      const el = resolveTarget(step?.target) ?? resolveMenuLink(stepRoute);
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
  }, [measure, step?.target, stepRoute, track]);

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
  const rect = spot?.rect ?? null;

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
  const useBelow = rect ? window.innerHeight - (rect.top + rect.height) > 260 : false;
  const cardStyle: React.CSSProperties = rect
    ? (() => {
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 372));
        return useBelow
          ? { top: rect.top + rect.height + pad + 34, left }
          : { bottom: window.innerHeight - rect.top + pad + 34, left };
      })()
    : { bottom: 24, right: 24 };

  // Etiqueta "Aqui" com seta, colada no elemento destacado.
  const markerStyle: React.CSSProperties | null = rect
    ? (() => {
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 150));
        return useBelow
          ? { top: rect.top + rect.height + pad + 4, left }
          : { top: Math.max(4, rect.top - pad - 30), left };
      })()
    : null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1100]">
      {/* Spotlight */}
      {rect ? (
        <div
          className="pointer-events-none absolute animate-pulse rounded-xl ring-2 ring-primary transition-all duration-200"
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

      {/* Marcador com seta apontando o elemento */}
      {markerStyle && (
        <div
          className="pointer-events-none absolute flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-lg"
          style={markerStyle}
        >
          {useBelow ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          {spot?.fallback ? "Abra por aqui" : "É aqui"}
        </div>
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

        {/* Onde encontrar este passo */}
        {(location || targetDesc) && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-start gap-1.5 text-[11px] leading-snug">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0 break-words">
                <span className="font-semibold text-primary">Onde encontrar: </span>
                {location ? (
                  <span className="text-foreground">
                    Menu lateral › {location.group} › {location.label}
                  </span>
                ) : (
                  <span className="text-foreground">nesta tela</span>
                )}
                {targetDesc && (
                  <span className="text-muted-foreground">
                    {" "}
                    · procure o {targetDesc}
                    {spot && !spot.fallback ? " destacado em vermelho" : ""}
                  </span>
                )}
              </div>
            </div>
            {spot?.fallback && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <PanelLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">
                  O elemento não está visível agora — abra a página destacada no menu lateral para continuar.
                </span>
              </div>
            )}
            {!spot && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <PanelLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">
                  Em telas menores, abra o menu no ícone ☰ do topo para navegar até esta página.
                </span>
              </div>
            )}
          </div>
        )}

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
