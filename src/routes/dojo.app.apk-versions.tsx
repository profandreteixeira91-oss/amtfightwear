import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { qrToCanvas } from "@/lib/qrcode-lazy";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  listApkVersions,
  setApkPublished,
  deleteApkVersion,
  getApkSignedUrl,
  setAcademyPublicUrl,
  getAcademyPublicUrl,
} from "@/lib/dojo/apk-distribution.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dojo/app/apk-versions")({
  head: () => ({
    meta: [
      { title: "Aplicativo do Aluno — Versões — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApkVersionsPage,
});

function bytesToMb(n: number) {
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

function ApkVersionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listApkVersions);
  const setPublishedFn = useServerFn(setApkPublished);
  const deleteFn = useServerFn(deleteApkVersion);
  const signedFn = useServerFn(getApkSignedUrl);
  const setUrlFn = useServerFn(setAcademyPublicUrl);
  const urlFn = useServerFn(getAcademyPublicUrl);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["dojo", "apk-versions"],
    queryFn: () => listFn({}),
  });
  const { data: cfg } = useQuery({
    queryKey: ["dojo", "public-url"],
    queryFn: () => urlFn({}),
  });

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const slug = cfg?.slug ?? "";
  const baseUrl = (cfg?.public_url || origin).replace(/\/$/, "");
  const publicPageUrl = slug ? `${baseUrl}/app/install/${slug}` : "";
  const publicDownloadUrl = slug ? `${baseUrl}/api/public/app/${slug}/download` : "";
  const published = versions.find((v) => v.is_published) ?? null;

  // ---- URL pública ----
  const [publicUrl, setPublicUrl] = useState("");
  useEffect(() => {
    if (cfg?.public_url) setPublicUrl(cfg.public_url);
  }, [cfg?.public_url]);
  const saveUrlMut = useMutation({
    mutationFn: () => setUrlFn({ data: { public_url: publicUrl.trim() } }),
    onSuccess: () => {
      toast.success("URL pública salva");
      qc.invalidateQueries({ queryKey: ["dojo", "public-url"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  // ---- Upload ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [buildCode, setBuildCode] = useState<string>("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (versions.length && !buildCode) {
      const next = Math.max(...versions.map((v) => v.build_code)) + 1;
      setBuildCode(String(next));
    } else if (!versions.length && !buildCode) {
      setBuildCode("1");
    }
  }, [versions.length]);

  async function handleUpload() {
    if (!file) return toast.error("Selecione um arquivo .apk");
    if (!/\.apk$/i.test(file.name)) return toast.error("Somente arquivos .apk");
    if (!versionName.trim()) return toast.error("Informe o nome da versão (ex.: 1.0.3)");
    if (!/^[1-9]\d*$/.test(buildCode)) return toast.error("Build code deve ser um inteiro positivo");

    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("version_name", versionName.trim());
      fd.append("build_code", buildCode);
      fd.append("release_notes", releaseNotes.trim());
      fd.append("publish", publishNow ? "true" : "false");

      const res = await fetch("/api/dojo/apk-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      toast.success("Versão enviada com sucesso");
      setFile(null);
      setVersionName("");
      setReleaseNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["dojo", "apk-versions"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  const publishMut = useMutation({
    mutationFn: (v: { id: string; published: boolean }) => setPublishedFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojo", "apk-versions"] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Versão excluída");
      qc.invalidateQueries({ queryKey: ["dojo", "apk-versions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  async function handleDownload(id: string) {
    try {
      const { url } = await signedFn({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao baixar");
    }
  }

  // QR de download persistente
  const qrRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!qrRef.current || !publicPageUrl) return;
    qrToCanvas(qrRef.current, publicPageUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).catch(() => {});
  }, [publicPageUrl]);

  return (
    <div className="dojo-theme min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Aplicativo do Aluno — Versões</h1>
            <p className="text-sm text-muted-foreground">
              Publique o APK do aplicativo. O link de download é permanente e o QR nunca muda.
            </p>
          </div>
          <Link
            to="/dojo/app/student-app-qr"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Cartaz/QR completo <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {!slug && (
          <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Configure o nome/perfil da academia primeiro — o link personalizado depende do slug.
          </Card>
        )}

        {/* URL pública */}
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold">URL pública do sistema</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Domínio usado na geração de QR Codes e links permanentes. Deixe em branco para usar o domínio atual (
            {origin || "…"}).
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[280px]">
              <Label className="text-xs">URL base (https://…)</Label>
              <Input
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://dojo.amtfightwear.com.br"
              />
            </div>
            <Button onClick={() => saveUrlMut.mutate()} disabled={saveUrlMut.isPending}>
              {saveUrlMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </Card>

        {/* Painel do link permanente */}
        <Card className="mb-4 p-4">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="grid place-items-center rounded-xl border bg-white p-3">
              {publicPageUrl ? (
                <canvas ref={qrRef} className="h-[220px] w-[220px]" />
              ) : (
                <div className="text-xs text-muted-foreground">Aguardando slug…</div>
              )}
            </div>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Página pública de download</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Input readOnly value={publicPageUrl} className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(publicPageUrl);
                      toast.success("Link copiado");
                    }}
                    disabled={!publicPageUrl}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copiar
                  </Button>
                  <Button variant="outline" asChild disabled={!publicPageUrl}>
                    <a href={publicPageUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Abrir
                    </a>
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Download direto (permanente)</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Input readOnly value={publicDownloadUrl} className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(publicDownloadUrl);
                      toast.success("Link copiado");
                    }}
                    disabled={!publicDownloadUrl}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copiar
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sempre entrega a última versão publicada — o link não muda quando você publica uma nova versão.
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 text-xs">
                {published ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Versão publicada: <b>v{published.version_name}</b> (build {published.build_code}) — {published.downloads} downloads
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <XCircle className="h-4 w-4" />
                    Nenhuma versão publicada no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Upload */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Publicar nova versão</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label className="text-xs">Arquivo .apk (máx. 300 MB)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {file.name} — {bytesToMb(file.size)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Nome da versão</Label>
              <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="1.0.3" />
            </div>
            <div>
              <Label className="text-xs">Build (inteiro)</Label>
              <Input
                type="number"
                min={1}
                value={buildCode}
                onChange={(e) => setBuildCode(e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                  className="h-4 w-4"
                />
                Publicar imediatamente
              </label>
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Notas da versão</Label>
              <Textarea
                rows={3}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Correções e melhorias…"
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Enviar versão
              </Button>
            </div>
          </div>
        </Card>

        {/* Histórico */}
        <Card className="p-0">
          <div className="flex items-center gap-2 border-b p-4">
            <Package className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Histórico de versões</h2>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : versions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhuma versão publicada ainda.</div>
          ) : (
            <div className="divide-y">
              {versions.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">v{v.version_name}</span>
                      <span className="text-xs text-muted-foreground">build {v.build_code}</span>
                      {v.is_published ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Publicada
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {v.file_name} · {bytesToMb(v.file_size)} · {new Date(v.created_at).toLocaleString("pt-BR")} ·{" "}
                      {v.downloads} downloads
                    </div>
                    {v.release_notes && (
                      <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-neutral-600">
                        {v.release_notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(v.id)}>
                      <Download className="mr-1 h-4 w-4" /> Baixar
                    </Button>
                    <Button
                      variant={v.is_published ? "outline" : "default"}
                      size="sm"
                      onClick={() => publishMut.mutate({ id: v.id, published: !v.is_published })}
                      disabled={publishMut.isPending}
                    >
                      {v.is_published ? "Despublicar" : "Publicar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Excluir esta versão? Esta ação remove o arquivo.")) {
                          deleteMut.mutate(v.id);
                        }
                      }}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
