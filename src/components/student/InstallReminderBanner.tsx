import { useEffect, useState } from "react";
import { Bell, Download, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  const ios = (window.navigator as any).standalone === true;
  return !!(mm || ios);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Banner fixo no topo do app do aluno, exibido apenas em dispositivos móveis
 * que ainda não instalaram o PWA. Some quando o app está aberto em modo standalone.
 */
export function InstallReminderBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMobile()) return;
    if (isStandalone()) return;
    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => {
      if (isStandalone()) setVisible(false);
    };
    mql?.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mql?.removeEventListener?.("change", onChange);
    };
  }, []);

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Aplicativo instalado.");
        setVisible(false);
      }
      setInstallEvent(null);
      return;
    }
    if (isIOS()) {
      toast.info(
        "No iPhone/iPad: toque em Compartilhar e escolha 'Adicionar à Tela de Início' para instalar o app.",
        { duration: 9000 },
      );
    } else {
      toast.info(
        "No seu navegador: abra o menu (⋮) e toque em 'Instalar aplicativo' ou 'Adicionar à tela inicial'.",
        { duration: 9000 },
      );
    }
  }

  if (!visible || dismissed) return null;

  return (
    <div
      className="sticky top-0 z-40 border-b border-red-700/40 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="region"
      aria-label="Instalar aplicativo"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">
            Instale o app para receber avisos
          </div>
          <div className="truncate text-[11px] text-white/85">
            Ative notificações de aulas, cobranças e recados.
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          className="h-8 shrink-0 bg-white px-3 text-[12px] font-semibold text-red-700 hover:bg-white/90"
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Instalar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/10"
          aria-label="Fechar por agora"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
