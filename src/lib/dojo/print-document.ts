// Padrão de documento branded para impressão / salvar-como-PDF.
// Todas as telas do Dojo Manager que ofereciam "Imprimir" deviam usar este helper
// em vez de chamar `window.print()` — que imprime o navegador inteiro.

export type PrintBranding = {
  trade_name?: string | null;
  legal_name?: string | null;
  logo_url?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  slug?: string | null;
} | null | undefined;

export type PrintSection = {
  title?: string;
  /** Rich HTML content — will NOT be escaped. Use `escapeHtml` in the caller when needed. */
  html: string;
};

export type BrandedPrintOptions = {
  branding?: PrintBranding;
  title: string;
  subtitle?: string;
  /** Sections rendered as branded blocks. Ignored if bodyHtml is supplied. */
  sections?: PrintSection[];
  /** Raw HTML (already sectioned). Overrides `sections`. */
  bodyHtml?: string;
  /** Rodapé opcional (esquerda). Ex.: "Documento interno". */
  footerLeft?: string;
  /** Rodapé opcional (direita). Ex.: "Confidencial". */
  footerRight?: string;
  orientation?: "portrait" | "landscape";
  /** Emitido no cabeçalho junto à data. */
  documentId?: string;
  /** Auto-abre o diálogo de impressão. Padrão: true. */
  autoPrint?: boolean;
};

export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Helper para montar tabela chave/valor a partir de pares. Null/undefined viram "—". */
export function kvTable(rows: Array<[string, unknown]>): string {
  const cells = rows
    .map(([k, v]) => {
      const val = v == null || v === "" ? "—" : String(v);
      return `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(val)}</td></tr>`;
    })
    .join("");
  return `<table class="kv">${cells}</table>`;
}

