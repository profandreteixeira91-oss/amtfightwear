import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, X } from "lucide-react";

export type CertificateField = {
  key: string; label?: string;
  x: number; y: number; fontSize: number;
  fontFamily?: string; color?: string;
  align?: "left" | "center" | "right"; bold?: boolean;
  kind?: "variable" | "static" | "signature";
  text?: string; imageUrl?: string;
  width?: number; height?: number;
};

export type CertificateTemplate = {
  name?: string;
  background_url: string;
  width: number;
  height: number;
  fields: CertificateField[];
};

function resolveText(f: CertificateField, values: Record<string, string>): string {
  const kind = f.kind ?? "variable";
  if (kind === "static") return f.text ?? "";
  return values[f.key] ?? "";
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
      {(template.fields ?? []).map((f, i) => {
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
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${f.x}%`, top: `${f.y}%`,
                transform: translate,
                width: `${w * scale}px`, height: `${h * scale}px`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {f.imageUrl && (
                <img src={f.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}
            </div>
          );
        }

        const text = resolveText(f, values);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${f.x}%`, top: `${f.y}%`,
              transform: translate,
              fontSize: `${f.fontSize * scale}px`,
              color: f.color ?? "#111",
              fontWeight: f.bold ? 700 : 400,
              fontFamily: f.fontFamily,
              textAlign: align,
              whiteSpace: "pre-wrap",
              lineHeight: 1.15,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

/** Build a self-contained HTML doc for print / save-as-PDF. */
function buildPrintHtml(items: Array<{ template: CertificateTemplate; values: Record<string, string> }>) {
  const orientation = items[0]?.template.width >= items[0]?.template.height ? "landscape" : "portrait";
  const pages = items.map(({ template, values }) => {
    const W = template.width, H = template.height;
    const fields = (template.fields ?? []).map((f) => {
      const kind = f.kind ?? "variable";
      const align = f.align ?? "left";
      const translate =
        align === "center" ? "translate(-50%,-50%)" :
        align === "right"  ? "translate(-100%,-50%)" :
                             "translate(0,-50%)";
      const common = `position:absolute;left:${f.x}%;top:${f.y}%;transform:${translate};`;

      if (kind === "signature") {
        const w = (f.width ?? 22), h = (f.height ?? 8);
        return `<div style="${common}width:${w}%;height:${h}%;display:flex;align-items:center;justify-content:center;">
          ${f.imageUrl ? `<img src="${f.imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" crossorigin="anonymous" />` : ""}
        </div>`;
      }
      const text = (kind === "static" ? (f.text ?? "") : (values[f.key] ?? ""))
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      return `<div style="${common}font-size:${f.fontSize}px;color:${f.color ?? "#111"};font-weight:${f.bold ? 700 : 400};${f.fontFamily ? `font-family:${f.fontFamily};` : ""}text-align:${align};white-space:pre-wrap;line-height:1.15;">${text}</div>`;
    }).join("");

    return `<section class="page">
      <div class="canvas" style="width:${W}px;height:${H}px;">
        ${template.background_url ? `<img class="bg" src="${template.background_url}" crossorigin="anonymous" />` : ""}
        ${fields}
      </div>
    </section>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Certificado</title>
  <style>
    @page { size: A4 ${orientation}; margin: 0; }
    html, body { margin: 0; padding: 0; background: #f4f4f4; }
    body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .page {
      display: flex; align-items: center; justify-content: center;
      width: 100vw; min-height: 100vh; page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .canvas {
      position: relative; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.08);
      transform-origin: center; transform: scale(var(--fit, 1));
    }
    .canvas .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
    @media print {
      html, body { background: #fff; }
      .page { min-height: auto; height: 100vh; }
      .canvas { box-shadow: none; }
    }
  </style>
  </head><body>
  ${pages}
  <script>
    (function() {
      function fit() {
        document.querySelectorAll('.page').forEach(function(page) {
          var canvas = page.querySelector('.canvas');
          if (!canvas) return;
          var rect = page.getBoundingClientRect();
          var cw = canvas.offsetWidth, ch = canvas.offsetHeight;
          var s = Math.min(rect.width / cw, rect.height / ch) * 0.95;
          canvas.style.setProperty('--fit', String(s));
        });
      }
      window.addEventListener('resize', fit);
      window.addEventListener('load', function() {
        var imgs = Array.from(document.images);
        Promise.all(imgs.map(function(img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function(res) { img.onload = img.onerror = res; });
        })).then(function() { fit(); setTimeout(function(){ window.focus(); window.print(); }, 200); });
      });
    })();
  </script>
  </body></html>`;
}

export function openCertificatePrint(
  items: Array<{ template: CertificateTemplate; values: Record<string, string> }>,
) {
  const html = buildPrintHtml(items);
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    alert("Permita janelas pop-up para imprimir/salvar como PDF.");
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
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
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
  // Fit template to a container width of ~1000px preserving aspect.
  const maxW = 1000;
  const maxH = 600;
  const scale = Math.min(maxW / template.width, maxH / template.height, 1);
  return <CertificateCanvas template={template} values={values} scale={scale} />;
}
