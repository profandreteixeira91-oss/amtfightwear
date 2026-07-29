import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getTrack, type TutorialTrack } from "@/lib/dojo/tutorial/tracks";
import { TourOverlay } from "./TourOverlay";

const LS_KEY = "dojo-tutorial-state";

export type TutorialProgressMap = Record<string, { status: string; step: number }>;

type Ctx = {
  track: TutorialTrack | null;
  stepIndex: number;
  minimized: boolean;
  progress: TutorialProgressMap;
  start: (trackId: string) => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  stop: () => void;
  finish: () => void;
  setMinimized: (v: boolean) => void;
  reloadProgress: () => void;
};

const TutorialContext = createContext<Ctx | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial precisa estar dentro de TutorialProvider");
  return ctx;
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [trackId, setTrackId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [progress, setProgress] = useState<TutorialProgressMap>({});
  const hydrated = useRef(false);

  const track = getTrack(trackId);

  // Restaura sessão do tutorial (mesma aba / reload)
  useEffect(() => {
    if (typeof window === "undefined" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { trackId?: string; stepIndex?: number };
        if (parsed?.trackId && getTrack(parsed.trackId)) {
          setTrackId(parsed.trackId);
          setStepIndex(Math.max(0, parsed.stepIndex ?? 0));
        }
      }
    } catch {
      /* ignora */
    }
  }, []);

  const persistLocal = useCallback((id: string | null, step: number) => {
    if (typeof window === "undefined") return;
    if (!id) window.localStorage.removeItem(LS_KEY);
    else window.localStorage.setItem(LS_KEY, JSON.stringify({ trackId: id, stepIndex: step }));
  }, []);

  const loadProgress = useCallback(async () => {
    const { data } = await supabase
      .from("dojo_tutorial_progress")
      .select("track_id,status,step");
    if (!data) return;
    const map: TutorialProgressMap = {};
    for (const row of data as any[]) map[row.track_id] = { status: row.status, step: row.step };
    setProgress(map);
  }, []);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const saveProgress = useCallback(
    async (id: string, step: number, status: "in_progress" | "completed") => {
      setProgress((p) => ({ ...p, [id]: { status, step } }));
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      await supabase
        .from("dojo_tutorial_progress")
        .upsert(
          {
            owner_id: auth.user.id,
            track_id: id,
            step,
            status,
            completed_at: status === "completed" ? new Date().toISOString() : null,
          } as any,
          { onConflict: "owner_id,track_id" },
        );
    },
    [],
  );

  const applyStepRoute = useCallback(
    (t: TutorialTrack, index: number) => {
      const target = t.steps[index]?.route ?? (index === 0 ? t.route : null);
      if (target && target !== pathname) navigate({ to: target as any }).catch(() => {});
    },
    [navigate, pathname],
  );

  const start = useCallback(
    (id: string) => {
      const t = getTrack(id);
      if (!t) return;
      setTrackId(id);
      setStepIndex(0);
      setMinimized(false);
      persistLocal(id, 0);
      void saveProgress(id, 0, "in_progress");
      if (t.route !== pathname) navigate({ to: t.route as any }).catch(() => {});
    },
    [navigate, pathname, persistLocal, saveProgress],
  );

  const stop = useCallback(() => {
    setTrackId(null);
    setStepIndex(0);
    persistLocal(null, 0);
  }, [persistLocal]);

  const finish = useCallback(() => {
    if (trackId) void saveProgress(trackId, (track?.steps.length ?? 1) - 1, "completed");
    stop();
  }, [saveProgress, stop, track, trackId]);

  const goTo = useCallback(
    (i: number) => {
      if (!track) return;
      const clamped = Math.min(Math.max(i, 0), track.steps.length - 1);
      setStepIndex(clamped);
      persistLocal(track.id, clamped);
      void saveProgress(track.id, clamped, "in_progress");
      applyStepRoute(track, clamped);
    },
    [applyStepRoute, persistLocal, saveProgress, track],
  );

  const next = useCallback(() => {
    if (!track) return;
    if (stepIndex >= track.steps.length - 1) {
      finish();
      return;
    }
    goTo(stepIndex + 1);
  }, [finish, goTo, stepIndex, track]);

  const prev = useCallback(() => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }, [goTo, stepIndex]);

  const value = useMemo<Ctx>(
    () => ({
      track,
      stepIndex,
      minimized,
      progress,
      start,
      next,
      prev,
      goTo,
      stop,
      finish,
      setMinimized,
      reloadProgress: () => void loadProgress(),
    }),
    [finish, goTo, loadProgress, minimized, next, prev, progress, start, stepIndex, stop, track],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {track && <TourOverlay />}
    </TutorialContext.Provider>
  );
}
