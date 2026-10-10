import { useEffect, useMemo, useRef, useState } from "react";
import type { AnyElement, EditorSchema, TextElement, ImageElement, ShapeElement, QrElement, DateElement } from "@/components/dojo/certificate-editor/types";
import { useStudioStore } from "@/lib/dojo/certificates/studio-store";
import { resolveText, sampleValues } from "@/lib/dojo/certificates/export";
import { qrToDataURL } from "@/lib/qrcode-lazy";

/** Renders a single element in natural page coordinates (px). */
export function ElementView({ el, values, editable = false }: { el: AnyElement; values: Record<string, string>; editable?: boolean }) {
  const { doc } = useStudioStore();
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const style = elementBoxStyle(el, pageW, pageH);
  if (el.hidden && !editable) return null;

  if (el.kind === "text" || el.kind === "date") {
    return <TextView el={el as TextElement | DateElement} values={values} style={style} />;
  }
  if (el.kind === "image" || el.kind === "logo" || el.kind === "signature") {
    return <ImageView el={el as ImageElement} style={style} values={values} />;
  }
  if (el.kind === "rect" || el.kind === "circle" || el.kind === "line") {
    return <ShapeView el={el as ShapeElement} style={style} />;
  }
  if (el.kind === "qr") {
    return <QrView el={el as QrElement} values={values} style={style} />;
  }
  return null;
}

function elementBoxStyle(el: AnyElement, pageW: number, pageH: number): React.CSSProperties {
  const cx = (el.x / 100) * pageW;
  const cy = (el.y / 100) * pageH;
  const w = el.w != null ? (el.w / 100) * pageW : undefined;
  const h = el.h != null ? (el.h / 100) * pageH : undefined;
  return {
    position: "absolute",
    left: cx,
    top: cy,
    width: w,
    height: h,
    transform: `translate(-50%, -50%) rotate(${el.rotation ?? 0}deg)`,
    transformOrigin: "center center",
    opacity: el.opacity ?? 1,
    pointerEvents: "none",
  };
}

