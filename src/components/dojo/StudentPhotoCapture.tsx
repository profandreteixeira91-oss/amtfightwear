import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
};

export function StudentPhotoCapture({ value, onChange }: Props) {
  const [mode, setMode] = useState<"idle" | "camera">("idle");
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("idle");
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      // wait next tick for <video> to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e: any) {
      toast.error("Não foi possível acessar a câmera", { description: e?.message });
    }
  }

  async function uploadBlob(blob: Blob, ext = "jpg") {
    setUploading(true);
    try {
      const path = `students/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("dojo-students").upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("dojo-students").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error("Falha no upload", { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return;
    stopCamera();
    await uploadBlob(blob, "jpg");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    await uploadBlob(file, ext);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border bg-muted grid place-items-center">
          {value ? (
            <img src={value} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {mode === "idle" && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={startCamera} disabled={uploading}>
                <Camera className="mr-2 h-4 w-4" /> Usar webcam
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" /> Enviar arquivo
              </Button>
              {value && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(null)}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" /> Remover
                </Button>
              )}
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>

      {mode === "camera" && (
        <div className="rounded-lg border bg-black/5 p-3">
          <video
            ref={videoRef}
            playsInline
            muted
            className="mx-auto aspect-square w-full max-w-xs rounded-md bg-black object-cover"
          />
          <div className="mt-3 flex justify-center gap-2">
            <Button type="button" size="sm" onClick={capture} disabled={uploading}>
              <Camera className="mr-2 h-4 w-4" /> Capturar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
              <RefreshCw className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
