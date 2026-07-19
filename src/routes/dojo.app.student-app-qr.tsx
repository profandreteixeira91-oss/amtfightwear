import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { Printer, Download, Copy, Check, ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  const [path, setPath] = useState("/app/install");
  const [headline, setHeadline] = useState("Baixe o App do Aluno");
  const [subline, setSubline] = useState("Aponte a câmera do celular para o código abaixo");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Personalized path per dojo — avoids cross-tenant conflicts.
  const fullPath = slug ? `/app/install/${slug}` : path;
  const base = (cfg?.public_url || origin || "").replace(/\/$/, "");
  const url = base ? `${base}${fullPath.startsWith("/") ? fullPath : `/${fullPath}`}` : "";
  const academyName = branding?.trade_name ?? branding?.legal_name ?? "Sua academia";
  const brandColor = branding?.brand_primary ?? "#dc2626";

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (slug) setPath(`/app/install/${slug}`);
  }, [slug]);



  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 720,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).catch(() => {});
    QRCode.toDataURL(url, {
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
    <div className="dojo-theme min-h-screen bg-neutral-50">
      {/* Barra superior — some na impressão */}
      <div className="print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dojo/app/student-app"
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
            >
              <ArrowLeft className="h-4 w-4" /> Editor do app
            </Link>
            <div>
              <h1 className="text-lg font-bold">QR do App do Aluno</h1>
              <p className="text-xs text-muted-foreground">
                Imprima este cartaz e fixe na academia — os alunos escaneiam e instalam o app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyLink}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Copiar link
            </Button>
            <Button variant="outline" onClick={downloadPng} disabled={!dataUrl}>
              <Download className="mr-2 h-4 w-4" /> Baixar PNG
            </Button>
            <Button onClick={printPoster} disabled={!url}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir cartaz
            </Button>
          </div>
        </div>

        {/* Ajustes rápidos */}
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Endereço do app (destino do QR)</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={origin} onChange={(e) => setOrigin(e.target.value)} className="font-mono text-xs" />
                  <Input value={path} onChange={(e) => setPath(e.target.value)} className="max-w-[180px] font-mono text-xs" />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {slug ? (
                    <>Link exclusivo desta academia: <span className="font-mono">/app/install/{slug}</span></>
                  ) : (
                    <>Link genérico — configure o nome da academia para gerar o link personalizado.</>
                  )}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Título do cartaz</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Subtítulo</Label>
                  <Input value={subline} onChange={(e) => setSubline(e.target.value)} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Cartaz */}
      <div className="mx-auto max-w-3xl px-4 pb-10 print:max-w-none print:px-0 print:pb-0">
        <div
          id="poster"
          className="poster relative mx-auto flex flex-col items-center overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-neutral-200 print:rounded-none print:shadow-none print:ring-0"
          style={{ aspectRatio: "1 / 1.414" }}
        >
          {/* Faixa superior */}
          <div
            className="flex w-full items-center justify-between px-10 py-6 text-white"
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
          <div className="flex flex-1 flex-col items-center justify-center px-10 py-6 text-center">
            <h2 className="text-4xl font-black tracking-tight text-neutral-900">{headline}</h2>
            <p className="mt-2 max-w-md text-base text-neutral-600">{subline}</p>

            <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
              <canvas ref={canvasRef} className="block h-[320px] w-[320px] print:h-[420px] print:w-[420px]" />
            </div>

            <div className="mt-6 max-w-md break-all rounded-full bg-neutral-100 px-4 py-2 font-mono text-xs text-neutral-600">
              {url || "…"}
            </div>

            {/* Passos */}
            <ol className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3 text-left">
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
          <div className="w-full border-t bg-neutral-50 px-10 py-4 text-center text-[11px] text-neutral-500">
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