function TextView({ el, values, style }: { el: TextElement | DateElement; values: Record<string, string>; style: React.CSSProperties }) {
  const { doc } = useStudioStore();
  const isText = el.kind === "text";
  const raw = isText ? (el as TextElement).text : formatDate((el as DateElement).format ?? "long", values.data_atual);
  let display = resolveText(raw, values);
  if (isText && (el as TextElement).uppercase) display = display.toUpperCase();
  const t = el as TextElement;
  const bg = t.background && t.background !== "transparent" ? t.background : undefined;
  const padding = t.padding ?? 0;
  const borderWidth = t.borderWidth ?? 0;
  const border = borderWidth > 0 ? `${borderWidth}px solid ${t.borderColor || "#000"}` : undefined;
  const vAlign = t.verticalAlign ?? "middle";
  const alignItems = vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center";
  const effectiveBg = bg ?? (doc.page.backgroundUrl ? undefined : doc.page.background) ?? "#ffffff";
  const safeColor = ensureReadableTextColor(el.color, effectiveBg);
  return (
    <div style={{
      ...style,
      display: "flex",
      alignItems,
      justifyContent: alignToJustify(el.align),
      background: bg,
      padding,
      border,
      borderRadius: t.borderRadius ?? 0,
      boxShadow: t.shadow,
      boxSizing: "border-box",
    }}>
      <div style={{
        fontFamily: (el as any).fontFamily || "Inter, sans-serif",
        fontSize: el.fontSize,
        color: safeColor,
        fontWeight: (el as any).bold ? 800 : 400,
        fontStyle: (el as TextElement).italic ? "italic" : "normal",
        textDecoration: (el as TextElement).underline ? "underline" : "none",
        textAlign: el.align,
        letterSpacing: (el as TextElement).letterSpacing ?? undefined,
        lineHeight: (el as TextElement).lineHeight ?? 1.25,
        width: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {display}
      </div>
    </div>
  );
}

/** Luminance relative (0=preto, 1=branco) de uma cor hex/rgb. */
function relLuminance(hex?: string): number | null {
  if (!hex) return null;
  const s = hex.trim();
  let r = 0, g = 0, b = 0;
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
    if (full.length < 6) return null;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else if (s.startsWith("rgb")) {
    const m = s.match(/\d+/g);
    if (!m || m.length < 3) return null;
    r = +m[0]; g = +m[1]; b = +m[2];
  } else return null;
  const toLin = (v: number) => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/** Se texto claro cair sobre fundo claro (baixo contraste), força um cinza escuro legível. */
function ensureReadableTextColor(color: string | undefined, bg: string | undefined): string | undefined {
  const lc = relLuminance(color);
  const lb = relLuminance(bg);
  if (lc == null || lb == null) return color;
  // Contraste WCAG simplificado
  const contrast = (Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05);
  if (contrast >= 3) return color; // legível o bastante
  // Fundo claro + texto claro → escurece; caso contrário deixa (ex.: escuro/escuro é raro em presets)
  if (lb > 0.5) return "#111827";
  return "#f8fafc";
}


function alignToJustify(a: "left" | "center" | "right") {
  return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";
}

function ImageView({ el, style, values }: { el: ImageElement; style: React.CSSProperties; values?: Record<string, string> }) {
  const f = el.filters ?? {};
  const filterStr = [
    f.brightness != null ? `brightness(${f.brightness}%)` : null,
    f.contrast != null ? `contrast(${f.contrast}%)` : null,
    f.saturate != null ? `saturate(${f.saturate}%)` : null,
    f.grayscale != null ? `grayscale(${f.grayscale}%)` : null,
    f.sepia != null ? `sepia(${f.sepia}%)` : null,
    f.blur ? `blur(${f.blur}px)` : null,
  ].filter(Boolean).join(" ") || undefined;
  const maskRadius =
    el.mask === "circle" ? "50%" :
    el.mask === "rounded" ? "16px" :
    el.mask === "squircle" ? "28%" : undefined;
  const resolvedUrl = el.imageUrl || (el.kind === "logo" ? values?.academia_logo : "") || "";
  if (!resolvedUrl) {
    return <div style={{ ...style, background: "rgba(0,0,0,.05)", border: "2px dashed rgba(0,0,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,.35)", fontSize: 14, borderRadius: maskRadius ?? 8 }}>{el.kind === "logo" ? "Logo da academia (defina em Configurações)" : "Sem imagem"}</div>;
  }
  return (
    <img src={resolvedUrl} alt="" crossOrigin="anonymous"
      style={{ ...style, objectFit: el.fit || "contain", pointerEvents: "none", filter: filterStr, borderRadius: maskRadius, boxShadow: el.shadow }} />
  );
}

function ShapeView({ el, style }: { el: ShapeElement; style: React.CSSProperties }) {
  if (el.kind === "line") {
    return <div style={{ ...style, background: el.fill || "#111", height: Math.max(2, (style.height as number) || 3) }} />;
  }
  if (el.kind === "circle") {
    return <div style={{ ...style, background: el.fill || "transparent", border: el.stroke ? `${el.strokeWidth ?? 2}px solid ${el.stroke}` : "none", borderRadius: "50%" }} />;
  }
  return <div style={{ ...style, background: el.fill || "transparent", border: el.stroke ? `${el.strokeWidth ?? 2}px solid ${el.stroke}` : "none", borderRadius: el.radius ?? 0 }} />;
}

function QrView({ el, values, style }: { el: QrElement; values: Record<string, string>; style: React.CSSProperties }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    const val = resolveText(el.qrValue || "https://amtfightwear.com.br", values);
    qrToDataURL(val, { margin: 0, color: { dark: el.color || "#000000", light: el.bg || "#ffffff" }, width: 512 })
      .then(setSrc).catch(() => setSrc(""));
  }, [el.qrValue, el.color, el.bg, values]);
  return <div style={{ ...style, background: el.bg || "transparent" }}>
    {src ? <img src={src} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
  </div>;
}

function formatDate(fmt: "dd/mm/yyyy" | "long" | "iso", fallback?: string) {
  const d = new Date();
  if (fmt === "long") return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  if (fmt === "iso") return d.toISOString().slice(0, 10);
  return d.toLocaleDateString("pt-BR");
}

/** Public renderer used by preview & export — no editor scaffolding, no interactivity. */
export function CertificateRenderer({ doc, values, className }: { doc: EditorSchema; values?: Record<string, string>; className?: string }) {
  const merged = useMemo(() => ({ ...sampleValues(), ...(values ?? {}) }), [values]);
  const sortedEls = useMemo(() => [...doc.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [doc.elements]);
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: doc.page.width,
        height: doc.page.height,
        background: doc.page.background || "#ffffff",
        backgroundImage: doc.page.backgroundUrl ? `url(${doc.page.backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
      }}
    >
      {sortedEls.map((el) => (el.hidden ? null : (
        // display:contents não gera caixa: o wrapper só identifica o elemento para o editor medir o tamanho real renderizado.
        <div key={el.id} data-el-id={el.id} style={{ display: "contents" }}>
          <ElementViewInline el={el} values={merged} pageW={doc.page.width} pageH={doc.page.height} />
        </div>
      )))}
    </div>
  );
}

/** Inline variant that doesn't rely on the store (used from CertificateRenderer). */
function ElementViewInline({ el, values, pageW, pageH }: { el: AnyElement; values: Record<string, string>; pageW: number; pageH: number }) {
  const style = elementBoxStyle(el, pageW, pageH);
  if (el.kind === "text" || el.kind === "date") return <TextView el={el as any} values={values} style={style} />;
  if (el.kind === "image" || el.kind === "logo" || el.kind === "signature") return <ImageView el={el as ImageElement} style={style} values={values} />;
  if (el.kind === "rect" || el.kind === "circle" || el.kind === "line") return <ShapeView el={el as ShapeElement} style={style} />;
  if (el.kind === "qr") return <QrView el={el as QrElement} values={values} style={style} />;
  return null;
}
