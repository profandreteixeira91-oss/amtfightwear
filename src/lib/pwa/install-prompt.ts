// Captura global do evento `beforeinstallprompt` o mais cedo possível.
// O navegador só dispara este evento uma vez; se ninguém escutar no momento
// exato, ele é perdido e o botão de instalar do PWA cai no fallback de
// instruções. Este módulo mantém a referência viva para que qualquer
// componente possa disparar o prompt nativo depois.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

let deferredEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  // Recupera evento eventualmente capturado pelo script inline em __root.tsx
  const early = (window as any).__amtInstallPrompt as BeforeInstallPromptEvent | null | undefined;
  if (early) deferredEvent = early;
  if ((window as any).__amtInstalled) installed = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvent = e as BeforeInstallPromptEvent;
    (window as any).__amtInstallPrompt = deferredEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredEvent = null;
    (window as any).__amtInstallPrompt = null;
    (window as any).__amtInstalled = true;
    emit();
  });
  // Evento disparado pelo script inline quando o evento nativo chega antes deste módulo carregar
  window.addEventListener("amt:install-ready", () => {
    const evt = (window as any).__amtInstallPrompt as BeforeInstallPromptEvent | null;
    deferredEvent = evt ?? null;
    if ((window as any).__amtInstalled) installed = true;
    emit();
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredEvent;
}

export function isPwaInstalled(): boolean {
  if (installed) return true;
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  return !!mql?.matches || (window.navigator as any).standalone === true;
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function triggerInstallPrompt(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const evt = deferredEvent;
  if (!evt) return "unavailable";
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    // O evento só pode ser usado uma vez.
    deferredEvent = null;
    emit();
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}
