import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { shortDate } from "@/components/ads-manager/helpers";
import { amDeleteImage, amListMedia, amUploadImage } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/midias")({
  component: MediaPage,
});

function MediaPage() {
  const qc = useQueryClient();
  const { accountId, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListMedia);
  const upload = useServerFn(amUploadImage);
  const remove = useServerFn(amDeleteImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "media", accountId, refreshKey],
    queryFn: () => list({ data: { ...(accountId ? { accountId } : {}) } }),
    retry: false,
  });

  const upMut = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
          reader.readAsDataURL(file);
        });
        await upload({ data: { ...(accountId ? { accountId } : {}), name: file.name, base64 } });
      }
    },
    onSuccess: () => {
      toast.success("Upload concluído");
      void qc.invalidateQueries({ queryKey: ["ads-manager", "media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (hash: string) => remove({ data: { ...(accountId ? { accountId } : {}), hash } }),
    onSuccess: () => {
      toast.success("Mídia removida");
      void qc.invalidateQueries({ queryKey: ["ads-manager", "media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const q = search.trim().toLowerCase();
  const images = useMemo(
    () => (data?.images ?? []).filter((i) => !q || i.name.toLowerCase().includes(q)),
    [data, q],
  );
  const videos = useMemo(
    () => (data?.videos ?? []).filter((v) => !q || v.name.toLowerCase().includes(q)),
    [data, q],
  );

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 break-words text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (files.length) upMut.mutate(files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border/60 bg-card/40"
        }`}
      >
        {upMut.isPending ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm font-semibold">Arraste imagens aqui</p>
        <p className="mt-1 text-xs text-muted-foreground">PNG ou JPG · upload múltiplo suportado</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
          disabled={upMut.isPending}
        >
          Selecionar arquivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upMut.mutate(files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{images.length} imagem(ns)</Badge>
        <Badge variant="outline">{videos.length} vídeo(s)</Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {images.map((i) => (
            <Card key={i.id} className="group min-w-0 overflow-hidden border-border/60 bg-card/60">
              <div className="relative">
                {i.thumbnail ? (
                  <img src={i.thumbnail} alt={i.name} loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square w-full place-items-center bg-muted/40">
                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => delMut.mutate(i.id)}
                  aria-label={`Excluir ${i.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardContent className="min-w-0 p-2">
                <p className="truncate text-xs font-medium" title={i.name}>
                  {i.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {i.size ?? "—"} · {shortDate(i.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
          {videos.map((v) => (
            <Card key={v.id} className="min-w-0 overflow-hidden border-border/60 bg-card/60">
              {v.thumbnail ? (
                <img src={v.thumbnail} alt={v.name} loading="lazy" className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square w-full place-items-center bg-muted/40">
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <CardContent className="min-w-0 p-2">
                <p className="truncate text-xs font-medium" title={v.name}>
                  {v.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {v.duration ? `${Math.round(v.duration)}s` : "vídeo"} · {shortDate(v.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
