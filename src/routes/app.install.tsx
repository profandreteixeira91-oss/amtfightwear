import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Smartphone, Share, MoreVertical, ArrowRight, Download, Apple, Chrome, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/install")({
  head: () => ({
    meta: [
      { title: "Baixar o App do Aluno" },
      { name: "description", content: "Instale o Portal do Aluno no seu celular em poucos segundos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstallPage,
});

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      (window.navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  const canPrompt = !!installEvent && !installed;

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      {/* Hero */}
      <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-xl shadow-red-600/30">
        <Smartphone className="h-10 w-10" />
      </div>
      <h1 className="text-center text-3xl font-black tracking-tight">Baixe o App do Aluno</h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Instale em poucos segundos e acompanhe treinos, check-ins, mensalidades e faixas direto do seu celular.
      </p>

      {/* Primary CTA */}
      <div className="mt-6 space-y-3">
        {installed ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-50 py-4 text-sm font-semibold text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="h-5 w-5" /> App já instalado no seu dispositivo
          </div>
        ) : canPrompt ? (
          <button
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 active:scale-[0.99]"
          >
            <Download className="h-5 w-5" /> Instalar agora
          </button>
        ) : (
          <div className="rounded-2xl bg-white p-4 text-center text-sm text-neutral-600 ring-1 ring-neutral-100">
            {platform === "ios"
              ? "No iPhone/iPad, siga as instruções abaixo para adicionar à tela inicial."
              : platform === "android"
              ? "Toque em “Instalar aplicativo” no menu do Chrome (⋮) ou siga o passo a passo abaixo."
              : "Abra este link no seu celular para instalar o app."}
          </div>
        )}

        <Link
          to="/app/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3.5 text-base font-semibold text-neutral-900 transition hover:bg-neutral-50 active:scale-[0.99]"
        >
          Já instalei — entrar agora <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Platform instructions */}
      {(platform === "ios" || platform === "desktop") && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Apple className="h-4 w-4" /> iPhone / iPad (Safari)
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>1. Toque no ícone <b>Compartilhar</b>.</span>
            </li>
            <li>2. Role para baixo e toque em <b>“Adicionar à Tela de Início”</b>.</li>
            <li>3. Confirme em <b>Adicionar</b>. O ícone aparece na sua tela.</li>
          </ol>
        </section>
      )}

      {(platform === "android" || platform === "desktop") && (
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Chrome className="h-4 w-4" /> Android (Chrome)
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" />
              <span>1. Toque no menu <b>⋮</b> no canto superior.</span>
            </li>
            <li>2. Escolha <b>“Instalar aplicativo”</b> ou <b>“Adicionar à tela inicial”</b>.</li>
            <li>3. Confirme para instalar.</li>
          </ol>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">
        Após instalar, abra pelo ícone criado — o portal funciona em tela cheia, como um app nativo.
      </p>
    </div>
  );
}
