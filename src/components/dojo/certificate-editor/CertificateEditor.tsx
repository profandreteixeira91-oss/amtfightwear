import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useEditor } from "./store";
import type { AnyElement, EditorSchema, ImageElement, ShapeElement, TextElement, QrElement, DateElement, SigBlockElement } from "./types";
import { ALL_VARIABLES, VARIABLE_CATEGORIES, makeId } from "./types";
import { qrDataUrl, substitute, systemValues } from "./qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toPng, toJpeg } from "html-to-image";
import {
  Save, Undo2, Redo2, Eye, Copy, Printer, FileDown, Grid3x3, Ruler, Magnet,
  ZoomIn, ZoomOut, Type as TypeIcon, Image as ImageIcon, Square, Circle as CircleIcon,
  Minus, QrCode, Calendar as CalIcon, PenLine, Trash2, Lock, Unlock, Eye as EyeIcon, EyeOff,
  ChevronsUp, ChevronsDown, ArrowUp, ArrowDown, Star, Search, LayoutTemplate, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronRight, Upload, Variable,
  Maximize2,
} from "lucide-react";


type Props = {
  initialSchema: EditorSchema;
  initialFavorites?: string[];
  initialRecent?: string[];
  name: string;
  category?: string;
  isDefault?: boolean;
  values?: Record<string, string>;
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDefaultChange: (v: boolean) => void;
  onSave: (payload: { schema: EditorSchema; favorites: string[]; recent: string[] }) => Promise<void> | void;
  onPreview: () => void;
  onDuplicate?: () => void;
  saving?: boolean;
};


