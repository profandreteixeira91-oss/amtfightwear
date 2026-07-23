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
  /** Tamanho de página. Padrão A4. */
  pageSize?: "A4" | "Letter";
  /** Margem uniforme em milímetros. */
  marginMm?: number;
  /** Substitui o cabeçalho branded padrão por HTML customizado. */
  headerHtml?: string;
  /** Substitui o rodapé branded padrão por HTML customizado. Suporta os tokens `{{pagina_atual}}` e `{{total_paginas}}`. */
  footerHtml?: string;
  /** Exibir numeração no rodapé branded padrão. */
  showPageNumbers?: boolean;
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
  if (o.headerHtml && o.headerHtml.trim()) {
    return `<header class="doc-header-custom">${o.headerHtml}</header>
    <div class="doc-title-block">
      <h1>${escapeHtml(o.title)}</h1>
      ${o.subtitle ? `<p class="subtitle">${escapeHtml(o.subtitle)}</p>` : ""}
    </div>`;
  }
  const b = o.branding ?? {};
  const name = b.trade_name ?? b.legal_name ?? "AMT Dojo Manager";
  const primary = b.brand_primary || "#dc2626";
  const secondary = b.brand_secondary || "#0f172a";
  const logo = b.logo_url
    ? `<img src="${escapeHtml(b.logo_url)}" alt="${escapeHtml(name)}" crossorigin="anonymous" />`
    : `<div class="logo-fallback">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>`;
  const metaItems = [
    o.documentId ? `Documento nº ${escapeHtml(o.documentId)}` : null,
    `Emitido em ${escapeHtml(fmtNow())}`,
  ].filter(Boolean) as string[];
  return `
  <header class="doc-header" style="--doc-primary:${primary};--doc-secondary:${secondary}">
    <div class="doc-header-inner">
      <div class="brand">
        <div class="brand-logo">${logo}</div>
        <div class="brand-text">
          <div class="brand-eyebrow">AMT Dojo Manager</div>
          <div class="brand-name">${escapeHtml(name)}</div>
        </div>
      </div>
      <div class="doc-meta">
        ${metaItems.map((t) => `<span>${t}</span>`).join("")}
      </div>
    </div>
    <div class="doc-header-accent"></div>
  </header>
  <div class="doc-title-block">
    <h1>${escapeHtml(o.title)}</h1>
    ${o.subtitle ? `<p class="subtitle">${escapeHtml(o.subtitle)}</p>` : ""}
  </div>`;
}

