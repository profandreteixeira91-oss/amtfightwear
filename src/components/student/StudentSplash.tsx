import { useEffect, useState } from "react";
import splashAsset from "@/assets/student-splash.png.asset.json";

const SESSION_KEY = "student-splash-shown";
const DURATION_MS = 2200;
const FADE_MS = 500;

export function StudentSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (!isStandalone) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    const fadeTimer = window.setTimeout(() => setFading(true), DURATION_MS);
    const hideTimer = window.setTimeout(() => setVisible(false), DURATION_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      <img
        src={splashAsset.url}
        alt=""
        className="max-h-full max-w-full object-contain"
        draggable={false}
      />
    </div>
  );
}
