import { useEffect, useState } from "react";
import splashVideo from "@/assets/dojo-splash.mp4.asset.json";

const SESSION_KEY = "dojo_splash_shown_v1";

/**
 * Splash de abertura do AMT Dojo Manager.
 * Só é exibido quando o app está rodando como PWA instalado (display-mode: standalone)
 * e apenas uma vez por sessão. No navegador comum, não renderiza nada.
 */
export function DojoSplash() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detecta PWA instalado (standalone em Android/desktop, ou iOS Safari legacy)
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error - iOS-specific
      window.navigator.standalone === true;

    if (!isStandalone) return;

    // Uma vez por sessão
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage bloqueado — segue exibindo mesmo assim
    }

    setVisible(true);
  }, []);

  const dismiss = () => {
    if (fadingOut) return;
    setFadingOut(true);
    setTimeout(() => setVisible(false), 350);
  };

  if (!visible) return null;

  // Respeita prefers-reduced-motion pulando o vídeo
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    // Fecha rápido, sem animação
    setTimeout(() => setVisible(false), 50);
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="AMT Dojo Manager"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-300 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <video
        src={splashVideo.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={dismiss}
        className="absolute bottom-6 right-6 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/20"
      >
        Pular
      </button>
    </div>
  );
}
