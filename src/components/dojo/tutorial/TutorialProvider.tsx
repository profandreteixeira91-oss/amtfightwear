import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { type TutorialTrack } from "@/lib/dojo/tutorial/tracks";
import { findTrack } from "@/lib/dojo/tutorial/custom-tracks";
import { TourOverlay } from "./TourOverlay";
import { ResumeTutorialDialog } from "./ResumeTutorialDialog";
import { TutorialAchievement } from "./TutorialAchievement";

const LS_KEY = "dojo-tutorial-state";

export type TutorialProgressMap = Record<string, { status: string; step: number }>;

type StoredSession = {
  trackId: string;
  stepIndex: number;
  route?: string;
  savedAt?: string;
};

type Ctx = {
  track: TutorialTrack | null;
  stepIndex: number;
  minimized: boolean;
  progress: TutorialProgressMap;
  /** Ação exigida pelo passo atual já foi cumprida? */
  actionDone: boolean;
  markActionDone: () => void;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  startedAt: number | null;
  start: (trackId: string, opts?: { demo?: boolean; step?: number }) => void;
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
  const [actionDone, setActionDone] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pendingResume, setPendingResume] = useState<StoredSession | null>(null);
  const [achievement, setAchievement] = useState<
    { title: string; steps: number; seconds: number; completed: number; total: number } | null
  >(null);
  const hydrated = useRef(false);

  const track = findTrack(trackId);

  /** Pergunta se deseja retomar quando existe sessão salva. */
  useEffect(() => {
    if (typeof window === "undefined" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.trackId && findTrack(parsed.trackId)) setPendingResume(parsed);
    } catch {
      /* ignora */
    }
  }, []);

  const persistLocal = useCallback(
    (id: string | null, step: number) => {
      if (typeof window === "undefined") return;
      if (!id) window.localStorage.removeItem(LS_KEY);
      else
        window.localStorage.setItem(
          LS_KEY,
          JSON.stringify({ trackId: id, stepIndex: step, route: pathname, savedAt: new Date().toISOString() }),
        );
    },
    [pathname],
  );

  const loadProgress = useCallback(async () => {
    const { data } = await supabase.from("dojo_tutorial_progress").select("track_id,status,step");
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
      await supabase.from("dojo_tutorial_progress").upsert(
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
      let target: string | null = null;
      for (let i = index; i >= 0; i--) {
        const r = t.steps[i]?.route;
        if (r) {
          target = r;
          break;
        }
      }
      target = target ?? t.route;
      if (target && target !== pathname) navigate({ to: target as any }).catch(() => {});
    },
    [navigate, pathname],
  );

  const start = useCallback(
    (id: string, opts?: { demo?: boolean; step?: number }) => {
      const t = findTrack(id);
      if (!t) return;
      const step = Math.min(Math.max(opts?.step ?? 0, 0), t.steps.length - 1);
      setPendingResume(null);
      setTrackId(id);
      setStepIndex(step);
      setActionDone(false);
      setMinimized(false);
      setDemoMode(Boolean(opts?.demo));
      setStartedAt(Date.now());
      persistLocal(id, step);
      void saveProgress(id, step, "in_progress");
      applyStepRoute(t, step);
    },
    [applyStepRoute, persistLocal, saveProgress],
  );

  const stop = useCallback(() => {
    setTrackId(null);
    setStepIndex(0);
    setActionDone(false);
    setDemoMode(false);
    setStartedAt(null);
    persistLocal(null, 0);
  }, [persistLocal]);

  const finish = useCallback(() => {
    if (trackId && track) {
      void saveProgress(trackId, track.steps.length - 1, "completed");
      const completedNow = Object.entries({ ...progress, [trackId]: { status: "completed", step: 0 } }).filter(
        ([, v]) => v.status === "completed",
      ).length;
      setAchievement({
        title: track.title,
        steps: track.steps.length,
        seconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
        completed: completedNow,
        total: 0,
      });
    }
    stop();
  }, [progress, saveProgress, startedAt, stop, track, trackId]);

  const goTo = useCallback(
    (i: number) => {
      if (!track) return;
      const clamped = Math.min(Math.max(i, 0), track.steps.length - 1);
      setStepIndex(clamped);
      setActionDone(false);
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
      actionDone,
      markActionDone: () => setActionDone(true),
      demoMode,
      setDemoMode,
      startedAt,
      start,
      next,
      prev,
      goTo,
      stop,
      finish,
      setMinimized,
      reloadProgress: () => void loadProgress(),
    }),
    [actionDone, demoMode, finish, goTo, loadProgress, minimized, next, prev, progress, start, startedAt, stepIndex, stop, track],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {track && <TourOverlay />}
      {pendingResume && !track && (
        <ResumeTutorialDialog
          session={pendingResume}
          onContinue={() => start(pendingResume.trackId, { step: pendingResume.stepIndex })}
          onRestart={() => start(pendingResume.trackId)}
          onCancel={() => {
            setPendingResume(null);
            persistLocal(null, 0);
          }}
        />
      )}
      {achievement && (
        <TutorialAchievement data={achievement} onClose={() => setAchievement(null)} />
      )}
    </TutorialContext.Provider>
  );
}
