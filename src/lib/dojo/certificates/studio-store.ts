import { create } from "zustand";
import type { EditorSchema, AnyElement } from "@/components/dojo/certificate-editor/types";
import { makeId } from "@/components/dojo/certificate-editor/types";

/** Page presets, sizes in px @ ~150dpi for good on-screen preview */
export const PAGE_PRESETS = {
  a4_landscape: { name: "A4 Paisagem", width: 1754, height: 1240 },
  a4_portrait: { name: "A4 Retrato", width: 1240, height: 1754 },
  letter_landscape: { name: "Carta Paisagem", width: 1650, height: 1275 },
  letter_portrait: { name: "Carta Retrato", width: 1275, height: 1650 },
  legal_landscape: { name: "Ofício Paisagem", width: 2100, height: 1275 },
  custom: { name: "Personalizado", width: 1754, height: 1240 },
} as const;
export type PagePreset = keyof typeof PAGE_PRESETS;

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

/** Fonts curated for certificates */
export const CERT_FONTS = [
  { family: "Playfair Display", label: "Playfair Display", category: "serif" },
  { family: "Cormorant Garamond", label: "Cormorant", category: "serif" },
  { family: "Cinzel", label: "Cinzel", category: "serif" },
  { family: "DM Serif Display", label: "DM Serif Display", category: "serif" },
  { family: "Libre Baskerville", label: "Libre Baskerville", category: "serif" },
  { family: "Merriweather", label: "Merriweather", category: "serif" },
  { family: "Great Vibes", label: "Great Vibes", category: "script" },
  { family: "Dancing Script", label: "Dancing Script", category: "script" },
  { family: "Pinyon Script", label: "Pinyon Script", category: "script" },
  { family: "Inter", label: "Inter", category: "sans" },
  { family: "Montserrat", label: "Montserrat", category: "sans" },
  { family: "Poppins", label: "Poppins", category: "sans" },
  { family: "Bebas Neue", label: "Bebas Neue", category: "display" },
  { family: "Oswald", label: "Oswald", category: "display" },
] as const;

const HISTORY_LIMIT = 60;
const cloneDoc = (d: EditorSchema): EditorSchema => JSON.parse(JSON.stringify(d));

export function emptyDoc(preset: PagePreset = "a4_landscape"): EditorSchema {
  const p = PAGE_PRESETS[preset];
  return {
    version: 2,
    page: { width: p.width, height: p.height, background: "#ffffff", margin: 60 },
    elements: [],
  };
}

export function starterDoc(): EditorSchema {
  const p = PAGE_PRESETS.a4_landscape;
  return {
    version: 2,
    page: { width: p.width, height: p.height, background: "#ffffff", margin: 60 },
    elements: [
      { id: makeId(), kind: "text", text: "CERTIFICADO", x: 50, y: 15, fontSize: 88, color: "#0f172a", bold: true, align: "center", fontFamily: "Cinzel", uppercase: true, z: 1 } as any,
      { id: makeId(), kind: "line", x: 50, y: 24, w: 40, h: 0.4, fill: "#b91c1c", z: 2 } as any,
      { id: makeId(), kind: "text", text: "Certificamos que", x: 50, y: 32, fontSize: 26, color: "#475569", align: "center", fontFamily: "Cormorant Garamond", z: 3 } as any,
      { id: makeId(), kind: "text", text: "{{aluno_nome}}", x: 50, y: 43, fontSize: 68, color: "#0f172a", bold: true, align: "center", fontFamily: "Playfair Display", z: 4 } as any,
      { id: makeId(), kind: "text", text: "concluiu com êxito a graduação de {{aluno_faixa}} em {{aluno_modalidade}}, demonstrando dedicação, disciplina e comprometimento com a arte marcial.", x: 50, y: 56, w: 70, fontSize: 22, color: "#334155", align: "center", fontFamily: "Cormorant Garamond", lineHeight: 1.5, z: 5 } as any,
      { id: makeId(), kind: "text", text: "{{data_atual}}", x: 30, y: 82, fontSize: 18, color: "#475569", align: "center", fontFamily: "Inter", z: 6 } as any,
      { id: makeId(), kind: "line", x: 30, y: 79, w: 20, h: 0.15, fill: "#334155", z: 7 } as any,
      { id: makeId(), kind: "text", text: "{{professor_nome}}", x: 70, y: 82, fontSize: 18, color: "#475569", align: "center", fontFamily: "Inter", bold: true, z: 8 } as any,
      { id: makeId(), kind: "line", x: 70, y: 79, w: 20, h: 0.15, fill: "#334155", z: 9 } as any,
    ],
  };
}

