import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trophy, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TutorialAchievement({
  data,
  onClose,
}: {
  data: { title: string; steps: number; seconds: number; completed: number };
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const mins = Math.floor(data.seconds / 60);
  const secs = data.seconds % 60;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 z-[1300] w-[min(420px,calc(100vw-24px))] -translate-x-1/2 animate-scale-in">
      <div className="overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-red-700 via-red-800 to-neutral-950 p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              Tutorial concluído
            </div>
            <div className="truncate font-display text-base font-bold">{data.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-white/85">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {data.steps} passos
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {mins > 0 ? `${mins}min ` : ""}
                {secs}s
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> {data.completed} tutoriais dominados
              </span>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={onClose}>
            Ok
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
