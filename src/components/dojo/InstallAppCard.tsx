import { useEffect, useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { registerPwa } from "@/lib/pwa/register";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    void registerPwa();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const setInst = () =>
      setIsInstalled(!!mql?.matches || (navigator as any).standalone === true);
    setInst();
    mql?.addEventListener?.("change", setInst);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mql?.removeEventListener?.("change", setInst);
    };
  }, []);

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") toast.success("Aplicativo instalado.");
      setInstallEvent(null);
      return;
    }
    if (isIOS) {
      toast.info(
        "No iPhone/iPad: toque em Compartilhar e escolha 'Adicionar à Tela de Início'.",
        { duration: 9000 },
      );
    } else {
      toast.info(
        "No Chrome/Edge: abra o menu (⋮) e toque em 'Instalar aplicativo' ou 'Adicionar à tela inicial'.",
        { duration: 9000 },
      );
    }
  };

  return (
    <Card className="border-red-500/20 bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold">Instale o Dojo Manager</div>
            <p className="text-sm text-white/85">
              {isInstalled
                ? "Aplicativo já instalado neste dispositivo."
                : "Tenha acesso rápido, notificações push e uso offline."}
            </p>
          </div>
        </div>
        <Button
          onClick={install}
          className="shrink-0 bg-white text-red-700 hover:bg-white/90"
        >
          {isInstalled ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Instalado
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Instalar agora
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