export type Selection = string[];

export type StudioState = {
  templateId: string | null;
  name: string;
  category: string;
  doc: EditorSchema;
  selection: Selection;
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapEnabled: boolean;
  clipboard: AnyElement[];
  history: EditorSchema[];
  historyIndex: number;
  dirty: boolean;
  lastSavedAt: number | null;

  // setters
  setName: (n: string) => void;
  setCategory: (c: string) => void;
  setTemplateId: (id: string | null) => void;
  setZoom: (z: number) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnap: () => void;
  setPage: (patch: Partial<EditorSchema["page"]>) => void;

  // doc mutations (all push history)
  addElement: (el: AnyElement, select?: boolean) => void;
  addElements: (els: AnyElement[]) => void;
  updateElement: (id: string, patch: Partial<AnyElement>) => void;
  updateSelected: (patch: Partial<AnyElement>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  renameElement: (id: string, name: string) => void;
  reorderElements: (order: string[]) => void;

  // selection
  select: (ids: Selection, additive?: boolean) => void;
  clearSelection: () => void;

  // clipboard
  copy: () => void;
  paste: () => void;

  // history
  pushHistory: (d?: EditorSchema) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;

  // loading
  loadDoc: (doc: EditorSchema, meta: { id: string | null; name: string; category?: string }) => void;
};

export const useStudioStore = create<StudioState>((set, get) => ({
  templateId: null,
  name: "Novo modelo",
  category: "graduacao",
  doc: starterDoc(),
  selection: [],
  zoom: 0.5,
  showGrid: false,
  showRulers: true,
  showGuides: true,
  snapEnabled: true,
  clipboard: [],
  history: [starterDoc()],
  historyIndex: 0,
  dirty: false,
  lastSavedAt: null,

  setName: (n) => set({ name: n, dirty: true }),
  setCategory: (c) => set({ category: c, dirty: true }),
  setTemplateId: (id) => set({ templateId: id }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(3, z)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  setPage: (patch) => {
    const s = get();
    const next = { ...s.doc, page: { ...s.doc.page, ...patch } };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },

  addElement: (el, select = true) => {
    const s = get();
    const maxZ = s.doc.elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
    const next: EditorSchema = { ...s.doc, elements: [...s.doc.elements, { ...el, z: maxZ + 1 }] };
    set({ doc: next, dirty: true, selection: select ? [el.id] : s.selection });
    get().pushHistory(next);
  },

  addElements: (els) => {
    const s = get();
    const maxZ = s.doc.elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
    const added = els.map((e, i) => ({ ...e, z: maxZ + i + 1 }));
    const next: EditorSchema = { ...s.doc, elements: [...s.doc.elements, ...added] };
    set({ doc: next, dirty: true, selection: added.map((e) => e.id) });
    get().pushHistory(next);
  },

  updateElement: (id, patch) => {
    const s = get();
    const next: EditorSchema = {
      ...s.doc,
      elements: s.doc.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as AnyElement) : e)),
    };
    set({ doc: next, dirty: true });
  },

  updateSelected: (patch) => {
    const s = get();
    if (!s.selection.length) return;
    const next: EditorSchema = {
      ...s.doc,
      elements: s.doc.elements.map((e) => (s.selection.includes(e.id) ? ({ ...e, ...patch } as AnyElement) : e)),
    };
    set({ doc: next, dirty: true });
  },

  deleteSelected: () => {
    const s = get();
    if (!s.selection.length) return;
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.filter((e) => !s.selection.includes(e.id)) };
    set({ doc: next, dirty: true, selection: [] });
    get().pushHistory(next);
  },

  duplicateSelected: () => {
    const s = get();
    if (!s.selection.length) return;
    const toClone = s.doc.elements.filter((e) => s.selection.includes(e.id));
    const clones = toClone.map((e) => ({ ...e, id: makeId(), x: e.x + 3, y: e.y + 3 })) as AnyElement[];
    const next: EditorSchema = { ...s.doc, elements: [...s.doc.elements, ...clones] };
    set({ doc: next, dirty: true, selection: clones.map((c) => c.id) });
    get().pushHistory(next);
  },

  bringForward: (id) => {
    const s = get();
    const els = [...s.doc.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const i = els.findIndex((e) => e.id === id);
    if (i < 0 || i >= els.length - 1) return;
    const a = els[i], b = els[i + 1];
    const za = a.z ?? 0, zb = b.z ?? 0;
    a.z = zb; b.z = za;
    const next: EditorSchema = { ...s.doc, elements: els };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },
  sendBackward: (id) => {
    const s = get();
    const els = [...s.doc.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const i = els.findIndex((e) => e.id === id);
    if (i <= 0) return;
    const a = els[i], b = els[i - 1];
    const za = a.z ?? 0, zb = b.z ?? 0;
    a.z = zb; b.z = za;
    const next: EditorSchema = { ...s.doc, elements: els };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },
  bringToFront: (id) => {
    const s = get();
    const maxZ = s.doc.elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.map((e) => (e.id === id ? { ...e, z: maxZ + 1 } : e)) };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },
  sendToBack: (id) => {
    const s = get();
    const minZ = s.doc.elements.reduce((m, e) => Math.min(m, e.z ?? 0), 0);
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.map((e) => (e.id === id ? { ...e, z: minZ - 1 } : e)) };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },
  toggleLock: (id) => {
    const s = get();
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)) };
    set({ doc: next, dirty: true });
  },
  toggleHidden: (id) => {
    const s = get();
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e)) };
    set({ doc: next, dirty: true });
  },
  renameElement: (id, name) => {
    const s = get();
    const next: EditorSchema = { ...s.doc, elements: s.doc.elements.map((e) => (e.id === id ? { ...e, name } : e)) };
    set({ doc: next, dirty: true });
  },
  reorderElements: (order) => {
    const s = get();
    const map = new Map(s.doc.elements.map((e) => [e.id, e]));
    const els = order.map((id, i) => ({ ...(map.get(id) as AnyElement), z: i + 1 })).filter(Boolean) as AnyElement[];
    const next: EditorSchema = { ...s.doc, elements: els };
    set({ doc: next, dirty: true });
    get().pushHistory(next);
  },

  select: (ids, additive = false) => {
    const s = get();
    set({ selection: additive ? Array.from(new Set([...s.selection, ...ids])) : ids });
  },
  clearSelection: () => set({ selection: [] }),

  copy: () => {
    const s = get();
    const cb = s.doc.elements.filter((e) => s.selection.includes(e.id));
    set({ clipboard: JSON.parse(JSON.stringify(cb)) });
  },
  paste: () => {
    const s = get();
    if (!s.clipboard.length) return;
    const clones = s.clipboard.map((e) => ({ ...e, id: makeId(), x: (e.x ?? 0) + 3, y: (e.y ?? 0) + 3 })) as AnyElement[];
    get().addElements(clones);
  },

  pushHistory: (d) => {
    const s = get();
    const doc = d ?? s.doc;
    const trimmed = s.history.slice(0, s.historyIndex + 1);
    trimmed.push(cloneDoc(doc));
    const overflow = Math.max(0, trimmed.length - HISTORY_LIMIT);
    const history = trimmed.slice(overflow);
    set({ history, historyIndex: history.length - 1 });
  },
  undo: () => {
    const s = get();
    if (s.historyIndex <= 0) return;
    const idx = s.historyIndex - 1;
    set({ historyIndex: idx, doc: cloneDoc(s.history[idx]), dirty: true, selection: [] });
  },
  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const idx = s.historyIndex + 1;
    set({ historyIndex: idx, doc: cloneDoc(s.history[idx]), dirty: true, selection: [] });
  },
  markSaved: () => set({ dirty: false, lastSavedAt: Date.now() }),

  loadDoc: (doc, meta) => {
    const clean = cloneDoc(doc);
    set({
      doc: clean,
      templateId: meta.id,
      name: meta.name,
      category: meta.category ?? "graduacao",
      selection: [],
      history: [clean],
      historyIndex: 0,
      dirty: false,
      lastSavedAt: null,
    });
  },
}));
