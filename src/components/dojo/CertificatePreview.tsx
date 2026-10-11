import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { toBlob } from "html-to-image";
import { qrToDataURL } from "@/lib/qrcode-lazy";
import { CertificateRenderer } from "@/components/dojo/certificates-studio/CertificateRenderer";

export type CertificateField = {
  key: string; label?: string;
  x: number; y: number; fontSize?: number;
  fontFamily?: string; color?: string;
  align?: "left" | "center" | "right"; bold?: boolean;
  kind?: "variable" | "static" | "signature";
  text?: string; imageUrl?: string;
  width?: number; height?: number;
};

// New editor schema (v2) — richer element set. See certificate-editor/types.ts
export type EditorElement = any;
export type EditorSchema = {
  version: 2;
  page: { width: number; height: number; background?: string; backgroundUrl?: string; margin?: number };
  elements: EditorElement[];
};

export type CertificateTemplate = {
  name?: string;
  background_url: string;
  width: number;
  height: number;
  fields: CertificateField[];
  /** New editor v2 schema (optional) */
  variables?: { editor_schema?: EditorSchema; favorites?: string[]; recent?: string[]; [k: string]: any } | null;
};

function subst(s: string | undefined, values: Record<string, string>) {
  return (s ?? "").replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => values[k] ?? "");
}

function resolveText(f: CertificateField, values: Record<string, string>): string {
  const kind = f.kind ?? "variable";
  if (kind === "static") return subst(f.text ?? "", values);
  return values[f.key] ?? "";
}

/** Async QR renderer — inline component so preview works. */
function QrImg({ value, color = "#000", bg = "#fff" }: { value: string; color?: string; bg?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    qrToDataURL(value || " ", { width: 256, margin: 1, color: { dark: color, light: bg } }).then(setUrl);
  }, [value, color, bg]);
  return url ? <img src={url} className="pointer-events-none" style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="QR" /> : null;
}

/**
 * Render the certificate on a fixed pixel canvas equal to the template's
 * natural size. Both preview and print use this so what you see is what
 * gets printed.
 */
