import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Upload, Link as LinkIcon, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  getVideo,
  listVideoCategories,
  upsertVideo,
  deleteVideo,
} from "@/lib/dojo/videos.functions";
import { uploadVideoFile, probeVideoDuration } from "@/components/dojo/videos/upload";

export const Route = createFileRoute("/dojo/app/videos/novo")({
  head: () => ({ meta: [{ title: "Novo vídeo — AMT Dojo Manager" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string | undefined) ?? undefined, step: s.step ? Number(s.step) : undefined }),
  component: VideoEditor,
});

type Attachment = { name: string; url: string; kind: "pdf" | "image" | "link" | "file" };

function VideoEditor() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();

  const categories = useQuery({ queryKey: ["dojo-videos", "categories"], queryFn: () => listVideoCategories() });
  const existing = useQuery({
    queryKey: ["dojo-video", id],
    queryFn: () => getVideo({ data: { id: id! } }),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [subcategoryId, setSubcategoryId] = useState<string>("none");
  const [teacherName, setTeacherName] = useState("");
  const [videoSource, setVideoSource] = useState<"upload" | "youtube" | "vimeo" | "url">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "private">("draft");
  const [visibility, setVisibility] = useState<"public" | "exclusive">("exclusive");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState<null | "video" | "thumb" | "file">(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = existing.data as any;
    if (!v) return;
    setTitle(v.title ?? "");
    setDescription(v.description ?? "");
    setCategoryId(v.category_id ?? "none");
    setSubcategoryId(v.subcategory_id ?? "none");
    setTeacherName(v.teacher_name ?? "");
    setVideoSource(v.video_source ?? "url");
    setVideoUrl(v.video_url ?? "");
    setThumbnailUrl(v.thumbnail_url ?? "");
    setDuration(v.duration_seconds ?? null);
    setStatus(v.status ?? "draft");
    setVisibility(v.visibility ?? "exclusive");
    setAttachments(Array.isArray(v.attachments) ? v.attachments : []);
  }, [existing.data]);

  const rootCats = useMemo(() => (categories.data ?? []).filter((c: any) => !c.parent_id), [categories.data]);
  const subCats = useMemo(
    () => (categories.data ?? []).filter((c: any) => c.parent_id === categoryId),
    [categories.data, categoryId],
  );

  async function currentUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? "";
  }

  async function handleVideoUpload(f: File) {
    setUploading("video");
    try {
      const uid = await currentUserId();
      const [url, dur] = await Promise.all([uploadVideoFile(f, uid, "video"), probeVideoDuration(f)]);
      setVideoUrl(url);
      setVideoSource("upload");
      if (dur) setDuration(dur);
      toast.success("Vídeo enviado");
    } catch (e) {
      toast.error("Falha no upload", { description: e instanceof Error ? e.message : "" });
    } finally {
      setUploading(null);
    }
  }

  async function handleThumbUpload(f: File) {
    setUploading("thumb");
    try {
      const uid = await currentUserId();
      const url = await uploadVideoFile(f, uid, "thumb");
      setThumbnailUrl(url);
      toast.success("Thumbnail enviada");
    } catch (e) {
      toast.error("Falha no upload", { description: e instanceof Error ? e.message : "" });
    } finally {
      setUploading(null);
    }
  }

  async function handleAttachmentUpload(f: File) {
    setUploading("file");
    try {
      const uid = await currentUserId();
      const url = await uploadVideoFile(f, uid, "attachment");
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const isImg = f.type.startsWith("image/");
      setAttachments((prev) => [
        ...prev,
        { name: f.name, url, kind: isPdf ? "pdf" : isImg ? "image" : "file" },
      ]);
    } catch (e) {
      toast.error("Falha no upload", { description: e instanceof Error ? e.message : "" });
    } finally {
      setUploading(null);
    }
  }

  function addLinkAttachment() {
    if (!linkUrl.trim()) return;
    setAttachments((prev) => [...prev, { name: linkName || linkUrl, url: linkUrl, kind: "link" }]);
    setLinkName(""); setLinkUrl("");
  }

  async function handleSave(publish?: boolean) {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      const row = await upsertVideo({
        data: {
          id: id || undefined,
          title: title.trim(),
          description: description || null,
          category_id: categoryId === "none" ? null : categoryId,
          subcategory_id: subcategoryId === "none" ? null : subcategoryId,
          teacher_name: teacherName || null,
          thumbnail_url: thumbnailUrl || null,
          video_url: videoUrl || null,
          video_source: videoSource,
          duration_seconds: duration ?? null,
          status: publish ? "published" : status,
          visibility,
          attachments,
        },
      });
      toast.success(publish ? "Vídeo publicado" : "Vídeo salvo");
      qc.invalidateQueries({ queryKey: ["dojo-videos"] });
      nav({ to: "/dojo/app/videos/$id", params: { id: (row as any).id } });
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Excluir este vídeo?")) return;
    await deleteVideo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-videos"] });
    nav({ to: "/dojo/app/videos" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/dojo/app/videos"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {id && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 sm:flex-none text-destructive border-destructive/20 hover:bg-destructive/10">
              <span className="truncate">Excluir</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="flex-1 sm:flex-none">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            <span className="truncate">Salvar rascunho</span>
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            <span className="truncate">Publicar</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: main fields */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Informações</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Passagem Toreando" />
              </div>
              <div>
                <Label htmlFor="desc">Descrição</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId("none"); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {rootCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategoria</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={subCats.length === 0}>
                    <SelectTrigger><SelectValue placeholder={subCats.length ? "Selecione" : "Nenhuma"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem subcategoria</SelectItem>
                      {subCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="teacher">Professor responsável</Label>
                <Input id="teacher" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Nome do professor" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Vídeo</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {(["upload", "youtube", "vimeo", "url"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVideoSource(s)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                    videoSource === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
                  }`}
                >
                  {s === "upload" ? "Upload direto" : s === "youtube" ? "YouTube" : s === "vimeo" ? "Vimeo" : "URL externa"}
                </button>
              ))}
            </div>
            {videoSource === "upload" ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm font-semibold hover:bg-accent">
                  {uploading === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading === "video" ? "Enviando..." : "Enviar arquivo de vídeo"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }}
                  />
                </label>
                {videoUrl && <span className="truncate text-xs text-muted-foreground">Vídeo enviado ✓</span>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={
                    videoSource === "youtube" ? "https://youtube.com/watch?v=..."
                    : videoSource === "vimeo" ? "https://vimeo.com/..."
                    : "https://..."
                  }
                />
                <div className="text-xs text-muted-foreground">
                  <LinkIcon className="mr-1 inline h-3 w-3" />
                  Referência externa
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Duração (segundos)</Label>
                <Input
                  type="number"
                  value={duration ?? ""}
                  onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Detectado automaticamente"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Materiais complementares</h3>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent">
                {uploading === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                Enviar arquivo (PDF, imagem, etc)
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachmentUpload(f); }}
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Título do link" />
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              <Button type="button" variant="outline" onClick={addLinkAttachment}>Adicionar link</Button>
            </div>
            {attachments.length > 0 && (
              <ul className="mt-4 space-y-2">
                {attachments.map((a, idx) => (
                  <li key={idx} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0 truncate">
                      <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{a.kind}</span>
                      <a className="hover:underline" href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                    </div>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="ml-3 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Publicação</h3>
            <div className="grid gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibilidade</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusivo (alunos)</SelectItem>
                    <SelectItem value="public">Público da academia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Thumbnail</h3>
            {thumbnailUrl ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-border">
                <img src={thumbnailUrl} alt="Thumbnail" className="aspect-video w-full object-cover" />
              </div>
            ) : (
              <div className="mb-3 grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                Sem thumbnail
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                {uploading === "thumb" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Enviar imagem
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); }} />
              </label>
              <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="ou cole URL" className="h-8 text-xs" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
