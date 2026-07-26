import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Video, Upload, Trash2, Plus, Clock, Play, Pencil, X, FileVideo } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listFightVideos, createFightVideo, deleteFightVideo,
  addFightVideoNote, deleteFightVideoNote, updateFightVideoNote,
} from "@/lib/dojo/fight-videos.functions";

const BUCKET = "dojo-fight-videos";

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}
function parseTime(v: string): number | null {
  const parts = v.trim().split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

const CATEGORIES = ["Ataque", "Defesa", "Passagem", "Raspagem", "Finalização", "Postura", "Estratégia", "Erro", "Acerto"];

export function FightVideosTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listFightVideos);
  const createFn = useServerFn(createFightVideo);
  const deleteFn = useServerFn(deleteFightVideo);

  const q = useQuery({
    queryKey: ["fight-videos", studentId],
    queryFn: () => listFn({ data: { studentId } }),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && q.data && q.data.length) setSelectedId(q.data[0].id);
  }, [q.data, selectedId]);

  const selected = useMemo(() => q.data?.find((v) => v.id === selectedId) ?? null, [q.data, selectedId]);

  // ---- Upload ----
  const [openUpload, setOpenUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opponent, setOpponent] = useState("");
  const [eventName, setEventName] = useState("");
  const [videoDate, setVideoDate] = useState<string>("");
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  function resetUpload() {
    setFile(null); setTitle(""); setDescription(""); setOpponent(""); setEventName(""); setVideoDate("");
    setUploadPct(null);
  }

  async function probeDuration(f: File): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
        el.onerror = () => resolve(null);
        el.src = URL.createObjectURL(f);
      } catch { resolve(null); }
    });
  }

  async function handleUpload() {
    if (!file) { toast.error("Selecione um vídeo"); return; }
    if (!title.trim()) { toast.error("Informe um título"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 500 MB)"); return; }

    setUploadPct(1);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) { toast.error("Sessão inválida"); setUploadPct(null); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const path = `${uid}/${studentId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const duration = await probeDuration(file);
    setUploadPct(20);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });
    if (upErr) { toast.error("Falha no upload: " + upErr.message); setUploadPct(null); return; }
    setUploadPct(85);

    try {
      const res = await createFn({
        data: {
          studentId,
          title: title.trim(),
          description: description.trim() || null,
          opponent: opponent.trim() || null,
          event_name: eventName.trim() || null,
          video_date: videoDate || null,
          duration_seconds: duration ?? null,
          storage_path: path,
          content_type: file.type || null,
          size_bytes: file.size,
        },
      });
      setUploadPct(100);
      toast.success("Vídeo enviado");
      setSelectedId(res.id ?? null);
      setOpenUpload(false);
      resetUpload();
      qc.invalidateQueries({ queryKey: ["fight-videos", studentId] });
    } catch (e: any) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error(e?.message ?? "Falha ao registrar vídeo");
      setUploadPct(null);
    }
  }

  const del = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Vídeo excluído");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["fight-videos", studentId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {/* Lista lateral */}
      <SectionCard
        title="Vídeos do atleta"
        description="Análises técnicas gravadas"
        actions={
          <Dialog open={openUpload} onOpenChange={(v) => { setOpenUpload(v); if (!v) resetUpload(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Upload className="mr-2 h-4 w-4" />Enviar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Enviar vídeo de luta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Arquivo de vídeo</Label>
                  <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {file && <p className="mt-1 text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
                </div>
                <div>
                  <Label>Título *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Final absoluto — Copa Sul" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Oponente</Label>
                    <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={videoDate} onChange={(e) => setVideoDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Evento</Label>
                  <Input value={eventName} onChange={(e) => setEventName(e.target.value)} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {uploadPct != null && (
                  <div>
                    <Progress value={uploadPct} />
                    <p className="mt-1 text-xs text-muted-foreground">Enviando… {uploadPct}%</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenUpload(false)}>Cancelar</Button>
                <Button onClick={handleUpload} disabled={uploadPct != null}>Enviar vídeo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {q.isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (q.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FileVideo}
            title="Nenhum vídeo"
            description="Faça upload de vídeos de lutas do aluno para adicionar observações com marcações de tempo."
          />
        ) : (
          <ul className="space-y-2">
            {q.data!.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => setSelectedId(v.id)}
                  className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${selectedId === v.id ? "border-primary/50 bg-primary/5" : "border-border/40 hover:border-primary/30 hover:bg-muted/40"}`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-500">
                    <Play className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{v.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      {v.duration_seconds ? <span>{fmtTime(Number(v.duration_seconds))}</span> : null}
                      <span>· {v.notes?.length ?? 0} obs.</span>
                      {v.opponent && <span>· vs {v.opponent}</span>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Player + observações */}
      <div className="space-y-6">
        {!selected ? (
          <SectionCard title="Selecione um vídeo" description="Ou envie o primeiro registro">
            <EmptyState
              icon={Video}
              title="Análise por tempo"
              description="Escolha um vídeo à esquerda para reproduzir, marcar tempos-chave e registrar observações técnicas."
            />
          </SectionCard>
        ) : (
          <VideoAnalysisPanel
            key={selected.id}
            video={selected}
            onDelete={() => del.mutate(selected.id)}
            onChanged={() => qc.invalidateQueries({ queryKey: ["fight-videos", studentId] })}
          />
        )}
      </div>
    </div>
  );
}

function VideoAnalysisPanel({ video, onDelete, onChanged }: {
  video: any; onDelete: () => void; onChanged: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const addFn = useServerFn(addFightVideoNote);
  const delFn = useServerFn(deleteFightVideoNote);
  const updFn = useServerFn(updateFightVideoNote);

  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState<string>("");
  const [noteTime, setNoteTime] = useState<string>("0:00");

  useEffect(() => { setNoteTime(fmtTime(currentTime)); }, [currentTime]);

  const add = useMutation({
    mutationFn: async () => {
      const ts = parseTime(noteTime);
      if (ts == null) throw new Error("Tempo inválido");
      if (!noteText.trim()) throw new Error("Escreva a observação");
      return addFn({
        data: {
          video_id: video.id,
          timestamp_seconds: ts,
          title: noteTitle.trim() || null,
          note: noteText.trim(),
          category: noteCategory || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Observação adicionada");
      setNoteText(""); setNoteTitle(""); setNoteCategory("");
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const removeNote = useMutation({
    mutationFn: async (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removida"); onChanged(); },
  });

  function seekTo(sec: number) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = sec;
    el.play().catch(() => {});
  }

  function captureNow() {
    const el = videoRef.current;
    if (!el) return;
    setNoteTime(fmtTime(el.currentTime));
  }

  return (
    <>
      <SectionCard
        title={video.title}
        description={[video.opponent && `vs ${video.opponent}`, video.event_name, video.video_date && new Date(video.video_date).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}
        actions={
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />Excluir
          </Button>
        }
      >
        {video.url ? (
          <video
            ref={videoRef}
            src={video.url}
            controls
            className="aspect-video w-full rounded-xl bg-black"
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          />
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
            Não foi possível gerar link do vídeo.
          </div>
        )}
        {video.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{video.description}</p>}
      </SectionCard>

      <SectionCard title="Nova observação" description="Marque o instante e escreva a análise técnica">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr_180px]">
          <div>
            <Label className="text-xs">Tempo</Label>
            <div className="flex gap-1">
              <Input value={noteTime} onChange={(e) => setNoteTime(e.target.value)} placeholder="0:00" />
              <Button type="button" size="icon" variant="outline" onClick={captureNow} title="Capturar tempo atual">
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Título (opcional)</Label>
            <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Ex.: Entrada de single leg" />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs">Observação *</Label>
          <Textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Descreva a análise técnica deste momento…" />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            <Plus className="mr-2 h-4 w-4" />Adicionar observação
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Observações marcadas" description={`${video.notes.length} anotações`}>
        {video.notes.length === 0 ? (
          <EmptyState icon={Pencil} title="Sem observações" description="Adicione a primeira análise técnica acima." />
        ) : (
          <ol className="space-y-3">
            {video.notes.map((n: any) => (
              <li key={n.id} className="group flex gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all hover:border-primary/40">
                <button
                  onClick={() => seekTo(Number(n.timestamp_seconds))}
                  className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/20"
                  title="Ir para este momento"
                >
                  <Play className="h-3 w-3" />
                  <span className="mt-0.5 text-[11px] font-bold tabular-nums">{fmtTime(Number(n.timestamp_seconds))}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.title && <span className="text-sm font-semibold">{n.title}</span>}
                    {n.category && <Badge variant="outline" className="text-[10px]">{n.category}</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{n.note}</p>
                </div>
                <button
                  onClick={() => removeNote.mutate(n.id)}
                  className="ml-2 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  title="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </>
  );
}
