import { useEffect, useMemo, useRef, useState } from "react";
import { useStudioStore } from "@/lib/dojo/certificates/studio-store";
import { CertificateRenderer } from "./CertificateRenderer";
import { sampleValues } from "@/lib/dojo/certificates/export";
import { makeId, type AnyElement } from "@/components/dojo/certificate-editor/types";

const CANVAS_ID = "cert-studio-canvas";

export function StudioCanvas() {
  const { doc, zoom, showGrid, showRulers, showGuides, snapEnabled, selection, select, updateElement, clearSelection, pushHistory, setZoom } = useStudioStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const values = useMemo(() => sampleValues(), []);

  // Fit-on-mount
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const rect = el.getBoundingClientRect();
    const targetW = rect.width - 80;
    const targetH = rect.height - 80;
    const zx = targetW / doc.page.width;
    const zy = targetH / doc.page.height;
    setZoom(Math.max(0.15, Math.min(1, Math.min(zx, zy))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+wheel zoom
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.1;
      setZoom(useStudioStore.getState().zoom + delta);
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, [setZoom]);

  // Keyboard shortcuts (canvas scope)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      const s = useStudioStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); e.shiftKey ? s.redo() : s.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); s.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault(); s.duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        s.copy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault(); s.paste();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selection.length) { e.preventDefault(); s.deleteSelected(); }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (!s.selection.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.3;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        s.updateSelected({ x: (s.doc.elements.find(el => el.id === s.selection[0])?.x ?? 0) + dx, y: (s.doc.elements.find(el => el.id === s.selection[0])?.y ?? 0) + dy } as any);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={wrapRef} className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900">
      {showRulers && <RulerH />}
      {showRulers && <RulerV />}
      <div className="min-h-full min-w-full flex items-center justify-center p-10">
        <div
          className="relative shadow-2xl bg-white ring-1 ring-black/5"
          style={{
            width: doc.page.width * zoom,
            height: doc.page.height * zoom,
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
        >
          <div
            id={CANVAS_ID}
            data-cert-canvas
            style={{ width: doc.page.width, height: doc.page.height, transform: `scale(${zoom})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}
          >
            <CertificateRenderer doc={doc} values={values} />
            {showGrid && <GridOverlay />}
            <MarginsOverlay />
            {doc.elements.filter(e => !e.hidden).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((el) => (
              <EditableOverlay key={el.id} el={el} selected={selection.includes(el.id)} onSelect={(add) => select([el.id], add)} onCommit={() => pushHistory()} zoom={zoom} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GridOverlay() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
  );
}
function MarginsOverlay() {
  const { doc } = useStudioStore();
  const m = doc.page.margin ?? 0;
  if (!m) return null;
  return <div style={{ position: "absolute", inset: m, pointerEvents: "none", border: "1px dashed rgba(0,0,0,.15)" }} />;
}
function RulerH() {
  const { doc, zoom } = useStudioStore();
  const total = doc.page.width * zoom;
  const marks = [];
  const step = 50 * zoom;
  for (let i = 0; i * step <= total; i++) marks.push(i);
  return (
    <div className="sticky top-0 z-10 h-6 bg-white/80 backdrop-blur border-b border-neutral-200 text-[10px] text-neutral-500 select-none" style={{ paddingLeft: 24 }}>
      <div className="relative h-full">
        {marks.map((i) => (
          <div key={i} style={{ position: "absolute", left: i * step, top: 0, bottom: 0, borderLeft: "1px solid rgba(0,0,0,.1)", paddingLeft: 2 }}>
            <span>{i * 50}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function RulerV() {
  const { doc, zoom } = useStudioStore();
  const total = doc.page.height * zoom;
  const marks = [];
  const step = 50 * zoom;
  for (let i = 0; i * step <= total; i++) marks.push(i);
  return (
    <div className="absolute top-6 left-0 w-6 bottom-0 z-10 bg-white/80 backdrop-blur border-r border-neutral-200 text-[10px] text-neutral-500 select-none">
      <div className="relative h-full">
        {marks.map((i) => (
          <div key={i} style={{ position: "absolute", top: i * step, left: 0, right: 0, borderTop: "1px solid rgba(0,0,0,.1)", paddingLeft: 2 }}>
            <span>{i * 50}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interactive overlay on top of a rendered element — drag/resize/rotate. */
function EditableOverlay({ el, selected, onSelect, onCommit, zoom }: { el: AnyElement; selected: boolean; onSelect: (additive?: boolean) => void; onCommit: () => void; zoom: number }) {
  const { doc, updateElement, snapEnabled } = useStudioStore();
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const cx = (el.x / 100) * pageW;
  const cy = (el.y / 100) * pageH;
  const w = el.w != null ? (el.w / 100) * pageW : autoWidth(el);
  const h = el.h != null ? (el.h / 100) * pageH : autoHeight(el);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; dir: string } | null>(null);
  const rotateRef = useRef<{ startAngle: number; center: { x: number; y: number }; startRot: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (el.locked) return;
    e.stopPropagation();
    onSelect(e.shiftKey);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const d = dragRef.current;
      const dxPx = (e.clientX - d.startX) / zoom;
      const dyPx = (e.clientY - d.startY) / zoom;
      let nx = d.origX + (dxPx / pageW) * 100;
      let ny = d.origY + (dyPx / pageH) * 100;
      if (snapEnabled) { nx = Math.round(nx * 2) / 2; ny = Math.round(ny * 2) / 2; }
      updateElement(el.id, { x: nx, y: ny } as any);
    } else if (resizeRef.current) {
      const r = resizeRef.current;
      const dxPx = (e.clientX - r.startX) / zoom;
      const dyPx = (e.clientY - r.startY) / zoom;
      const sign = r.dir.includes("l") ? -1 : 1;
      const signY = r.dir.includes("t") ? -1 : 1;
      const newW = Math.max(20, r.origW + sign * dxPx);
      const newH = Math.max(10, r.origH + signY * dyPx);
      const patch: any = {};
      patch.w = (newW / pageW) * 100;
      if (el.kind !== "text") patch.h = (newH / pageH) * 100;
      if (el.kind === "text") {
        // Scale font a bit too
        const scale = newW / Math.max(1, r.origW);
        if (Math.abs(scale - 1) > 0.02) patch.fontSize = Math.max(6, Math.round((el as any).fontSize * scale));
        resizeRef.current = { ...r, startX: e.clientX, startY: e.clientY, origW: newW };
      }
      updateElement(el.id, patch);
    } else if (rotateRef.current) {
      const r = rotateRef.current;
      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
      const cxp = rect.left + rect.width / 2;
      const cyp = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cyp, e.clientX - cxp) * 180 / Math.PI;
      const delta = angle - r.startAngle;
      updateElement(el.id, { rotation: r.startRot + delta } as any);
    }
  };
  const endGesture = () => {
    if (dragRef.current || resizeRef.current || rotateRef.current) onCommit();
    dragRef.current = null; resizeRef.current = null; rotateRef.current = null;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onDoubleClick={(e) => {
        if (el.kind !== "text") return;
        e.stopPropagation();
        const t = prompt("Editar texto (use {{variavel}}):", (el as any).text);
        if (t != null) { updateElement(el.id, { text: t } as any); onCommit(); }
      }}
      style={{
        position: "absolute", left: cx, top: cy, width: w, height: h,
        transform: `translate(-50%, -50%) rotate(${el.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        cursor: el.locked ? "not-allowed" : "move",
        outline: selected ? "2px solid #b91c1c" : "1px dashed transparent",
        outlineOffset: 0,
        boxShadow: selected ? "0 0 0 1px rgba(255,255,255,.8) inset" : undefined,
      }}
    >
      {selected && !el.locked && (
        <>
          {(["tl","tr","bl","br"] as const).map((dir) => (
            <div key={dir}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: w, origH: h, dir };
              }}
              onPointerMove={onPointerMove}
              onPointerUp={endGesture}
              style={{
                position: "absolute",
                left: dir.includes("l") ? -6 : "auto",
                right: dir.includes("r") ? -6 : "auto",
                top: dir.includes("t") ? -6 : "auto",
                bottom: dir.includes("b") ? -6 : "auto",
                width: 12, height: 12, background: "#b91c1c", border: "2px solid #fff", borderRadius: 999,
                cursor: dir === "tl" || dir === "br" ? "nwse-resize" : "nesw-resize",
              }}
            />
          ))}
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              const cxp = rect.left + rect.width / 2;
              const cyp = rect.top + rect.height / 2;
              const startAngle = Math.atan2(e.clientY - cyp, e.clientX - cxp) * 180 / Math.PI;
              rotateRef.current = { startAngle, center: { x: cxp, y: cyp }, startRot: el.rotation ?? 0 };
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endGesture}
            style={{ position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 999, background: "#0f172a", border: "2px solid #fff", cursor: "grab" }}
            title="Rotacionar"
          />
        </>
      )}
    </div>
  );
}

