import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle, RotateCcw, X } from "lucide-react";
import { findTrack } from "@/lib/dojo/tutorial/custom-tracks";
import { brDateTime } from "@/lib/format";

export function ResumeTutorialDialog({
  session,
  onContinue,
  onRestart,
  onCancel,
}: {
  session: { trackId: string; stepIndex: number; savedAt?: string };
  onContinue: () => void;
  onRestart: () => void;
  onCancel: () => void;
}) {
  const track = findTrack(session.trackId);
  if (!track) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deseja continuar de onde parou?</DialogTitle>
          <DialogDescription>
            Você estava no tutorial <strong>{track.title}</strong>, passo {session.stepIndex + 1} de{" "}
            {track.steps.length}
            {session.savedAt ? ` · ${brDateTime(session.savedAt)}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onCancel} className="gap-1.5">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button variant="outline" onClick={onRestart} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reiniciar
          </Button>
          <Button onClick={onContinue} className="gap-1.5">
            <PlayCircle className="h-4 w-4" /> Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
