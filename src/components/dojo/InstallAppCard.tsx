import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { registerPwa } from "@/lib/pwa/register";
import {
  getDeferredInstallPrompt,
  isPwaInstalled,
  subscribeInstallState,
  triggerInstallPrompt,
} from "@/lib/pwa/install-prompt";

export function InstallAppCard() {
  const promptEvent = useSyncExternalStore(
    subscribeInstallState,
    () => getDeferredInstallPrompt(),
    () => null,
  );
  const installed = useSyncExternalStore(
    subscribeInstallState,
    () => isPwaInstalled(),
    () => false,
  );

  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void registerPwa();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
  }, []);

  const install = async () => {
    if (installed) return;
    setBusy(true);
    try {
      const outcome = await triggerInstallPrompt();
      if (outcome === "accepted") {
        toast.success("Aplicativo instalado.");
      } else if (outcome === "dismissed") {
        toast.message("Instalação cancelada.");
      } else if (isIOS) {
        toast.info(
          "No iPhone/iPad, o navegador não permite instalação automática. Toque em Compartilhar e escolha 'Adicionar à Tela de Início'.",
          { duration: 9000 },
        );
      } else {
        toast.info(
          "Instalação indisponível agora. Use o navegador no celular (Chrome/Edge) e recarregue esta página.",
          { duration: 9000 },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const canInstallDirectly = !!promptEvent;

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
              {installed
                ? "Aplicativo já instalado neste dispositivo."
                : canInstallDirectly
                  ? "Toque em Instalar agora e confirme no diálogo do navegador."
                  : isIOS
                    ? "No iPhone/iPad a instalação é feita pelo botão Compartilhar do Safari."
                    : "Tenha acesso rápido, notificações push e uso offline."}
            </p>
          </div>
        </div>
        <Button
          onClick={install}
          disabled={installed || busy}
          className="shrink-0 bg-white text-red-700 hover:bg-white/90 disabled:opacity-70"
        >
          {installed ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Instalado
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {busy ? "Abrindo..." : "Instalar agora"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