function autoWidth(el: AnyElement) {
  if (el.kind === "text") return Math.max(200, (el as any).fontSize * 8);
  return 200;
}
function autoHeight(el: AnyElement) {
  if (el.kind === "text") return Math.max(40, (el as any).fontSize * 1.4);
  return 100;
}

/** Add-element helpers used by the left sidebar. */
export function makeTextElement(text = "Texto", opts?: Partial<AnyElement>): AnyElement {
  return { id: makeId(), kind: "text", text, x: 50, y: 50, fontSize: 32, color: "#0f172a", align: "center", fontFamily: "Inter", ...(opts as any) } as any;
}
export function makeVariableElement(key: string): AnyElement {
  return { id: makeId(), kind: "text", text: `{{${key}}}`, x: 50, y: 50, fontSize: 32, color: "#0f172a", align: "center", fontFamily: "Inter", name: `Variável: ${key}` } as any;
}
export function makeShapeElement(kind: "rect" | "circle" | "line"): AnyElement {
  if (kind === "line") return { id: makeId(), kind: "line", x: 50, y: 50, w: 30, h: 0.3, fill: "#0f172a" } as any;
  if (kind === "circle") return { id: makeId(), kind: "circle", x: 50, y: 50, w: 15, h: 15, fill: "#b91c1c", stroke: "", strokeWidth: 0 } as any;
  return { id: makeId(), kind: "rect", x: 50, y: 50, w: 20, h: 12, fill: "#b91c1c", radius: 8 } as any;
}
export function makeImageElement(url: string, kind: "image" | "logo" | "signature" = "image"): AnyElement {
  return { id: makeId(), kind, imageUrl: url, x: 50, y: 50, w: 25, h: 15, fit: "contain", name: kind === "logo" ? "Logo" : kind === "signature" ? "Assinatura" : "Imagem" } as any;
}
export function makeQrElement(): AnyElement {
  return { id: makeId(), kind: "qr", qrValue: "{{certificado_codigo}}", x: 85, y: 85, w: 12, h: 12, color: "#000", bg: "#fff", name: "QR Code" } as any;
}