export function CertificateCanvas({
  template, values, scale = 1,
}: { template: CertificateTemplate; values: Record<string, string>; scale?: number }) {
  const W = template.width;
  const H = template.height;
  const editorSchema: EditorSchema | undefined = template.variables?.editor_schema;

  // Prefer the studio renderer for v2 schemas — guarantees the profile view
  // matches exactly what the editor / print produce.
  if (editorSchema) {
    return (
      <div style={{ width: W * scale, height: H * scale, overflow: "hidden" }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <CertificateRenderer doc={editorSchema} values={values} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: `${W * scale}px`,
        height: `${H * scale}px`,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {template.background_url && (
        <img
          src={template.background_url}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
      {(template.fields ?? []).map((f, i) => renderLegacy(f, i, values, scale, W, H))}
    </div>
  );
}

function renderLegacy(f: CertificateField, i: number, values: Record<string, string>, scale: number, W: number, H: number) {
  const kind = f.kind ?? "variable";
  const align = f.align ?? "left";
  const translate =
    align === "center" ? "translate(-50%,-50%)" :
    align === "right"  ? "translate(-100%,-50%)" :
                         "translate(0,-50%)";

  if (kind === "signature") {
    const w = (f.width ?? 22) / 100 * W;
    const h = (f.height ?? 8) / 100 * H;
    return (
      <div key={i} style={{
        position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: translate,
        width: `${w * scale}px`, height: `${h * scale}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {f.imageUrl && <img src={f.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
      </div>
    );
  }
  const text = resolveText(f, values);
  return (
    <div key={i} style={{
      position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: translate,
      fontSize: `${(f.fontSize ?? 24) * scale}px`, color: f.color ?? "#111",
      fontWeight: f.bold ? 700 : 400, fontFamily: f.fontFamily,
      textAlign: align, whiteSpace: "pre-wrap", lineHeight: 1.15,
    }}>{text}</div>
  );
}

function EditorElementRender({ el, values, scale, W, H }: { el: any; values: Record<string, string>; scale: number; W: number; H: number }) {
  const isText = el.kind === "text" || el.kind === "date";
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${el.x}%`, top: `${el.y}%`,
    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
    opacity: el.opacity ?? 1,
    width: isText ? "auto" : `${el.w ?? 20}%`,
    height: isText ? "auto" : `${el.h ?? 10}%`,
    zIndex: el.z,
  };

  if (el.kind === "text") {
    return (
      <div style={{ ...style, fontSize: `${el.fontSize * scale}px`, color: el.color,
        fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? "italic" : undefined,
        textDecoration: el.underline ? "underline" : undefined,
        textTransform: el.uppercase ? "uppercase" : undefined,
        textAlign: el.align, fontFamily: el.fontFamily,
        lineHeight: el.lineHeight ?? 1.2, letterSpacing: el.letterSpacing,
        whiteSpace: "pre-wrap" }}>
        {subst(el.text, values)}
      </div>
    );
  }
  if (el.kind === "date") {
    const now = new Date();
    const s = el.format === "long"
      ? now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : el.format === "iso" ? now.toISOString().slice(0, 10)
      : now.toLocaleDateString("pt-BR");
    return <div style={{ ...style, fontSize: `${el.fontSize * scale}px`, color: el.color, fontWeight: el.bold ? 700 : 400, textAlign: el.align, fontFamily: el.fontFamily }}>{s}</div>;
  }
  if (el.kind === "image" || el.kind === "logo" || el.kind === "signature") {
    const src = el.imageUrl || (el.kind === "logo" ? values.academia_logo : "");
    return src ? <img src={src} alt="" style={{ ...style, objectFit: el.fit ?? "contain" }} /> : <div style={style} />;
  }
  if (el.kind === "rect") return <div style={{ ...style, background: el.fill, border: `${el.strokeWidth ?? 0}px solid ${el.stroke ?? "transparent"}`, borderRadius: el.radius ?? 0 }} />;
  if (el.kind === "circle") return <div style={{ ...style, background: el.fill, border: `${el.strokeWidth ?? 0}px solid ${el.stroke ?? "transparent"}`, borderRadius: "9999px" }} />;
  if (el.kind === "line") return <div style={{ ...style, background: el.fill ?? "#111" }} />;
  if (el.kind === "qr") return <div style={style}><QrImg value={subst(el.qrValue, values)} color={el.color} bg={el.bg} /></div>;
  if (el.kind === "signature-block") {
    return (
      <div style={{ ...style, color: el.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2, textAlign: "center" }}>
        {el.imageUrl && <img src={el.imageUrl} alt="" style={{ maxHeight: "55%", maxWidth: "100%", objectFit: "contain" }} />}
        {el.showLine !== false && <div style={{ width: "100%", borderTop: "1px solid currentColor" }} />}
        <div style={{ fontSize: `${9 * scale}px`, fontWeight: 600 }}>{el.personName || "Nome"}</div>
        {el.personRole && <div style={{ fontSize: `${8 * scale}px`, opacity: 0.7 }}>{el.personRole}</div>}
      </div>
    );
  }
  return null;
}

/** Build a self-contained HTML doc for print / save-as-PDF. */
function buildPrintHtml(items: Array<{ template: CertificateTemplate; values: Record<string, string> }>) {
  const orientation = items[0]?.template.width >= items[0]?.template.height ? "landscape" : "portrait";
  const pages = items.map(({ template, values }) => {
    const W = template.width, H = template.height;
    const editorSchema: EditorSchema | undefined = template.variables?.editor_schema;
    let elementsHtml = "";
    let canvasBg = "#fff";
    let canvasBgImg = "";
    if (editorSchema) {
      canvasBg = editorSchema.page.background || "#fff";
      const bgUrl = editorSchema.page.backgroundUrl || template.background_url;
      if (bgUrl) canvasBgImg = `background-image:url('${bgUrl}');background-size:cover;background-position:center;`;
      const sorted = [...editorSchema.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
      elementsHtml = sorted.filter((e) => !e.hidden).map((e) => renderElementHtml(e, values)).join("");
    } else {
      if (template.background_url) canvasBgImg = `background-image:url('${template.background_url}');background-size:contain;background-position:center;background-repeat:no-repeat;`;
      elementsHtml = (template.fields ?? []).map((f) => renderLegacyHtml(f, values)).join("");
    }
    return `<section class="page">
      <div class="canvas" style="width:${W}px;height:${H}px;background:${canvasBg};${canvasBgImg}">
        ${elementsHtml}
      </div>
    </section>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Certificado</title>
  <style>
    @page { size: A4 ${orientation}; margin: 0; }
    html, body { margin: 0; padding: 0; background: #f4f4f4; }
    body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .page { display: flex; align-items: center; justify-content: center; width: 100vw; min-height: 100vh; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .canvas { position: relative; box-shadow: 0 8px 24px rgba(0,0,0,.08); transform-origin: center; transform: scale(var(--fit, 1)); overflow: hidden; }
    @media print { html, body { background: #fff; } .page { min-height: auto; height: 100vh; } .canvas { box-shadow: none; } }
  </style>
  </head><body>
  ${pages}
  <script>
    (function() {
      function fit() {
        document.querySelectorAll('.page').forEach(function(page) {
          var canvas = page.querySelector('.canvas'); if (!canvas) return;
          var rect = page.getBoundingClientRect();
          var s = Math.min(rect.width / canvas.offsetWidth, rect.height / canvas.offsetHeight) * 0.95;
          canvas.style.setProperty('--fit', String(s));
        });
      }
      window.addEventListener('resize', fit);
      window.addEventListener('load', function() {
        var imgs = Array.from(document.images);
        Promise.all(imgs.map(function(img) { if (img.complete) return Promise.resolve(); return new Promise(function(res) { img.onload = img.onerror = res; }); }))
          .then(function() { fit(); setTimeout(function(){ window.focus(); window.print(); }, 200); });
      });
    })();
  </script>
  </body></html>`;
}

function esc(s: string) { return (s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function renderLegacyHtml(f: CertificateField, values: Record<string, string>): string {
  const align = f.align ?? "left";
  const translate = align === "center" ? "translate(-50%,-50%)" : align === "right" ? "translate(-100%,-50%)" : "translate(0,-50%)";
  const common = `position:absolute;left:${f.x}%;top:${f.y}%;transform:${translate};`;
  const kind = f.kind ?? "variable";
  if (kind === "signature") {
    return `<div style="${common}width:${f.width ?? 22}%;height:${f.height ?? 8}%;display:flex;align-items:center;justify-content:center;">${f.imageUrl ? `<img src="${f.imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" crossorigin="anonymous" />` : ""}</div>`;
  }
  const text = esc(kind === "static" ? subst(f.text, values) : (values[f.key] ?? ""));
  return `<div style="${common}font-size:${f.fontSize ?? 24}px;color:${f.color ?? "#111"};font-weight:${f.bold ? 700 : 400};${f.fontFamily ? `font-family:${f.fontFamily};` : ""}text-align:${align};white-space:pre-wrap;line-height:1.15;">${text}</div>`;
}

function renderElementHtml(el: any, values: Record<string, string>): string {
  // Match CertificateRenderer's box model exactly so print output matches the editor.
  const hasW = el.w != null;
  const hasH = el.h != null;
  const sizingBox = `width:${el.w ?? 20}%;height:${el.h ?? 10}%;`;
  const common = `position:absolute;left:${el.x}%;top:${el.y}%;transform:translate(-50%,-50%) rotate(${el.rotation || 0}deg);opacity:${el.opacity ?? 1};z-index:${el.z ?? 0};`;

  if (el.kind === "text") {
    const vAlign = el.verticalAlign ?? "middle";
    const alignItems = vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center";
    const justify = el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center";
    const bg = el.background && el.background !== "transparent" ? `background:${el.background};` : "";
    const padding = el.padding ? `padding:${el.padding}px;` : "";
    const border = (el.borderWidth ?? 0) > 0 ? `border:${el.borderWidth}px solid ${el.borderColor || "#000"};` : "";
    const radius = el.borderRadius ? `border-radius:${el.borderRadius}px;` : "";
    const width = hasW ? `width:${el.w}%;` : "";
    const height = hasH ? `height:${el.h}%;` : "";
    const boxStyle = `${common}${width}${height}display:flex;align-items:${alignItems};justify-content:${justify};${bg}${padding}${border}${radius}box-sizing:border-box;`;
    const textStyle = `font-size:${el.fontSize}px;color:${el.color};font-weight:${el.bold ? 800 : 400};${el.italic ? "font-style:italic;" : ""}${el.underline ? "text-decoration:underline;" : ""}${el.uppercase ? "text-transform:uppercase;" : ""}text-align:${el.align};${el.fontFamily ? `font-family:'${el.fontFamily}',serif;` : ""}line-height:${el.lineHeight ?? 1.25};${el.letterSpacing != null ? `letter-spacing:${el.letterSpacing}px;` : ""}${hasW ? "width:100%;" : ""}white-space:pre-wrap;word-break:break-word;`;
    const raw = el.uppercase ? String(subst(el.text, values)).toUpperCase() : subst(el.text, values);
    return `<div style="${boxStyle}"><div style="${textStyle}">${esc(raw)}</div></div>`;
  }
  if (el.kind === "date") {
    const now = new Date();
    const s = el.format === "long" ? now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : el.format === "iso" ? now.toISOString().slice(0, 10) : now.toLocaleDateString("pt-BR");
    return `<div style="${common}font-size:${el.fontSize}px;color:${el.color};font-weight:${el.bold ? 800 : 400};text-align:${el.align};${el.fontFamily ? `font-family:'${el.fontFamily}',serif;` : ""}">${esc(s)}</div>`;
  }
  if (el.kind === "image" || el.kind === "logo" || el.kind === "signature") {
    const src = el.imageUrl || (el.kind === "logo" ? values.academia_logo : "");
    return src ? `<img src="${src}" crossorigin="anonymous" style="${common}${sizingBox}object-fit:${el.fit ?? "contain"};" />` : "";
  }
  if (el.kind === "rect") return `<div style="${common}${sizingBox}background:${el.fill && el.fill !== "transparent" ? el.fill : "transparent"};${el.stroke ? `border:${el.strokeWidth ?? 2}px solid ${el.stroke};` : ""}border-radius:${el.radius ?? 0}px;box-sizing:border-box;"></div>`;
  if (el.kind === "circle") return `<div style="${common}${sizingBox}background:${el.fill && el.fill !== "transparent" ? el.fill : "transparent"};${el.stroke ? `border:${el.strokeWidth ?? 2}px solid ${el.stroke};` : ""}border-radius:50%;box-sizing:border-box;"></div>`;
  if (el.kind === "line") {
    return `<div style="${common}width:${el.w ?? 20}%;height:${Math.max(2, el.h ?? 0.3)}px;background:${el.fill ?? "#111"};"></div>`;
  }
  if (el.kind === "qr") {
    return `<div style="${common}${sizingBox}background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;">QR: ${esc(subst(el.qrValue, values))}</div>`;
  }
  if (el.kind === "signature-block") {
    return `<div style="${common}${sizingBox}color:${el.color ?? "#111"};display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;text-align:center;">
      ${el.imageUrl ? `<img src="${el.imageUrl}" crossorigin="anonymous" style="max-height:55%;max-width:100%;object-fit:contain;" />` : ""}
      ${el.showLine !== false ? `<div style="width:100%;border-top:1px solid currentColor;"></div>` : ""}
      <div style="font-size:16px;font-weight:600;">${esc(el.personName ?? "")}</div>
      ${el.personRole ? `<div style="font-size:13px;opacity:0.7;">${esc(el.personRole)}</div>` : ""}
    </div>`;
  }
  return "";
}

/**
 * Render each certificate to a PNG (rasterizando o mesmo componente da
 * pré-visualização) e abre uma janela A4 contendo apenas as imagens. Isso
 * evita divergências entre preview e impressão: o que você vê é literalmente
 * o que sai — a diagramação e o tamanho de todos os elementos ficam
 * "achatados" em uma única imagem.
 */
export async function openCertificatePrint(
  items: Array<{ template: CertificateTemplate; values: Record<string, string> }>,
  onProgress?: (done: number, total: number) => void,
) {
  if (!items.length) return;
  let done = 0;

  // Container invisível — renderiza cada certificado no tamanho natural.
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-100000px;top:0;pointer-events:none;opacity:0;z-index:-1;";
  document.body.appendChild(host);

  const pages: Array<{ blobUrl: string; W: number; H: number }> = [];

  try {
    // Renderiza e rasteriza cada certificado em paralelo — cada um em sua própria célula.
    const rendered = await Promise.all(
      items.map(async (it) => {
        const W = it.template.width;
        const H = it.template.height;

        const cell = document.createElement("div");
        cell.style.cssText = `width:${W}px;height:${H}px;background:#fff;`;
        host.appendChild(cell);

        const root = createRoot(cell);
        root.render(<CertificateCanvas template={it.template} values={it.values} scale={1} />);

        // Aguarda React montar + imagens carregarem (fontes/QR/backgrounds).
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const imgs = Array.from(cell.querySelectorAll("img")) as HTMLImageElement[];
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete && img.naturalWidth > 0) return res();
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              }),
          ),
        );

        // pixelRatio 1.5 mantém nitidez em A4 sem quadruplicar pixels; sem cacheBust para reaproveitar imagens já carregadas.
        const blob = await toBlob(cell, {
          width: W,
          height: H,
          pixelRatio: 1.5,
          backgroundColor: "#ffffff",
        });

        root.unmount();
        host.removeChild(cell);

        if (!blob) throw new Error("Falha ao gerar imagem do certificado");
        return { blobUrl: URL.createObjectURL(blob), W, H };
      }),
    );
    pages.push(...rendered);
  } catch (err) {
    console.error("[certificate print] falha ao rasterizar:", err);
    alert("Não foi possível gerar a imagem do certificado para impressão.");
    if (host.parentNode) document.body.removeChild(host);
    return;
  }

  document.body.removeChild(host);

  const orientation = pages[0].W >= pages[0].H ? "landscape" : "portrait";
  const pagesHtml = pages
    .map(
      (p) => `<section class="page"><img src="${p.blobUrl}" alt="Certificado" /></section>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Certificado</title>
<style>
  @page { size: A4 ${orientation}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #f4f4f4; }
  .page { display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .page img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
  @media print { html, body { background: #fff; } .page img { box-shadow: none; } }
</style>
</head><body>
${pagesHtml}
<script>
  window.addEventListener('load', function() {
    var imgs = Array.from(document.images);
    Promise.all(imgs.map(function(img) { if (img.complete) return Promise.resolve(); return new Promise(function(res) { img.onload = img.onerror = res; }); }))
      .then(function() { window.focus(); window.print(); });
  });
</script>
</body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    alert("Permita janelas pop-up para imprimir/salvar como PDF.");
    pages.forEach((p) => URL.revokeObjectURL(p.blobUrl));
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}


export function CertificatePreviewDialog({
  open, onOpenChange, template, values, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: CertificateTemplate | null;
  values: Record<string, string>;
  title?: string;
}) {
  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">{title ?? "Pré-visualização do certificado"}</DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button size="sm" variant="outline" onClick={() => openCertificatePrint([{ template, values }])}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" onClick={() => openCertificatePrint([{ template, values }])}>
              <FileDown className="h-4 w-4 mr-1" /> Salvar em PDF
            </Button>
            <Button size="icon" variant="ghost" aria-label="Fechar" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>
        <div className="bg-muted/30 p-4 overflow-auto max-h-[75vh] flex items-center justify-center">
          <FitCanvas template={template} values={values} />
        </div>
        <p className="text-[11px] text-muted-foreground px-4 pb-3">
          Ao clicar em <strong>Salvar em PDF</strong> ou <strong>Imprimir</strong>, seu navegador abrirá o diálogo de impressão. Escolha <em>“Salvar como PDF”</em> como destino para gerar o arquivo.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function FitCanvas({ template, values }: { template: CertificateTemplate; values: Record<string, string> }) {
  const maxW = 1000, maxH = 600;
  const scale = Math.min(maxW / template.width, maxH / template.height, 1);
  return <CertificateCanvas template={template} values={values} scale={scale} />;
}
