import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Sparkles,
  MapPin,
  ArrowDown,
  ArrowUp,
  PanelLeft,
  MousePointerClick,
  Target,
  Lightbulb,
  Loader2,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./TutorialProvider";
import { describeTarget, findRouteLocation } from "@/lib/dojo/tutorial/locations";
import { remainingMinutes, type TutorialAction, type TutorialStep } from "@/lib/dojo/tutorial/tracks";

type Rect = { top: number; left: number; width: number; height: number };
type Spot = { rect: Rect; fallback: boolean };

const ACTION_LABEL: Record<TutorialAction, string> = {
  none: "",
  click: "Aguardando você clicar no elemento destacado",
  input: "Aguardando o preenchimento do campo",
  select: "Aguardando você escolher uma opção",
  navigate: "Aguardando a abertura da página",
  submit: "Aguardando o envio do formulário",
  upload: "Aguardando o envio do arquivo",
  confirm: "Aguardando a confirmação",
  create: "Aguardando o salvamento do registro",
  edit: "Aguardando a edição",
  delete: "Aguardando a exclusão",
  export: "Aguardando a exportação",
  print: "Aguardando a impressão",
};

/** Diálogo/modal aberto no momento (o tutorial deve seguir dentro dele). */
function openDialog(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>("[role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']"),
  );
  return dialogs[dialogs.length - 1] ?? null;
}

