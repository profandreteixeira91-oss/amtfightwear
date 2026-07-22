/**
 * Fila manual do Macro DM (armazenada em localStorage).
 * Permite adicionar leads da página /prospect/leads para envio guiado em /prospect/macro.
 */
const KEY = "prospect.macro.manual-queue.v1";
const EVENT = "prospect:macro-queue-changed";

function safeRead(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function safeWrite(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* ignore */ }
}

export function getMacroQueue(): string[] {
  return safeRead();
}

export function isInMacroQueue(id: string): boolean {
  return safeRead().includes(id);
}

export function addToMacroQueue(ids: string | string[]): number {
  const list = Array.isArray(ids) ? ids : [ids];
  const current = safeRead();
  const set = new Set(current);
  let added = 0;
  for (const id of list) {
    if (id && !set.has(id)) { set.add(id); added++; }
  }
  if (added > 0) safeWrite(Array.from(set));
  return added;
}

export function removeFromMacroQueue(ids: string | string[]): number {
  const list = Array.isArray(ids) ? ids : [ids];
  const drop = new Set(list);
  const next = safeRead().filter((id) => !drop.has(id));
  const removed = safeRead().length - next.length;
  safeWrite(next);
  return removed;
}

export function clearMacroQueue() {
  safeWrite([]);
}

/** Assine mudanças na fila (cross-tab via storage + intra-tab via CustomEvent). */
export function subscribeMacroQueue(cb: () => void): () => void {
  if (typeof window === "undefined") return () => { /* noop */ };
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  const onCustom = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom as EventListener);
  };
}
