/**
 * Trilhas criadas pelo administrador no editor interno de tutoriais.
 * Ficam salvas no navegador (localStorage) e entram no mesmo catálogo
 * das trilhas nativas.
 */
import { TUTORIAL_TRACKS, type TutorialTrack } from "./tracks";

const KEY = "dojo-tutorial-custom-tracks";
const FAV_KEY = "dojo-tutorial-favorites";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("dojo-tutorial-catalog"));
}

export function listCustomTracks(): TutorialTrack[] {
  return read<TutorialTrack[]>(KEY, []).map((t) => ({ ...t, custom: true }));
}

export function saveCustomTrack(track: TutorialTrack) {
  const all = read<TutorialTrack[]>(KEY, []);
  const idx = all.findIndex((t) => t.id === track.id);
  if (idx >= 0) all[idx] = { ...track, custom: true };
  else all.push({ ...track, custom: true });
  write(KEY, all);
}

export function deleteCustomTrack(id: string) {
  write(
    KEY,
    read<TutorialTrack[]>(KEY, []).filter((t) => t.id !== id),
  );
}

/** Catálogo completo: trilhas nativas + trilhas do editor. */
export function listAllTracks(): TutorialTrack[] {
  return [...TUTORIAL_TRACKS, ...listCustomTracks()];
}

export function findTrack(id: string | null | undefined): TutorialTrack | null {
  if (!id) return null;
  return listAllTracks().find((t) => t.id === id) ?? null;
}

export function listFavorites(): string[] {
  return read<string[]>(FAV_KEY, []);
}

export function toggleFavorite(id: string) {
  const favs = listFavorites();
  write(FAV_KEY, favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]);
}