function buildFooter(o: BrandedPrintOptions): string {
  if (o.footerHtml && o.footerHtml.trim()) {
    // Replace page tokens with CSS-driven counters so the same DOM
    // renders the current page number in every printed page.
    const html = o.footerHtml
      .replace(/\{\{\s*pagina_atual\s*\}\}/g, '<span class="page-num-current"></span>')
      .replace(/\{\{\s*total_paginas\s*\}\}/g, '<span class="page-num-total"></span>');
    return `<footer class="doc-footer-custom">${html}</footer>`;
  }
  const b = o.branding ?? {};
  const name = b.trade_name ?? b.legal_name ?? "AMT Dojo Manager";
  const left = o.footerLeft ?? name;
  const right = o.footerRight ?? "Powered by AMT Dojo Manager";
  const showNum = o.showPageNumbers !== false;
  return `<footer class="doc-footer">
    <span>${escapeHtml(left)}</span>
    ${showNum ? '<span class="page-num-inline">Página <span class="page-num-current"></span> de <span class="page-num-total"></span></span>' : '<span></span>'}
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
  const secondary = o.branding?.brand_secondary || "#0f172a";
  const orientation = o.orientation ?? "portrait";
  const pageSize = o.pageSize ?? "A4";
  const margin = Math.max(5, Math.min(40, o.marginMm ?? 16));
  const hasCustomHeader = !!(o.headerHtml && o.headerHtml.trim());
  const hasCustomFooter = !!(o.footerHtml && o.footerHtml.trim());
  return `
  :root { color-scheme: light; }
  @page {
    size: ${pageSize} ${orientation};
    margin: ${hasCustomHeader ? Math.max(margin, 25) : margin}mm ${margin}mm ${hasCustomFooter ? Math.max(margin, 25) : Math.max(margin, 18)}mm ${margin}mm;
    ${hasCustomHeader ? "@top-center { content: element(runningHeader); }" : ""}
    ${hasCustomFooter ? "@bottom-center { content: element(runningFooter); }" : ""}
  }
  /* Running elements repeat on every page and support page counters */
  .doc-header-custom { position: running(runningHeader); font-size: 10pt; color: #0f172a; }
  .doc-footer-custom { position: running(runningFooter); font-size: 10pt; color: #64748b; }
  /* CSS counters for page tokens rendered anywhere in the doc */
  .page-num-current::before { content: counter(page); }
  .page-num-total::before { content: counter(pages); }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #eef2f7; color: #0f172a; font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 11.5px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  body { padding: 28px 16px; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; padding: 0 0 44px; border-radius: 10px; box-shadow: 0 20px 60px rgba(15,23,42,.10); overflow: hidden; }
  main.doc-body { padding: 0 52px; }
  .doc-title-block { padding: 26px 52px 8px; }

  /* HEADER */
  .doc-header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 140%); color: #fff; padding: 22px 52px 20px; position: relative; }
  .doc-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .doc-header-accent { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 60%); }
  .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .brand-logo { width: 62px; height: 62px; border-radius: 12px; overflow: hidden; background: #fff; display: grid; place-items: center; flex: 0 0 auto; padding: 6px; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
  .brand-logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .logo-fallback { width: 100%; height: 100%; color: ${primary}; display: grid; place-items: center; font-weight: 800; font-size: 26px; background: #fff; border-radius: 8px; }
  .brand-text { min-width: 0; }
  .brand-eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: .22em; color: rgba(255,255,255,.75); font-weight: 600; }
  .brand-name { font-size: 18px; font-weight: 800; color: #fff; line-height: 1.15; margin-top: 2px; letter-spacing: -0.01em; }
  .doc-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-size: 10px; color: rgba(255,255,255,.9); text-align: right; font-variant-numeric: tabular-nums; }

  /* TITLE */
  .doc-title-block h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.015em; position: relative; padding-left: 14px; }
  .doc-title-block h1::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 4px; border-radius: 2px; background: ${primary}; }
  .doc-title-block .subtitle { margin: 6px 0 0 14px; color: #475569; font-size: 12.5px; }

  /* SECTIONS */
  .doc-section { padding: 18px 0; break-inside: avoid; page-break-inside: avoid; }
  .doc-section + .doc-section { border-top: 1px dashed #e2e8f0; }
  .doc-section h2 { margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: ${primary}; display: flex; align-items: center; gap: 8px; }
  .doc-section h2::before { content: ''; width: 18px; height: 2px; background: ${primary}; border-radius: 2px; }
  .section-body { color: #0f172a; }
  .section-body p { margin: 0 0 8px; }

  /* KV TABLE */
  table.kv { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; }
  table.kv th, table.kv td { text-align: left; padding: 9px 14px; vertical-align: top; font-size: 11.5px; }
  table.kv tr + tr { border-top: 1px solid #edf2f7; }
  table.kv th { width: 38%; color: #64748b; font-weight: 500; }
  table.kv td { color: #0f172a; font-weight: 600; }

  /* DATA TABLE */
  table.data { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 4px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  table.data th, table.data td { padding: 9px 12px; text-align: left; font-size: 11px; }
  table.data thead th { background: ${primary}; color: #fff; text-transform: uppercase; letter-spacing: .08em; font-size: 9.5px; font-weight: 700; border: 0; }
  table.data tbody tr { border-bottom: 1px solid #f1f5f9; }
  table.data tbody tr:nth-child(even) td { background: #fafbfc; }
  table.data tbody tr:last-child td { border-bottom: 0; }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }
  table.data tfoot td { background: #f1f5f9; font-weight: 700; border-top: 2px solid #cbd5e1; }

  /* KPI CARDS */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: .16em; color: #64748b; font-weight: 600; }
  .kpi .value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 6px; letter-spacing: -0.01em; }
  .kpi.accent { border-color: ${primary}; }
  .kpi.accent .value { color: ${primary}; }

  /* BADGES */
  .badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; }
  .badge.danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge.success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .badge.warn { background: #fef3c7; color: #854d0e; border-color: #fde68a; }
  .badge.brand { background: ${primary}; color: #fff; border-color: ${primary}; }

  /* FOOTER */
  .doc-footer { display: flex; justify-content: space-between; align-items: center; margin: 28px 52px 0; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }
  .doc-footer .page-num-inline { color: #94a3b8; font-variant-numeric: tabular-nums; }
  .doc-footer-custom, .doc-header-custom { padding: 4mm 6mm; }
  .doc-footer-custom img, .doc-header-custom img { max-height: 40px; }

  /* ACTION BAR (screen only) */
  .print-actions { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 50; }
  .print-actions button { border: 1px solid #cbd5e1; background: #fff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(15,23,42,.08); color: #0f172a; }
  .print-actions button:hover { border-color: #94a3b8; }
  .print-actions button.primary { background: ${primary}; border-color: ${primary}; color: #fff; }
  .print-actions button.primary:hover { filter: brightness(.94); }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; padding: 0; max-width: none; margin: 0; }
    main.doc-body { padding: 0 4mm; }
    .doc-header { padding: 8mm 4mm; }
    .doc-title-block { padding: 6mm 4mm 2mm; }
    .doc-footer { margin: 8mm 4mm 0; }
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