function fmtNow(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildHeader(o: BrandedPrintOptions): string {
  const b = o.branding ?? {};
  const name = b.trade_name ?? b.legal_name ?? "AMT Dojo Manager";
  const primary = b.brand_primary || "#dc2626";
  const secondary = b.brand_secondary || "#0f172a";
  const logo = b.logo_url
    ? `<img src="${escapeHtml(b.logo_url)}" alt="${escapeHtml(name)}" crossorigin="anonymous" />`
    : `<div class="logo-fallback" style="background:${primary}">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>`;
  const meta = [o.documentId && `Doc.: ${o.documentId}`, `Emitido: ${fmtNow()}`]
    .filter(Boolean)
    .map((t) => `<span>${escapeHtml(String(t))}</span>`)
    .join("");
  return `
  <header class="doc-header" style="--doc-primary:${primary};--doc-secondary:${secondary}">
    <div class="brand">
      <div class="brand-logo">${logo}</div>
      <div class="brand-text">
        <div class="brand-name">${escapeHtml(name)}</div>
        <div class="brand-eyebrow">AMT Dojo Manager</div>
      </div>
    </div>
    <div class="doc-meta">${meta}</div>
  </header>
  <div class="doc-title-block">
    <h1>${escapeHtml(o.title)}</h1>
    ${o.subtitle ? `<p class="subtitle">${escapeHtml(o.subtitle)}</p>` : ""}
  </div>`;
}

function buildFooter(o: BrandedPrintOptions): string {
  const b = o.branding ?? {};
  const name = b.trade_name ?? b.legal_name ?? "AMT Dojo Manager";
  const left = o.footerLeft ?? name;
  const right = o.footerRight ?? "Powered by AMT Dojo Manager";
  return `<footer class="doc-footer">
    <span>${escapeHtml(left)}</span>
    <span>${escapeHtml(right)}</span>
  </footer>`;
}

function buildBody(o: BrandedPrintOptions): string {
  if (o.bodyHtml) return o.bodyHtml;
  const sections = o.sections ?? [];
  return sections
    .map(
      (s) => `<section class="doc-section">
        ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ""}
        <div class="section-body">${s.html}</div>
      </section>`,
    )
    .join("");
}

function buildStyles(o: BrandedPrintOptions): string {
  const primary = o.branding?.brand_primary || "#dc2626";
  const orientation = o.orientation ?? "portrait";
  return `
  :root { color-scheme: light; }
  @page { size: A4 ${orientation}; margin: 14mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f4f4f5; color: #0f172a; font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 12px; line-height: 1.45; }
  body { padding: 24px; }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; padding: 40px 48px; border-radius: 8px; box-shadow: 0 12px 40px rgba(15,23,42,.08); }

  .doc-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid ${primary}; }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .brand-logo { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: #f1f5f9; display: grid; place-items: center; flex: 0 0 auto; }
  .brand-logo img { width: 100%; height: 100%; object-fit: contain; }
  .logo-fallback { width: 100%; height: 100%; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 22px; }
  .brand-text { min-width: 0; }
  .brand-eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: .18em; color: #64748b; }
  .brand-name { font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.15; }
  .doc-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 10px; color: #64748b; text-align: right; }

  .doc-title-block { padding: 22px 0 6px; }
  .doc-title-block h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
  .doc-title-block .subtitle { margin: 4px 0 0; color: #475569; font-size: 12px; }

  .doc-section { padding: 14px 0; break-inside: avoid; page-break-inside: avoid; }
  .doc-section + .doc-section { border-top: 1px solid #e2e8f0; }
  .doc-section h2 { margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: ${primary}; }
  .section-body { color: #0f172a; }

  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th, table.kv td { text-align: left; padding: 6px 10px; vertical-align: top; font-size: 11.5px; }
  table.kv tr { border-bottom: 1px solid #f1f5f9; }
  table.kv tr:last-child { border-bottom: 0; }
  table.kv th { width: 38%; color: #64748b; font-weight: 500; }
  table.kv td { color: #0f172a; font-weight: 500; }

  table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.data th, table.data td { padding: 8px 10px; text-align: left; font-size: 11px; }
  table.data thead th { background: #f8fafc; color: #475569; text-transform: uppercase; letter-spacing: .08em; font-size: 9.5px; border-bottom: 1px solid #e2e8f0; }
  table.data tbody tr { border-bottom: 1px solid #f1f5f9; }
  table.data tbody tr:last-child { border-bottom: 0; }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }

  .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: #64748b; }
  .kpi .value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }

  .badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; background: #f1f5f9; color: #0f172a; }
  .badge.danger { background: #fee2e2; color: #991b1b; }
  .badge.success { background: #dcfce7; color: #166534; }
  .badge.warn { background: #fef3c7; color: #854d0e; }

  .doc-footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }

  .print-actions { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; z-index: 50; }
  .print-actions button { border: 1px solid #cbd5e1; background: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
  .print-actions button.primary { background: ${primary}; border-color: ${primary}; color: #fff; }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; padding: 0; max-width: none; margin: 0; }
    .print-actions { display: none; }
    .doc-section { break-inside: avoid; }
  }`;
}

export function buildBrandedPrintHtml(options: BrandedPrintOptions): string {
  const styles = buildStyles(options);
  const header = buildHeader(options);
  const body = buildBody(options);
  const footer = buildFooter(options);
  const autoPrint = options.autoPrint !== false;
  return `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(options.title)}</title>
<style>${styles}</style>
</head><body>
<div class="print-actions">
  <button onclick="window.close()">Fechar</button>
  <button class="primary" onclick="window.print()">Imprimir / PDF</button>
</div>
<div class="sheet">
  ${header}
  <main class="doc-body">${body}</main>
  ${footer}
</div>
${autoPrint ? `<script>
window.addEventListener('load', function(){
  var imgs = Array.from(document.images);
  Promise.all(imgs.map(function(img){ if (img.complete) return null; return new Promise(function(r){ img.onload = img.onerror = r; }); }))
    .then(function(){ setTimeout(function(){ window.focus(); window.print(); }, 250); });
});
</script>` : ""}
</body></html>`;
}

export function openBrandedPrintDocument(options: BrandedPrintOptions): void {
  const html = buildBrandedPrintHtml(options);
  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) {
    alert("Permita janelas pop-up para gerar o documento.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
