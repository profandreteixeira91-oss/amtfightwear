import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Smartphone,
  Share,
  MoreVertical,
  ArrowRight,
  Download,
  Apple,
  Chrome,
  CheckCircle2,
  PackageOpen,
} from "lucide-react";
import { getAcademyBySlug, type PublicAcademy } from "@/lib/dojo/academy-public.functions";
import { getPublicApkInfoBySlug } from "@/lib/dojo/apk-distribution.functions";

export const Route = createFileRoute("/app/install/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Baixar App — ${params.slug}` },
      { name: "description", content: "Instale o Portal do Aluno personalizado da sua academia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandedInstallPage,
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

function BrandedInstallPage() {
  const { slug } = Route.useParams();
  const fetchAcademy = useServerFn(getAcademyBySlug);
  const { data: academy, isLoading } = useQuery({
    queryKey: ["public-academy", slug],
    queryFn: () => fetchAcademy({ data: { slug } }),
    staleTime: 60_000,
  });

  const fetchApk = useServerFn(getPublicApkInfoBySlug);
  const { data: apk } = useQuery({
    queryKey: ["public-apk", slug],
    queryFn: () => fetchApk({ data: { slug } }),
    staleTime: 60_000,
  });

  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);
    // Persist tenant context for downstream screens (login, splash)
    try {
      localStorage.setItem("dojo_slug", slug);
      if (academy) localStorage.setItem("dojo_branding", JSON.stringify(academy));
    } catch {}

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
  }, [slug, academy]);

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const c = await installEvent.userChoice;
    if (c.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  const brand = academy?.brand_primary || "#dc2626";
  const brand2 = academy?.brand_secondary || "#7f1d1d";
  const academyName = academy?.trade_name || academy?.legal_name || "Sua academia";
  const canPrompt = !!installEvent && !installed;

  if (isLoading) {
    return <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-neutral-500">Carregando…</div>;
  }
  if (!academy) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-bold">Academia não encontrada</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Este link de instalação é inválido ou expirou. Peça um novo QR Code para sua academia.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      {/* Branded hero */}
      <div
        className="mx-auto mb-5 grid h-24 w-24 place-items-center overflow-hidden rounded-3xl text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${brand}, ${brand2})`, boxShadow: `0 20px 45px -20px ${brand}` }}
      >
        {academy.logo_url ? (
          <img src={academy.logo_url} alt={academyName} className="h-full w-full object-contain p-2" />
        ) : (
          <Smartphone className="h-10 w-10" />
        )}
      </div>
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: brand }}>
        Portal do Aluno
      </div>
      <h1 className="mt-1 text-center text-3xl font-black tracking-tight">{academyName}</h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Instale o app oficial da <b>{academyName}</b> em poucos segundos e acompanhe treinos, check-ins, mensalidades e faixas.
      </p>

      <div className="mt-6 space-y-3">
        {installed ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-50 py-4 text-sm font-semibold text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="h-5 w-5" /> App já instalado
          </div>
        ) : canPrompt ? (
          <button
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99]"
            style={{ background: brand, boxShadow: `0 15px 30px -12px ${brand}` }}
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

        {apk && (platform === "android" || platform === "desktop") && (
          <a
            href={`/api/public/app/${slug}/download`}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-left text-emerald-900 transition hover:bg-emerald-100 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <PackageOpen className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">Baixar APK (Android)</div>
                <div className="text-[11px] opacity-80">
                  v{apk.version_name} · {(apk.file_size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>
            <Download className="h-5 w-5" />
          </a>
        )}

        <Link
          to="/app/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3.5 text-base font-semibold text-neutral-900 transition hover:bg-neutral-50 active:scale-[0.99]"
        >
          Já instalei — entrar agora <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {apk && platform === "android" && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200">
          <b>Instalando o APK:</b> após baixar, abra o arquivo e permita <b>“Instalar apps desconhecidos”</b> se o Android
          solicitar. É seguro — o arquivo vem direto da sua academia.
        </div>
      )}

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
            <li>3. Confirme em <b>Adicionar</b>.</li>
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
        Este link é exclusivo da <b>{academyName}</b>. Cada academia tem o seu próprio app.
      </p>
    </div>
  );
}