// Canvas: renders the schema for editing. We work in percent so preview stays consistent.
export function CertificateEditor(props: Props) {
  const {
    schema, selectedIds, zoom, showGrid, showRulers, snap, favorites, recentVars,
    init, addElement, patchElement, removeElements, duplicateElements, moveLayer, select,
    toggleFavorite, pushRecent, undo, redo, setZoom, toggle, update,
  } = useEditor();

  useEffect(() => {
    init(props.initialSchema, props.initialFavorites, props.initialRecent);
  }, [props.initialSchema]); // eslint-disable-line

  // Auto-save debounce
  const dirty = useRef(false);
  useEffect(() => { dirty.current = true; }, [schema]);
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current) {
        dirty.current = false;
        props.onSave({ schema, favorites, recent: recentVars });
      }
    }, 4000);
    return () => clearInterval(t);
  }, [schema, favorites, recentVars]); // eslint-disable-line

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any).isContentEditable)) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (cmd && (e.key === "y" || (e.shiftKey && e.key === "Z" || (e.shiftKey && e.key === "z")))) { e.preventDefault(); redo(); }
      else if (cmd && e.key === "d") { e.preventDefault(); if (selectedIds.length) duplicateElements(selectedIds); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length) { e.preventDefault(); removeElements(selectedIds); }
      } else if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key) && selectedIds.length) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.2;
        selectedIds.forEach((id) => {
          const el = schema.elements.find((x) => x.id === id);
          if (!el) return;
          const nx = el.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0);
          const ny = el.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0);
          patchElement(id, { x: nx, y: ny });
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, schema.elements]); // eslint-disable-line

  const insertNew = (kind: AnyElement["kind"], extra: Partial<AnyElement> = {}) => {
    const id = makeId();
    const common = { id, x: 50, y: 50, opacity: 1, rotation: 0 };
    let el: AnyElement;
    switch (kind) {
      case "text":
        el = { ...common, kind: "text", text: "Certificamos que", fontSize: 32, color: "#111", align: "center", ...extra } as TextElement; break;
      case "image":
      case "logo":
      case "signature":
        el = { ...common, kind, imageUrl: "", w: 20, h: 10, fit: "contain", name: kind === "logo" ? "Logo" : kind === "signature" ? "Assinatura" : "Imagem", ...extra } as ImageElement; break;
      case "rect":
        el = { ...common, kind: "rect", w: 20, h: 5, fill: "#dc2626", stroke: "transparent", strokeWidth: 0, radius: 4, ...extra } as ShapeElement; break;
      case "circle":
        el = { ...common, kind: "circle", w: 10, h: 10, fill: "#dc2626", ...extra } as ShapeElement; break;
      case "line":
        el = { ...common, kind: "line", w: 30, h: 0.4, fill: "#111", ...extra } as ShapeElement; break;
      case "qr":
        el = { ...common, kind: "qr", qrValue: "{{certificado_validacao}}", w: 10, h: 15, color: "#000", bg: "#fff", ...extra } as QrElement; break;
      case "date":
        el = { ...common, kind: "date", format: "long", fontSize: 22, color: "#111", align: "center", ...extra } as DateElement; break;
      case "signature-block":
        el = { ...common, kind: "signature-block", w: 25, h: 12, personName: "Nome do Professor", personRole: "Faixa Preta 2º grau", showLine: true, color: "#111", ...extra } as SigBlockElement; break;
      default:
        return;
    }
    addElement(el);
  };

  const insertVariable = (key: string) => {
    pushRecent(key);
    const sel = schema.elements.find((e) => e.id === selectedIds[0]);
    if (sel && sel.kind === "text") {
      patchElement(sel.id, { text: (sel.text || "") + `{{${key}}}` } as any);
    } else {
      insertNew("text", { text: `{{${key}}}` } as any);
    }
  };

  const exportPng = async () => {
    const node = document.getElementById("cert-canvas-inner");
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      downloadDataUrl(dataUrl, `${props.name || "certificado"}.png`);
    } catch (e: any) { toast.error("Erro ao exportar PNG: " + e.message); }
  };
  const exportJpeg = async () => {
    const node = document.getElementById("cert-canvas-inner");
    if (!node) return;
    try {
      const dataUrl = await toJpeg(node, { cacheBust: true, pixelRatio: 2, quality: 0.95, backgroundColor: "#fff" });
      downloadDataUrl(dataUrl, `${props.name || "certificado"}.jpg`);
    } catch (e: any) { toast.error("Erro ao exportar JPG: " + e.message); }
  };

  const sortedByZ = useMemo(() => [...schema.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [schema.elements]);
  const selectedEl = schema.elements.find((e) => e.id === selectedIds[0]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border border-border bg-background">
      {/* TOPBAR */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2 text-sm">
        <Input value={props.name} onChange={(e) => props.onNameChange(e.target.value)} className="h-8 w-56" placeholder="Nome do modelo" />
        <select value={props.category ?? "personalizado"} onChange={(e) => props.onCategoryChange(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          <option value="graduacao">Graduação</option>
          <option value="seminario">Seminário</option>
          <option value="curso">Curso</option>
          <option value="participacao">Participação</option>
          <option value="evento">Evento</option>
          <option value="personalizado">Personalizado</option>
        </select>
        <label className="ml-1 flex items-center gap-1 text-xs">
          <input type="checkbox" checked={!!props.isDefault} onChange={(e) => props.onDefaultChange(e.target.checked)} />
          Padrão
        </label>

        <div className="mx-2 h-6 w-px bg-border" />

        <TB icon={Undo2} label="Desfazer" onClick={undo} />
        <TB icon={Redo2} label="Refazer" onClick={redo} />
        <TB icon={Copy} label="Duplicar template" onClick={() => props.onDuplicate?.()} disabled={!props.onDuplicate} />

        <div className="mx-2 h-6 w-px bg-border" />

        <TB icon={Grid3x3} label="Grade" active={showGrid} onClick={() => toggle("showGrid")} />
        <TB icon={Ruler} label="Réguas" active={showRulers} onClick={() => toggle("showRulers")} />
        <TB icon={Magnet} label="Snap" active={snap} onClick={() => toggle("snap")} />

        <div className="mx-2 h-6 w-px bg-border" />

        <TB icon={ZoomOut} label="Menos zoom" onClick={() => setZoom(zoom - 0.1)} />
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
        </select>
        <TB icon={ZoomIn} label="Mais zoom" onClick={() => setZoom(zoom + 0.1)} />

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={props.onPreview}><Eye className="h-4 w-4 mr-1" /> Visualizar</Button>
        <Button size="sm" variant="outline" onClick={exportPng}><FileDown className="h-4 w-4 mr-1" /> PNG</Button>
        <Button size="sm" variant="outline" onClick={exportJpeg}><FileDown className="h-4 w-4 mr-1" /> JPG</Button>
        <Button size="sm" variant="outline" onClick={props.onPreview}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
        <Button size="sm" onClick={() => props.onSave({ schema, favorites, recent: recentVars })} disabled={props.saving}>
          <Save className="h-4 w-4 mr-1" /> {props.saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PALETTE */}
        <LeftPalette onInsert={insertNew} onInsertVariable={insertVariable} />

        {/* CANVAS */}
        <CanvasArea
          schema={schema} selectedIds={selectedIds} sortedByZ={sortedByZ}
          zoom={zoom} showGrid={showGrid} showRulers={showRulers} snap={snap}
          onSelect={select} onPatch={patchElement} onBgChange={(p) => update({ page: { ...schema.page, ...p } })}
          previewValues={props.values}
        />


        {/* RIGHT INSPECTOR */}
        <RightInspector
          selectedEl={selectedEl} sortedByZ={sortedByZ} selectedIds={selectedIds}
          onPatch={(patch) => selectedEl && patchElement(selectedEl.id, patch)}
          onSelect={select} onRemove={(ids) => removeElements(ids)} onMoveLayer={moveLayer}
          onPageChange={(p) => update({ page: { ...schema.page, ...p } })} page={schema.page}
        />
      </div>
    </div>
  );
}

function TB({ icon: Icon, label, onClick, active, disabled }: { icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 ${active ? "border-primary bg-primary/10 text-primary" : "border-transparent"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- LEFT PALETTE ---------- */

function LeftPalette({ onInsert, onInsertVariable }: { onInsert: (k: AnyElement["kind"], e?: Partial<AnyElement>) => void; onInsertVariable: (k: string) => void }) {
  const [tab, setTab] = useState<"elements" | "vars">("elements");
  return (
    <div className="w-60 shrink-0 border-r border-border bg-card">
      <div className="flex border-b border-border">
        <TabBtn active={tab === "elements"} onClick={() => setTab("elements")}><LayoutTemplate className="h-3.5 w-3.5" /> Elementos</TabBtn>
        <TabBtn active={tab === "vars"} onClick={() => setTab("vars")}><Variable className="h-3.5 w-3.5" /> Variáveis</TabBtn>
      </div>
      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
        {tab === "elements" ? <ElementsPalette onInsert={onInsert} /> : <VariablesPalette onInsert={onInsertVariable} />}
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors ${active ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function ElementsPalette({ onInsert }: { onInsert: (k: AnyElement["kind"], e?: Partial<AnyElement>) => void }) {
  const items: { k: AnyElement["kind"]; label: string; icon: any; extra?: any }[] = [
    { k: "text", label: "Texto", icon: TypeIcon },
    { k: "image", label: "Imagem", icon: ImageIcon },
    { k: "logo", label: "Logo", icon: ImageIcon },
    { k: "signature", label: "Assinatura (imagem)", icon: PenLine },
    { k: "signature-block", label: "Bloco de assinatura", icon: PenLine },
    { k: "line", label: "Linha", icon: Minus },
    { k: "rect", label: "Retângulo", icon: Square },
    { k: "circle", label: "Círculo", icon: CircleIcon },
    { k: "qr", label: "QR Code", icon: QrCode },
    { k: "date", label: "Data", icon: CalIcon },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((it) => (
        <button
          key={it.label}
          onClick={() => onInsert(it.k, it.extra)}
          className="dojo-card flex flex-col items-center gap-1 rounded-md border border-border bg-background p-2 text-[11px] transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
        >
          <it.icon className="h-4 w-4" />
          <span className="text-center leading-tight">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function VariablesPalette({ onInsert }: { onInsert: (k: string) => void }) {
  const { favorites, recentVars, toggleFavorite } = useEditor();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ aluno: true, certificado: true });
  const filter = (label: string, key: string) => !q || `${label} ${key}`.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar variável" className="h-8 pl-7 text-xs" />
      </div>

      {favorites.length > 0 && (
        <VarGroup title="⭐ Favoritas" defaultOpen>
          {favorites.map((k) => {
            const v = ALL_VARIABLES.find((x) => x.key === k);
            if (!v) return null;
            return <VarRow key={k} v={v} onInsert={onInsert} favorite onToggleFav={() => toggleFavorite(k)} />;
          })}
        </VarGroup>
      )}
      {recentVars.length > 0 && (
        <VarGroup title="Recentes" defaultOpen>
          {recentVars.map((k) => {
            const v = ALL_VARIABLES.find((x) => x.key === k);
            if (!v) return null;
            return <VarRow key={k} v={v} onInsert={onInsert} favorite={favorites.includes(k)} onToggleFav={() => toggleFavorite(k)} />;
          })}
        </VarGroup>
      )}

      {VARIABLE_CATEGORIES.map((cat) => {
        const items = cat.items.filter((v) => filter(v.label, v.key));
        if (!items.length) return null;
        return (
          <div key={cat.id}>
            <button onClick={() => setOpen({ ...open, [cat.id]: !open[cat.id] })} className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {open[cat.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {cat.label}
            </button>
            {open[cat.id] && items.map((v) => (
              <VarRow key={v.key} v={v} onInsert={onInsert} favorite={favorites.includes(v.key)} onToggleFav={() => toggleFavorite(v.key)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function VarGroup({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: any }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && children}
    </div>
  );
}

function VarRow({ v, onInsert, favorite, onToggleFav }: { v: { key: string; label: string }; onInsert: (k: string) => void; favorite?: boolean; onToggleFav: () => void }) {
  return (
    <div
      onDoubleClick={() => onInsert(v.key)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/x-cert-var", v.key)}
      className="group flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
    >
      <div className="min-w-0 flex-1 cursor-grab">
        <div className="truncate font-medium text-foreground">{v.label}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{`{{${v.key}}}`}</div>
      </div>
      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
        <button title="Favoritar" onClick={onToggleFav} className="grid h-6 w-6 place-items-center rounded hover:bg-background">
          <Star className={`h-3 w-3 ${favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
        </button>
        <button title="Inserir" onClick={() => onInsert(v.key)} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary hover:text-primary-foreground">
          Inserir
        </button>
      </div>
    </div>
  );
}

/* ---------- CANVAS ---------- */

function CanvasArea({
  schema, selectedIds, sortedByZ, zoom, showGrid, showRulers, snap, onSelect, onPatch, onBgChange, previewValues,
}: {
  schema: EditorSchema; selectedIds: string[]; sortedByZ: AnyElement[];
  zoom: number; showGrid: boolean; showRulers: boolean; snap: boolean;
  onSelect: (ids: string[]) => void;
  onPatch: (id: string, patch: Partial<AnyElement>) => void;
  onBgChange: (p: Partial<EditorSchema["page"]>) => void;
  previewValues?: Record<string, string>;
}) {
  const W = schema.page.width;
  const H = schema.page.height;
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrapRef} className="relative flex-1 overflow-auto bg-[color:var(--dojo-surface-2,#f4f4f5)] p-8">
      {showRulers && <Rulers W={W} H={H} zoom={zoom} />}
      <div className="mx-auto" style={{ paddingLeft: showRulers ? 24 : 0, paddingTop: showRulers ? 24 : 0 }}>
        <div
          id="cert-canvas-inner"
          onClick={(e) => { if (e.target === e.currentTarget) onSelect([]); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {

            const key = e.dataTransfer.getData("text/x-cert-var");
            if (!key) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            const el: TextElement = {
              id: makeId(), kind: "text", text: `{{${key}}}`, fontSize: 28, color: "#111",
              align: "left", x, y, rotation: 0, opacity: 1,
            };
            useEditor.getState().addElement(el);
          }}
          className="relative shadow-xl"
          style={{
            width: W * zoom, height: H * zoom,
            background: schema.page.background ?? "#fff",
            backgroundImage: schema.page.backgroundUrl ? `url(${schema.page.backgroundUrl})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        >
          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)",
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              }}
            />
          )}
          {sortedByZ.map((el) => (
            <ElementView
              key={el.id} el={el} W={W} H={H} zoom={zoom} snap={snap}
              selected={selectedIds.includes(el.id)}
              onSelect={(id, additive) => onSelect(additive ? Array.from(new Set([...selectedIds, id])) : [id])}
              onPatch={(patch) => onPatch(el.id, patch)}
              allElements={sortedByZ}
              previewValues={previewValues}
            />

          ))}
        </div>
      </div>
    </div>
  );
}

function Rulers({ W, H, zoom }: { W: number; H: number; zoom: number }) {
  const ticksX = [];
  const ticksY = [];
  const step = 100; // px in canvas units
  for (let i = 0; i * step < W; i++) ticksX.push(i);
  for (let i = 0; i * step < H; i++) ticksY.push(i);
  return (
    <>
      <div className="pointer-events-none absolute left-8 right-8 top-8 h-6 border-b border-border bg-card text-[9px] text-muted-foreground">
        <div className="relative h-full" style={{ width: W * zoom, marginLeft: 24 }}>
          {ticksX.map((i) => (
            <div key={i} className="absolute top-0 h-full border-l border-border pl-1" style={{ left: i * step * zoom }}>{i * step}</div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-8 left-8 top-14 w-6 border-r border-border bg-card text-[9px] text-muted-foreground">
        <div className="relative w-full" style={{ height: H * zoom }}>
          {ticksY.map((i) => (
            <div key={i} className="absolute left-0 w-full border-t border-border pl-0.5" style={{ top: i * step * zoom }}>{i * step}</div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- ELEMENT RENDER + INTERACTIONS ---------- */

function ElementView({
  el, W, H, zoom, snap, selected, onSelect, onPatch, allElements, previewValues,
}: {
  el: AnyElement; W: number; H: number; zoom: number; snap: boolean;
  selected: boolean; onSelect: (id: string, additive: boolean) => void;
  onPatch: (patch: Partial<AnyElement>) => void; allElements: AnyElement[];
  previewValues?: Record<string, string>;
}) {

  if (el.hidden) return null;

  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    if (el.kind === "qr") { qrDataUrl(el.qrValue, { color: el.color, bg: el.bg }).then(setQr); }
  }, [el]);

  const wPct = (el as any).w ?? 20;
  const hPct = (el as any).h ?? 10;
  const isText = el.kind === "text" || el.kind === "date";
  const hasExplicitW = typeof (el as any).w === "number";
  const hasExplicitH = typeof (el as any).h === "number";
  // Auto width for text if none set: use natural
  const style: CSSProperties = {
    position: "absolute",
    left: `${el.x}%`, top: `${el.y}%`,
    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
    opacity: el.opacity ?? 1,
    outline: selected ? "2px solid hsl(var(--primary))" : el.locked ? "1px dashed rgba(0,0,0,0.2)" : undefined,
    outlineOffset: selected ? 1 : 0,
    cursor: el.locked ? "not-allowed" : "move",
    zIndex: el.z,
    width: isText ? (hasExplicitW ? `${wPct}%` : "auto") : `${wPct}%`,
    height: isText ? (hasExplicitH ? `${hPct}%` : "auto") : `${hPct}%`,
    maxWidth: isText && !hasExplicitW ? "90%" : undefined,
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (el.locked) return;
    e.stopPropagation();
    onSelect(el.id, e.shiftKey);
    const parent = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    const startX = e.clientX; const startY = e.clientY;
    const origX = el.x; const origY = el.y;
    const others = allElements.filter((o) => o.id !== el.id);
    const move = (m: MouseEvent) => {
      let nx = origX + ((m.clientX - startX) / parent.width) * 100;
      let ny = origY + ((m.clientY - startY) / parent.height) * 100;
      if (snap) {
        for (const o of others) {
          if (Math.abs(o.x - nx) < 0.8) nx = o.x;
          if (Math.abs(o.y - ny) < 0.8) ny = o.y;
        }
        nx = Math.round(nx * 10) / 10;
        ny = Math.round(ny * 10) / 10;
      }
      onPatch({ x: Math.max(0, Math.min(100, nx)), y: Math.max(0, Math.min(100, ny)) });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  };

  const onResizeDown = (e: React.MouseEvent, corner: "se" | "sw" | "ne" | "nw" | "e" | "w" | "n" | "s") => {
    if (el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const elNode = (e.currentTarget as HTMLElement).parentElement!;
    const parent = elNode.parentElement!.getBoundingClientRect();
    const startX = e.clientX; const startY = e.clientY;
    const rect = elNode.getBoundingClientRect();
    const origW = hasExplicitW ? wPct : (rect.width / parent.width) * 100;
    const origH = hasExplicitH ? hPct : (rect.height / parent.height) * 100;
    const origFontSize = (el as any).fontSize ?? 24;
    const isCorner = corner.length === 2;
    const shiftKey = e.shiftKey;
    const move = (m: MouseEvent) => {
      const dx = ((m.clientX - startX) / parent.width) * 100;
      const dy = ((m.clientY - startY) / parent.height) * 100;
      const dir = corner.includes("e") ? 1 : corner.includes("w") ? -1 : 0;
      const dirY = corner.includes("s") ? 1 : corner.includes("n") ? -1 : 0;
      const patch: any = {};
      if (isText) {
        if (dir !== 0) patch.w = Math.max(2, origW + dx * dir);
        if (dirY !== 0 || isCorner) {
          const scale = 1 + (dy * dirY) / Math.max(1, origH);
          patch.fontSize = Math.max(6, Math.round(origFontSize * scale));
        }
        if (isCorner && shiftKey) {
          const scale = 1 + (dx * dir) / Math.max(1, origW);
          patch.fontSize = Math.max(6, Math.round(origFontSize * scale));
          patch.w = Math.max(2, origW + dx * dir);
        }
      } else {
        let nw = dir !== 0 ? Math.max(0.5, origW + dx * dir) : origW;
        let nh = dirY !== 0 ? Math.max(0.2, origH + dy * dirY) : origH;
        if (isCorner && shiftKey) {
          const ratio = origW / Math.max(0.01, origH);
          const scale = Math.max(nw / origW, nh / origH);
          nw = origW * scale;
          nh = (origW * scale) / ratio;
        }
        patch.w = nw;
        patch.h = nh;
      }
      onPatch(patch);
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  };

  const values = useMemo(() => {
    const v: Record<string, string> = { ...systemValues() };
    ALL_VARIABLES.forEach((x) => { if (!(x.key in v)) v[x.key] = x.sample ? `[${x.sample}]` : `{{${x.key}}}`; });
    if (previewValues) Object.assign(v, previewValues);
    return v;
  }, [previewValues]);


  return (
    <div style={style} onMouseDown={onMouseDown} onDoubleClick={(e) => { e.stopPropagation(); }}>
      {renderInner(el, qr, values, zoom, W)}
      {selected && !el.locked && (
        <>
          {(["nw","n","ne","e","se","s","sw","w"] as const).map((c) => (
            <div
              key={c}
              onMouseDown={(e) => onResizeDown(e, c)}
              title={c.length === 2 ? "Livre (Shift: proporcional)" : (c === "n" || c === "s") ? "Vertical" : "Horizontal"}
              className="absolute h-3 w-3 rounded-full border-2 border-primary bg-background shadow-md hover:scale-125 transition-transform"
              style={handleStyle(c)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function handleStyle(corner: string): CSSProperties {
  const map: Record<string, CSSProperties> = {
    nw: { top: -4, left: -4, cursor: "nwse-resize" },
    n:  { top: -4, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    ne: { top: -4, right: -4, cursor: "nesw-resize" },
    e:  { top: "50%", right: -4, transform: "translateY(-50%)", cursor: "ew-resize" },
    se: { bottom: -4, right: -4, cursor: "nwse-resize" },
    s:  { bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
    sw: { bottom: -4, left: -4, cursor: "nesw-resize" },
    w:  { top: "50%", left: -4, transform: "translateY(-50%)", cursor: "ew-resize" },
  };
  return map[corner];
}

function renderInner(el: AnyElement, qr: string, values: Record<string, string>, zoom: number, W: number): any {
  if (el.kind === "text") {
    const content = substitute(el.text, values);
    return (
      <div style={{
        fontSize: `${el.fontSize * zoom}px`, color: el.color,
        fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? "italic" : undefined,
        textDecoration: el.underline ? "underline" : undefined,
        textTransform: el.uppercase ? "uppercase" : undefined,
        textAlign: el.align, fontFamily: el.fontFamily,
        lineHeight: el.lineHeight ?? 1.2, letterSpacing: el.letterSpacing,
        whiteSpace: "pre-wrap", padding: "2px 4px", pointerEvents: "none",
      }}>
        {content || "Texto"}
      </div>
    );
  }
  if (el.kind === "date") {
    const now = new Date();
    const s = el.format === "long"
      ? now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : el.format === "iso" ? now.toISOString().slice(0, 10)
      : now.toLocaleDateString("pt-BR");
    return (
      <div style={{
        fontSize: `${el.fontSize * zoom}px`, color: el.color,
        fontWeight: el.bold ? 700 : 400, textAlign: el.align, fontFamily: el.fontFamily,
        padding: "2px 4px", pointerEvents: "none",
      }}>{s}</div>
    );
  }
  if (el.kind === "image" || el.kind === "logo" || el.kind === "signature") {
    return el.imageUrl
      ? <img src={el.imageUrl} className="h-full w-full pointer-events-none" style={{ objectFit: el.fit ?? "contain" }} alt="" />
      : <div className="flex h-full w-full items-center justify-center border border-dashed border-muted-foreground/40 bg-muted/50 text-[10px] text-muted-foreground">{el.kind === "logo" ? "Logo" : el.kind === "signature" ? "Assinatura" : "Imagem"}</div>;
  }
  if (el.kind === "rect") {
    return <div style={{ width: "100%", height: "100%", background: el.fill, border: `${el.strokeWidth ?? 0}px solid ${el.stroke ?? "transparent"}`, borderRadius: el.radius ?? 0 }} />;
  }
  if (el.kind === "circle") {
    return <div style={{ width: "100%", height: "100%", background: el.fill, border: `${el.strokeWidth ?? 0}px solid ${el.stroke ?? "transparent"}`, borderRadius: "9999px" }} />;
  }
  if (el.kind === "line") {
    return <div style={{ width: "100%", height: "100%", background: el.fill ?? "#111" }} />;
  }
  if (el.kind === "qr") {
    return qr
      ? <img src={qr} className="h-full w-full pointer-events-none" style={{ objectFit: "contain" }} alt="QR" />
      : <div className="grid h-full w-full place-items-center bg-muted text-[10px]">QR…</div>;
  }
  if (el.kind === "signature-block") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-end gap-0.5 text-center" style={{ color: el.color }}>
        {el.imageUrl && <img src={el.imageUrl} className="min-h-[40%] max-h-[70%] max-w-full flex-1" style={{ objectFit: "contain" }} alt="Assinatura" crossOrigin="anonymous" />}
        {el.showLine !== false && <div className="w-full border-t border-current" />}
        <div className="text-[10px] font-semibold" style={{ fontSize: `${9 * zoom}px` }}>{el.personName || "Nome"}</div>
        {el.personRole && <div className="text-[9px] opacity-70" style={{ fontSize: `${8 * zoom}px` }}>{el.personRole}</div>}
      </div>
    );
  }

  return null;
}

/* ---------- RIGHT INSPECTOR ---------- */

function RightInspector({
  selectedEl, sortedByZ, selectedIds, onPatch, onSelect, onRemove, onMoveLayer, onPageChange, page,
}: {
  selectedEl: AnyElement | undefined; sortedByZ: AnyElement[]; selectedIds: string[];
  onPatch: (patch: Partial<AnyElement>) => void;
  onSelect: (ids: string[]) => void;
  onRemove: (ids: string[]) => void;
  onMoveLayer: (id: string, dir: "front" | "back" | "up" | "down") => void;
  onPageChange: (p: Partial<EditorSchema["page"]>) => void;
  page: EditorSchema["page"];
}) {
  const [tab, setTab] = useState<"props" | "layers" | "page">("props");
  useEffect(() => { if (selectedEl) setTab("props"); }, [selectedEl?.id]); // eslint-disable-line
  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex border-b border-border">
        <TabBtn active={tab === "props"} onClick={() => setTab("props")}>Propriedades</TabBtn>
        <TabBtn active={tab === "layers"} onClick={() => setTab("layers")}>Camadas</TabBtn>
        <TabBtn active={tab === "page"} onClick={() => setTab("page")}>Página</TabBtn>
      </div>
      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-3 text-xs">
        {tab === "props" && (selectedEl ? <PropsPanel el={selectedEl} onPatch={onPatch} onMoveLayer={onMoveLayer} onRemove={() => onRemove([selectedEl.id])} /> : <div className="py-6 text-center text-muted-foreground">Selecione um elemento para editar</div>)}
        {tab === "layers" && <LayersPanel elements={sortedByZ} selectedIds={selectedIds} onSelect={onSelect} onPatch={onPatch as any} onMoveLayer={onMoveLayer} />}
        {tab === "page" && <PagePanel page={page} onChange={onPageChange} />}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2 py-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function PropsPanel({ el, onPatch, onMoveLayer, onRemove }: { el: AnyElement; onPatch: (p: Partial<AnyElement>) => void; onMoveLayer: (id: string, dir: "front"|"back"|"up"|"down") => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem válida");
      if (file.size > 10 * 1024 * 1024) throw new Error("Imagem excede 10MB");
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const safeExt = ext || "png";
      const path = `certificates/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      // Pre-load to ensure image is available before applying (avoids blank canvas)
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
      onPatch({ imageUrl: url } as any);
      toast.success("Imagem enviada");
    } catch (e: any) {
      console.error("[certificate upload]", e);
      toast.error(e?.message || "Falha no upload");
    }
    finally { setUploading(false); }
  };


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{el.kind}</div>
        <div className="flex items-center gap-0.5">
          <IconBtn title="Recuar" onClick={() => onMoveLayer(el.id, "back")}><ChevronsDown className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title="Avançar" onClick={() => onMoveLayer(el.id, "front")}><ChevronsUp className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title={el.locked ? "Desbloquear" : "Bloquear"} onClick={() => onPatch({ locked: !el.locked } as any)}>{el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</IconBtn>
          <IconBtn title={el.hidden ? "Mostrar" : "Ocultar"} onClick={() => onPatch({ hidden: !el.hidden } as any)}>{el.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}</IconBtn>
          <IconBtn title="Excluir" onClick={onRemove}><Trash2 className="h-3.5 w-3.5 text-destructive" /></IconBtn>
        </div>
      </div>

      <Field label="Nome"><Input value={el.name ?? ""} onChange={(e) => onPatch({ name: e.target.value } as any)} className="h-8" /></Field>

      {el.kind === "text" && <>
        <Field label="Texto"><Textarea value={el.text} onChange={(e) => onPatch({ text: e.target.value } as any)} rows={3} className="text-xs" /></Field>
        <Field label="Fonte"><select value={el.fontFamily ?? "Inter"} onChange={(e) => onPatch({ fontFamily: e.target.value } as any)} className="h-8 w-full rounded-md border border-input bg-background px-2">
          {["Inter","Outfit","Figtree","Georgia","Times New Roman","serif","cursive"].map(f => <option key={f} value={f}>{f}</option>)}
        </select></Field>
        <Field label="Tamanho"><Input type="number" value={el.fontSize} onChange={(e) => onPatch({ fontSize: Number(e.target.value) } as any)} className="h-8" /></Field>
        <Field label="Cor"><input type="color" value={el.color} onChange={(e) => onPatch({ color: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
        <Field label="Estilo">
          <div className="flex gap-1">
            <IconBtn active={!!el.bold} onClick={() => onPatch({ bold: !el.bold } as any)}><Bold className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn active={!!el.italic} onClick={() => onPatch({ italic: !el.italic } as any)}><Italic className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn active={!!el.underline} onClick={() => onPatch({ underline: !el.underline } as any)}><Underline className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn active={!!el.uppercase} onClick={() => onPatch({ uppercase: !el.uppercase } as any)}><span className="text-[10px] font-bold">AA</span></IconBtn>
          </div>
        </Field>
        <Field label="Alinhar">
          <div className="flex gap-1">
            <IconBtn active={el.align === "left"} onClick={() => onPatch({ align: "left" } as any)}><AlignLeft className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn active={el.align === "center"} onClick={() => onPatch({ align: "center" } as any)}><AlignCenter className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn active={el.align === "right"} onClick={() => onPatch({ align: "right" } as any)}><AlignRight className="h-3.5 w-3.5" /></IconBtn>
          </div>
        </Field>
        <Field label="Entrelinhas"><Input type="number" step="0.1" value={el.lineHeight ?? 1.2} onChange={(e) => onPatch({ lineHeight: Number(e.target.value) } as any)} className="h-8" /></Field>
      </>}

      {(el.kind === "image" || el.kind === "logo" || el.kind === "signature") && <>
        <Field label="URL"><Input value={el.imageUrl} onChange={(e) => onPatch({ imageUrl: e.target.value } as any)} className="h-8" placeholder="https://..." /></Field>
        <Field label="Upload">
          <label className="inline-flex">
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <span className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2 hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando…" : "Enviar arquivo"}
            </span>
          </label>
        </Field>
        <Field label="Ajuste"><select value={el.fit ?? "contain"} onChange={(e) => onPatch({ fit: e.target.value } as any)} className="h-8 w-full rounded-md border border-input bg-background px-2">
          <option value="contain">Ajustar</option><option value="cover">Cobrir</option>
        </select></Field>
      </>}

      {(el.kind === "rect" || el.kind === "circle" || el.kind === "line") && <>
        <Field label="Preenchimento"><input type="color" value={el.fill ?? "#dc2626"} onChange={(e) => onPatch({ fill: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
        {el.kind !== "line" && <>
          <Field label="Borda"><input type="color" value={el.stroke ?? "#000000"} onChange={(e) => onPatch({ stroke: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
          <Field label="Esp. borda"><Input type="number" value={el.strokeWidth ?? 0} onChange={(e) => onPatch({ strokeWidth: Number(e.target.value) } as any)} className="h-8" /></Field>
          {el.kind === "rect" && <Field label="Raio"><Input type="number" value={el.radius ?? 0} onChange={(e) => onPatch({ radius: Number(e.target.value) } as any)} className="h-8" /></Field>}
        </>}
      </>}

      {el.kind === "qr" && <>
        <Field label="Valor"><Input value={el.qrValue} onChange={(e) => onPatch({ qrValue: e.target.value } as any)} className="h-8" placeholder="{{certificado_validacao}}" /></Field>
        <Field label="Cor"><input type="color" value={el.color ?? "#000"} onChange={(e) => onPatch({ color: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
        <Field label="Fundo"><input type="color" value={el.bg ?? "#fff"} onChange={(e) => onPatch({ bg: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
      </>}

      {el.kind === "date" && <>
        <Field label="Formato"><select value={el.format ?? "long"} onChange={(e) => onPatch({ format: e.target.value } as any)} className="h-8 w-full rounded-md border border-input bg-background px-2">
          <option value="dd/mm/yyyy">DD/MM/AAAA</option>
          <option value="long">18 de julho de 2026</option>
          <option value="iso">2026-07-18</option>
        </select></Field>
        <Field label="Tamanho"><Input type="number" value={el.fontSize} onChange={(e) => onPatch({ fontSize: Number(e.target.value) } as any)} className="h-8" /></Field>
        <Field label="Cor"><input type="color" value={el.color} onChange={(e) => onPatch({ color: e.target.value } as any)} className="h-8 w-full rounded border" /></Field>
      </>}

      {el.kind === "signature-block" && <>
        <Field label="Nome"><Input value={el.personName} onChange={(e) => onPatch({ personName: e.target.value } as any)} className="h-8" /></Field>
        <Field label="Cargo"><Input value={el.personRole ?? ""} onChange={(e) => onPatch({ personRole: e.target.value } as any)} className="h-8" /></Field>
        <Field label="Linha"><input type="checkbox" checked={el.showLine !== false} onChange={(e) => onPatch({ showLine: e.target.checked } as any)} /></Field>
        <Field label="Imagem"><Input value={el.imageUrl ?? ""} onChange={(e) => onPatch({ imageUrl: e.target.value } as any)} className="h-8" placeholder="URL da assinatura" /></Field>
        <Field label="Upload">
          <label className="inline-flex">
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <span className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2 hover:bg-muted"><Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando…" : "Enviar"}</span>
          </label>
        </Field>
      </>}

      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Posição</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X %"><Input type="number" step="0.1" value={el.x.toFixed(1)} onChange={(e) => onPatch({ x: Number(e.target.value) } as any)} className="h-8" /></Field>
          <Field label="Y %"><Input type="number" step="0.1" value={el.y.toFixed(1)} onChange={(e) => onPatch({ y: Number(e.target.value) } as any)} className="h-8" /></Field>
        </div>
        {"w" in el && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Larg %"><Input type="number" step="0.1" value={(el as any).w ?? 20} onChange={(e) => onPatch({ w: Number(e.target.value) } as any)} className="h-8" /></Field>
            <Field label="Alt %"><Input type="number" step="0.1" value={(el as any).h ?? 10} onChange={(e) => onPatch({ h: Number(e.target.value) } as any)} className="h-8" /></Field>
          </div>
        )}
        <Field label="Rotação"><Input type="number" value={el.rotation ?? 0} onChange={(e) => onPatch({ rotation: Number(e.target.value) } as any)} className="h-8" /></Field>
        <Field label="Opacidade"><Input type="number" step="0.05" min="0" max="1" value={el.opacity ?? 1} onChange={(e) => onPatch({ opacity: Number(e.target.value) } as any)} className="h-8" /></Field>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, active, title }: any) {
  return (
    <button title={title} onClick={onClick} className={`grid h-7 w-7 place-items-center rounded border text-muted-foreground transition-colors hover:bg-muted ${active ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{children}</button>
  );
}

function LayersPanel({ elements, selectedIds, onSelect, onPatch, onMoveLayer }: { elements: AnyElement[]; selectedIds: string[]; onSelect: (ids: string[]) => void; onPatch: (id: string, p: Partial<AnyElement>) => void; onMoveLayer: (id: string, dir: "front"|"back"|"up"|"down") => void }) {
  return (
    <div className="space-y-1">
      {[...elements].reverse().map((el) => (
        <div key={el.id} onClick={() => onSelect([el.id])} className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${selectedIds.includes(el.id) ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
          <span className="flex-1 truncate cursor-pointer">{el.name || `${el.kind}${el.z ? ` #${el.z}` : ""}`}</span>
          <button title="Subir" onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, "up"); }} className="rounded p-0.5 hover:bg-background"><ArrowUp className="h-3 w-3" /></button>
          <button title="Descer" onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, "down"); }} className="rounded p-0.5 hover:bg-background"><ArrowDown className="h-3 w-3" /></button>
          <button title={el.locked ? "Desbloquear" : "Bloquear"} onClick={(e) => { e.stopPropagation(); onPatch(el.id, { locked: !el.locked } as any); }} className="rounded p-0.5 hover:bg-background">{el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}</button>
          <button title={el.hidden ? "Mostrar" : "Ocultar"} onClick={(e) => { e.stopPropagation(); onPatch(el.id, { hidden: !el.hidden } as any); }} className="rounded p-0.5 hover:bg-background">{el.hidden ? <EyeOff className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}</button>
        </div>
      ))}
      {!elements.length && <div className="py-6 text-center text-muted-foreground">Sem elementos</div>}
    </div>
  );
}

function PagePanel({ page, onChange }: { page: EditorSchema["page"]; onChange: (p: Partial<EditorSchema["page"]>) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 10MB)"); return; }
    setUploading(true);
    try {
      const path = `certificates/bg-${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const img = new Image();
      img.onload = () => {
        onChange({ backgroundUrl: data.publicUrl, width: img.naturalWidth, height: img.naturalHeight });
        toast.success("Plano de fundo atualizado");
      };
      img.src = data.publicUrl;
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };
  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={`relative overflow-hidden rounded-md border-2 border-dashed transition ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
      >
        {page.backgroundUrl ? (
          <div className="relative">
            <img src={page.backgroundUrl} alt="Fundo" className="h-28 w-full object-contain bg-white" />
            <button
              type="button"
              onClick={() => onChange({ backgroundUrl: undefined })}
              className="absolute right-1 top-1 inline-flex h-6 items-center gap-1 rounded bg-background/90 px-1.5 text-[10px] font-medium text-destructive shadow hover:bg-background"
              title="Remover plano de fundo"
            >
              <Trash2 className="h-3 w-3" /> Remover
            </button>
          </div>
        ) : (
          <div className="grid h-24 place-items-center text-center text-[11px] text-muted-foreground px-2">
            Arraste uma imagem aqui<br />ou use o botão abaixo
          </div>
        )}
        <label className="flex">
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <span className="inline-flex w-full cursor-pointer items-center justify-center gap-1 border-t bg-background px-2 py-1.5 text-xs hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando…" : page.backgroundUrl ? "Trocar imagem de fundo" : "Enviar imagem de fundo"}
          </span>
        </label>
      </div>
      <Field label="URL do fundo"><Input value={page.backgroundUrl ?? ""} onChange={(e) => onChange({ backgroundUrl: e.target.value || undefined })} placeholder="Cole uma URL" className="h-8" /></Field>
      <Field label="Cor de fundo"><input type="color" value={page.background ?? "#ffffff"} onChange={(e) => onChange({ background: e.target.value })} className="h-8 w-full rounded border" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Largura"><Input type="number" value={page.width} onChange={(e) => onChange({ width: Number(e.target.value) })} className="h-8" /></Field>
        <Field label="Altura"><Input type="number" value={page.height} onChange={(e) => onChange({ height: Number(e.target.value) })} className="h-8" /></Field>
      </div>
      <div className="pt-1 text-[11px] text-muted-foreground">
        Presets:
        <div className="mt-1 flex flex-wrap gap-1">
          <button onClick={() => onChange({ width: 1754, height: 1240 })} className="rounded border border-border px-2 py-1 text-[10px] hover:bg-muted">A4 Paisagem</button>
          <button onClick={() => onChange({ width: 1240, height: 1754 })} className="rounded border border-border px-2 py-1 text-[10px] hover:bg-muted">A4 Retrato</button>
        </div>
      </div>
    </div>
  );
}
