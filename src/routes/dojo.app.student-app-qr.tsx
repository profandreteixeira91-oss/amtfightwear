import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { qrToDataURL, qrToCanvas } from "@/lib/qrcode-lazy";
import { Printer, Download, Copy, Check, ArrowLeft, Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getMyBranding } from "@/lib/student/student.functions";
import { getMyAcademySlug } from "@/lib/dojo/academy-public.functions";
import { getAcademyPublicUrl } from "@/lib/dojo/apk-distribution.functions";

export const Route = createFileRoute("/dojo/app/student-app-qr")({
  head: () => ({
    meta: [
      { title: "QR do App do Aluno — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentAppQrPage,
});

function StudentAppQrPage() {
  const brandingFn = useServerFn(getMyBranding);
  const slugFn = useServerFn(getMyAcademySlug);
  const publicUrlFn = useServerFn(getAcademyPublicUrl);
  const { data: branding } = useQuery({ queryKey: ["dojo", "branding"], queryFn: () => brandingFn({}) });
  const { data: mine } = useQuery({ queryKey: ["dojo", "my-slug"], queryFn: () => slugFn({}) });
  const { data: cfg } = useQuery({ queryKey: ["dojo", "public-url"], queryFn: () => publicUrlFn({}) });

  const slug = mine?.slug ?? "";
  const [origin, setOrigin] = useState("");
  const [headline, setHeadline] = useState("Acesse o App do Aluno");
  const [subline, setSubline] = useState("Aponte a câmera do celular para o código abaixo e entre pelo navegador");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // QR aponta direto para o login online do app — sem etapa de download.
  const fullPath = slug ? `/app/login?dojo=${encodeURIComponent(slug)}` : `/app/login`;
  const rawBase = (cfg?.public_url || origin || "").replace(/\/$/, "");
  const base = rawBase.includes("dojomanager.amtfightwear.com.br") ? "https://amtfightwear.com.br" : rawBase;
  const url = base ? `${base}${fullPath}` : "";
  const academyName = branding?.trade_name ?? branding?.legal_name ?? "Sua academia";
  const brandColor = branding?.brand_primary ?? "#dc2626";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // O subdomínio dojomanager redireciona qualquer rota fora de /dojo/* para /dojo/*,
    // o que quebra /app/login. O portal do aluno vive no domínio principal.
    const host = window.location.hostname;
    if (host === "dojomanager.amtfightwear.com.br") setOrigin("https://amtfightwear.com.br");
    else setOrigin(window.location.origin);
  }, []);



  useEffect(() => {
    if (!url || !canvasRef.current) return;
    qrToCanvas(canvasRef.current, url, {
      width: 720,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).catch(() => {});
    qrToDataURL(url, {
      width: 1024,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-app-aluno-${academyName.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  function printPoster() {
    window.print();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Barra superior — some na impressão */}
      <div className="space-y-6 print:hidden">
        {/* HERO PREMIUM — padrão Ruby Noir das demais páginas do Dojo */}
        <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-white shadow-[0_30px_80px_-30px_rgba(220,38,38,0.45)]">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between md:p-9">
            <div className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
                <Smartphone className="h-3 w-3" />
                Portal do Aluno
              </div>
              <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
                QR do <span className="text-red-400">App do Aluno</span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
                Imprima este cartaz e fixe na academia — os alunos escaneiam e entram direto no portal, sem precisar baixar nada.
              </p>
            </div>

            <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto md:gap-3">
              <Button
                variant="outline"
                onClick={copyLink}
                className="h-10 border-red-500/30 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                <span className="truncate">Copiar link</span>
              </Button>
              <Button
                variant="outline"
                onClick={downloadPng}
                disabled={!dataUrl}
                className="h-10 border-red-500/30 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm"
              >
                <Download className="mr-2 h-4 w-4" /> <span className="truncate">Baixar PNG</span>
              </Button>
              <Button
                onClick={printPoster}
                disabled={!url}
                className="h-10 bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-700 text-xs sm:text-sm"
              >
                <Printer className="mr-2 h-4 w-4" /> <span className="truncate">Imprimir cartaz</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Ajustes rápidos */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Personalize o cartaz</h2>
            <p className="text-xs text-neutral-500">Ajuste o link, título e subtítulo antes de imprimir.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-neutral-600">Destino do QR</Label>
              <Input
                value={url}
                readOnly
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Ao escanear, o aluno vai direto para o login online do app{slug ? ` desta academia (${slug})` : ""}. Nenhum download é solicitado.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-neutral-600">Título do cartaz</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-neutral-600">Subtítulo</Label>
                <Input
                  value={subline}
                  onChange={(e) => setSubline(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Atalho para configurar notificações */}
        <Link
          to="/dojo/app/student-notifications-config"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-red-500/40 hover:shadow-md"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900">Notificações do App do Aluno</div>
              <div className="text-xs text-neutral-500 line-clamp-2">
                Escolha quais avisos serão enviados: aulas, cobranças, quadro de avisos, graduações, novos vídeos, avaliações e mais.
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 group-hover:text-red-700">
            Configurar →
          </div>
        </Link>
      </div>



      {/* Cartaz */}
      <div className="mx-auto max-w-3xl print:max-w-none print:px-0 print:pb-0">

        <div
          id="poster"
          className="poster relative mx-auto flex flex-col items-center overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-neutral-200 print:rounded-none print:shadow-none print:ring-0"
          style={{ aspectRatio: "1 / 1.414", minHeight: "600px" }}
        >
          {/* Faixa superior */}
          <div
            className="flex w-full items-center justify-between px-6 sm:px-10 py-6 text-white"
            style={{ background: brandColor }}
          >
            <div className="flex items-center gap-3">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt={academyName} className="h-12 w-12 rounded-lg bg-white/10 object-contain p-1" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/15 text-lg font-black">
                  {academyName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] opacity-90">Portal do Aluno</div>
                <div className="text-lg font-bold leading-tight">{academyName}</div>
              </div>
            </div>
            <Smartphone className="h-8 w-8 opacity-90" />
          </div>

          {/* Miolo */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 sm:px-10 py-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 line-clamp-2">{headline}</h2>
            <p className="mt-2 max-w-md text-sm sm:text-base text-neutral-600 line-clamp-3">{subline}</p>

            <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
              <canvas ref={canvasRef} className="block h-[240px] w-[240px] sm:h-[320px] sm:w-[320px] print:h-[420px] print:w-[420px]" />
            </div>

            <div className="mt-6 max-w-md break-all rounded-full bg-neutral-100 px-4 py-2 font-mono text-xs text-neutral-600">
              {url || "…"}
            </div>

            {/* Passos */}
            <ol className="mt-8 grid w-full max-w-lg grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {[
                { n: "1", t: "Abra a câmera", d: "Aponte para o QR code" },
                { n: "2", t: "Toque no link", d: "Aparece na tela" },
                { n: "3", t: "Instale o app", d: "Adicione à tela inicial" },
              ].map((s) => (
                <li key={s.n} className="rounded-2xl bg-neutral-50 p-3">
                  <div
                    className="mb-1 grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: brandColor }}
                  >
                    {s.n}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">{s.t}</div>
                  <div className="text-[11px] text-neutral-500">{s.d}</div>
                </li>
              ))}
            </ol>
          </div>

          {/* Rodapé */}
          <div className="w-full border-t bg-neutral-50 px-6 sm:px-10 py-4 text-center text-[10px] sm:text-[11px] text-neutral-500">
            Acompanhe seus treinos, check-ins, mensalidades e faixas — direto do seu celular.
            <span className="mx-2">·</span>
            Powered by <span className="font-semibold text-neutral-700">AMT Dojo Manager</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #ffffff !important; }
          .poster { width: 100%; height: 100vh; aspect-ratio: auto !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