/** Resolve o alvo do passo: seletor CSS ou `text:Frase`. */
function resolveTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === "undefined") return null;
  // Quando há uma janela aberta, procuramos primeiro dentro dela.
  const scopes: (HTMLElement | Document)[] = [];
  const dialog = openDialog();
  if (dialog) scopes.push(dialog);
  scopes.push(document);

  for (const scope of scopes) {
    if (target.startsWith("text:")) {
      const needle = target.slice(5).trim().toLowerCase();
      const candidates = Array.from(
        scope.querySelectorAll<HTMLElement>("button, a, [role='tab'], [role='button'], [role='switch'], [role='combobox']"),
      );
      const found = candidates.find((el) => {
        if (!el.offsetParent && el.offsetHeight === 0) return false;
        return (el.textContent ?? "").trim().toLowerCase().includes(needle);
      });
      if (found) return found;
      continue;
    }
    const all = Array.from(scope.querySelectorAll<HTMLElement>(target));
    const visible = all.find((el) => el.offsetHeight > 0 || el.offsetParent) ?? all[0];
    if (visible) return visible;
  }
  return null;
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
  const {
    track,
    stepIndex,
    next,
    prev,
    stop,
    finish,
    goTo,
    minimized,
    setMinimized,
    actionDone,
    markActionDone,
    demoMode,
  } = useTutorial();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [spot, setSpot] = useState<Spot | null>(null);
  const [mounted, setMounted] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const step: TutorialStep | undefined = track?.steps[stepIndex];
  const action: TutorialAction = step?.action ?? "none";
  const waiting = action !== "none" && !actionDone && !targetMissing && !demoMode;

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
    targetRef.current = el;
    if (el) {
      const rect = toRect(el);
      if (rect) {
        setSpot({ rect, fallback: false });
        return;
      }
    }
    const menu = resolveMenuLink(stepRoute);
    const menuRect = menu ? toRect(menu) : null;
    setSpot(menuRect ? { rect: menuRect, fallback: true } : null);
  }, [step?.target, stepRoute]);

  /** Pula automaticamente passos cujo pré-requisito não existe para o usuário. */
  useEffect(() => {
    if (!track || !step?.requires) return;
    const t = setTimeout(() => {
      if (!document.querySelector(step.requires as string)) {
        if (stepIndex < track.steps.length - 1) goTo(stepIndex + 1);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [goTo, step?.requires, stepIndex, track]);

  /** Medição + auto scroll suave até centralizar o elemento. */
  useLayoutEffect(() => {
    if (!track) return;
    setTargetMissing(false);
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(() => {
      const el = resolveTarget(step?.target) ?? resolveMenuLink(stepRoute);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setTimeout(measure, 420);
    }, 300);
    const t3 = setTimeout(() => {
      if (!resolveTarget(step?.target)) setTargetMissing(true);
    }, 2200);
    const observer = new MutationObserver(() => measure());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step?.target, stepRoute, track]);

  /** Detecção da ação do usuário. */
  useEffect(() => {
    if (!track || action === "none" || actionDone) return;

    const isInsideTarget = (node: EventTarget | null) => {
      const el = targetRef.current;
      if (!el || !(node instanceof Node)) return false;
      return el === node || el.contains(node);
    };

    const onClick = (e: MouseEvent) => {
      if (["click", "create", "submit", "confirm", "delete", "edit", "export", "print", "upload"].includes(action)) {
        if (isInsideTarget(e.target) || (!targetRef.current && (e.target as HTMLElement)?.closest?.("button"))) {
          setTimeout(markActionDone, 350);
        }
      }
      if (action === "select") {
        const el = e.target as HTMLElement | null;
        if (el?.closest("[role='option'], option, [data-radix-collection-item]")) setTimeout(markActionDone, 200);
      }
      if (action === "confirm") {
        const el = e.target as HTMLElement | null;
        if (el?.closest("[role='switch'], [role='checkbox'], input[type='checkbox']")) markActionDone();
      }
    };

    const onInput = (e: Event) => {
      if (action !== "input" && action !== "upload") return;
      const el = e.target as HTMLInputElement | null;
      if (!el) return;
      const min = step?.validate?.minLength ?? 2;
      if (el.type === "file" ? Boolean(el.files?.length) : (el.value ?? "").trim().length >= min) markActionDone();
    };

    const onChange = (e: Event) => {
      if (action !== "select") return;
      const el = e.target as HTMLSelectElement | null;
      if (el && el.value) markActionDone();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onChange, true);
    };
  }, [action, actionDone, markActionDone, step?.validate?.minLength, track]);

  /** Ação de navegação: concluída quando a rota alvo é aberta. */
  useEffect(() => {
    if (action !== "navigate" || actionDone) return;
    const target = step?.validate?.route ?? step?.route;
    if (target && pathname.startsWith(target)) markActionDone();
  }, [action, actionDone, markActionDone, pathname, step?.route, step?.validate?.route]);

  /** Modo demonstração: avança sozinho. */
  useEffect(() => {
    if (!demoMode || !track) return;
    const t = setTimeout(() => next(), 4000);
    return () => clearTimeout(t);
  }, [demoMode, next, stepIndex, track]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !openDialog()) stop();
      if (e.key === "ArrowRight" && !waiting) next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, stop, waiting]);

  if (!mounted || !track || !step) return null;

  const total = track.steps.length;
  const isLast = stepIndex === total - 1;
  const pad = 8;
  const rect = spot?.rect ?? null;
  const percent = Math.round(((stepIndex + 1) / total) * 100);
  const restMin = remainingMinutes(track, stepIndex);

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

  const useBelow = rect ? window.innerHeight - (rect.top + rect.height) > 300 : false;
  const cardStyle: React.CSSProperties = rect
    ? (() => {
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 372));
        return useBelow
          ? { top: rect.top + rect.height + pad + 34, left }
          : { bottom: window.innerHeight - rect.top + pad + 34, left };
      })()
    : { bottom: 24, right: 24 };

  const markerStyle: React.CSSProperties | null = rect
    ? (() => {
        const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 160));
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
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(2,2,4,0.68), 0 0 28px 4px color-mix(in oklab, var(--primary) 55%, transparent)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-background/70" />
      )}

      {/* Halo pulsante enquanto aguarda a ação */}
      {rect && waiting && (
        <div
          className="pointer-events-none absolute animate-pulse rounded-2xl ring-4 ring-primary/40"
          style={{
            top: rect.top - pad - 6,
            left: rect.left - pad - 6,
            width: rect.width + pad * 2 + 12,
            height: rect.height + pad * 2 + 12,
          }}
        />
      )}

      {/* Marcador com seta apontando o elemento */}
      {markerStyle && (
        <div
          className="pointer-events-none absolute flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-lg"
          style={markerStyle}
        >
          {useBelow ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          {spot?.fallback ? "Abra por aqui" : waiting ? "Clique aqui" : "É aqui"}
        </div>
      )}

      {/* Caixa de instrução */}
      <div
        data-tutorial-card=""
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onFocusCapture={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute w-[min(370px,calc(100vw-24px))] animate-scale-in rounded-2xl border border-primary/30 bg-background/98 p-4 shadow-2xl backdrop-blur"
        style={cardStyle}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary">
              {track.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Passo {stepIndex + 1} de {total} · {percent}% · ~{restMin} min restantes
              {demoMode && " · modo demonstração"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(true)} title="Minimizar">
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stop} title="Encerrar tutorial">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {step.title && <h4 className="text-sm font-bold leading-snug">{step.title}</h4>}
        <p className="mt-0.5 text-sm font-medium leading-snug">{step.text}</p>

        {step.objective && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Objetivo: </span>
              {step.objective}
            </span>
          </div>
        )}
        {step.hint && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>{step.hint}</span>
          </div>
        )}

        {/* Onde encontrar */}
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
          </div>
        )}

        {/* Status da ação esperada */}
        {action !== "none" && (
          <div
            className={`mt-3 flex items-start gap-1.5 rounded-xl border p-2.5 text-[11px] leading-snug ${
              actionDone || demoMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700"
            }`}
          >
            {actionDone || demoMode ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : waiting ? (
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              {actionDone || demoMode
                ? "Ação concluída! Você pode seguir para o próximo passo."
                : targetMissing
                  ? "Não encontrei este elemento na tela — siga manualmente e avance quando terminar."
                  : ACTION_LABEL[action]}
            </span>
          </div>
        )}

        {/* Barra de progresso */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={prev} disabled={stepIndex === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={finish} className="gap-1 text-muted-foreground">
              <SkipForward className="h-3.5 w-3.5" /> Pular
            </Button>
            <Button size="sm" onClick={next} disabled={waiting} className="gap-1">
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
      </div>
    </div>,
    document.body,
  );
}
