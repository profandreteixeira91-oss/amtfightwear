import { create } from "zustand";
import type { AnyElement, EditorSchema } from "./types";
import { makeId } from "./types";

type State = {
  schema: EditorSchema;
  selectedIds: string[];
  history: EditorSchema[];
  future: EditorSchema[];
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  snap: boolean;
  favorites: string[];
  recentVars: string[];
  editingId: string | null;
};


type Actions = {
  init: (schema: EditorSchema, favorites?: string[], recent?: string[]) => void;
  update: (patch: Partial<EditorSchema>) => void;
  addElement: (el: AnyElement) => void;
  patchElement: (id: string, patch: Partial<AnyElement>) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  moveLayer: (id: string, dir: "front" | "back" | "up" | "down") => void;
  select: (ids: string[]) => void;
  toggleFavorite: (v: string) => void;
  pushRecent: (v: string) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (z: number) => void;
  toggle: (k: "showGrid" | "showRulers" | "snap") => void;
};

const emptySchema: EditorSchema = {
  version: 2,
  page: { width: 1754, height: 1240, background: "#ffffff", margin: 40 },
  elements: [],
};

const commit = (s: State, next: EditorSchema): Partial<State> => ({
  schema: next,
  history: [...s.history.slice(-49), s.schema],
  future: [],
});

export const useEditor = create<State & Actions>((set, get) => ({
  schema: emptySchema,
  selectedIds: [],
  history: [],
  future: [],
  zoom: 0.5,
  showGrid: true,
  showRulers: true,
  snap: true,
  favorites: [],
  recentVars: [],

  init: (schema, favorites = [], recent = []) =>
    set({ schema, history: [], future: [], selectedIds: [], favorites, recentVars: recent }),

  update: (patch) => set((s) => commit(s, { ...s.schema, ...patch })),

  addElement: (el) => set((s) => {
    const z = Math.max(0, ...s.schema.elements.map((e) => e.z ?? 0)) + 1;
    return { ...commit(s, { ...s.schema, elements: [...s.schema.elements, { ...el, z }] }), selectedIds: [el.id] };
  }),

  patchElement: (id, patch) => set((s) => commit(s, {
    ...s.schema,
    elements: s.schema.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as AnyElement) : e)),
  })),

  removeElements: (ids) => set((s) => ({
    ...commit(s, { ...s.schema, elements: s.schema.elements.filter((e) => !ids.includes(e.id)) }),
    selectedIds: [],
  })),

  duplicateElements: (ids) => set((s) => {
    const clones = s.schema.elements
      .filter((e) => ids.includes(e.id))
      .map((e) => ({ ...e, id: makeId(), x: (e.x ?? 50) + 3, y: (e.y ?? 50) + 3, z: (e.z ?? 0) + 1 } as AnyElement));
    return {
      ...commit(s, { ...s.schema, elements: [...s.schema.elements, ...clones] }),
      selectedIds: clones.map((c) => c.id),
    };
  }),

  moveLayer: (id, dir) => set((s) => {
    const arr = [...s.schema.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const i = arr.findIndex((e) => e.id === id);
    if (i < 0) return {};
    const [item] = arr.splice(i, 1);
    if (dir === "front") arr.push(item);
    else if (dir === "back") arr.unshift(item);
    else if (dir === "up") arr.splice(Math.min(arr.length, i + 1), 0, item);
    else arr.splice(Math.max(0, i - 1), 0, item);
    const renumbered = arr.map((e, idx) => ({ ...e, z: idx + 1 } as AnyElement));
    return commit(s, { ...s.schema, elements: renumbered });
  }),

  select: (ids) => set({ selectedIds: ids }),

  toggleFavorite: (v) => set((s) => ({
    favorites: s.favorites.includes(v) ? s.favorites.filter((x) => x !== v) : [...s.favorites, v],
  })),

  pushRecent: (v) => set((s) => ({ recentVars: [v, ...s.recentVars.filter((x) => x !== v)].slice(0, 8) })),

  undo: () => set((s) => {
    if (!s.history.length) return {};
    const prev = s.history[s.history.length - 1];
    return { schema: prev, history: s.history.slice(0, -1), future: [s.schema, ...s.future] };
  }),

  redo: () => set((s) => {
    if (!s.future.length) return {};
    const [next, ...rest] = s.future;
    return { schema: next, history: [...s.history, s.schema], future: rest };
  }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
  toggle: (k) => set((s) => ({ [k]: !s[k] } as any)),
}));
