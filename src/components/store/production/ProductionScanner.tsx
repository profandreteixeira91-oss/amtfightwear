import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

/** Scanner de etiquetas da produção: lê o QR e abre o item na fila. */
export function ProductionScanner({
  open,
  onClose,
  onDecoded,
}: {
  open: boolean;
  onClose: () => void;
  onDecoded: (raw: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const decodedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    decodedRef.current = false;
    setError(null);
    setStarting(true);
    let cancelled = false;

    function tick() {
      if (decodedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const image = ctx.getImageData(0, 0, w, h);
      const code = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        decodedRef.current = true;
        onDecoded(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Câmera não disponível neste dispositivo.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setStarting(false);
        tick();
      } catch (e) {
        setStarting(false);
        setError(
          (e as { name?: string })?.name === "NotAllowedError"
            ? "Permita o acesso à câmera para escanear a etiqueta."
            : ((e as Error)?.message ?? "Não foi possível abrir a câmera."),
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onDecoded]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear etiqueta</DialogTitle>
          <DialogDescription>Aponte a câmera para o QR Code da ordem de produção.</DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
