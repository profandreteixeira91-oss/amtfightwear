import { qrToDataURL } from "@/lib/qrcode-lazy";
import { jsPDF } from "jspdf";
import { formatBR } from "@/lib/dates";
import { jobCode, ORDER_TYPE_LABEL, STAGE_LABEL, URGENCY_LABEL } from "@/lib/store/production-stages";
import type { ProductionJob } from "@/lib/store/production.functions";
import type { OrderType, Stage, Urgency } from "@/lib/store/production-stages";
import {
  BELT_COLOR_ORDER,
  DISCIPLINE_LABEL,
  EMBROIDERY_LABEL,
  beltColorText,
  beltGroupKey,
  beltShapes,
  jobBelt,
  type BeltSpec,
} from "@/lib/store/belt";

/** Desenho vetorial da faixa no PDF (mesma geometria da tela). */
function drawBelt(doc: jsPDF, spec: BeltSpec, x: number, y: number, w: number, h: number) {
  for (const sh of beltShapes(spec)) {
    doc.setFillColor(sh.fill);
    doc.rect(x + sh.x * w, y + sh.y * h, sh.w * w, sh.h * h, "F");
  }
  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 0.8, 0.8, "S");
}

const beltLine = (b: BeltSpec) =>
  [
    DISCIPLINE_LABEL[b.discipline],
    beltColorText(b),
    b.kids ? "infantil" : null,
    b.line ? `Linha ${b.line}` : null,
    b.embroidery ? EMBROIDERY_LABEL[b.embroidery] : null,
  ]
    .filter(Boolean)
    .join(" · ");

const embroideryName = (j: ProductionJob) => {
  const v = j.custom_config?.embroidery_name;
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

async function qrDataUrl(text: string): Promise<string> {
  return qrToDataURL(text, { margin: 0, width: 240, errorCorrectionLevel: "M" });
}

/**
 * Folha de produção: um bloco por item com pedido, cliente, produto,
 * quantidade, observações e QR Code para o scanner da fábrica.
 */
export async function printProductionSheet(jobs: ProductionJob[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Folha de produção — AMT Fight Wear", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Emitida em ${formatBR(new Date())} · ${jobs.length} item(ns)`, 14, y);
  y += 8;

  for (const j of jobs) {
    if (y > 250) {
      doc.addPage();
      y = 16;
    }
    const qr = await qrDataUrl(`PJ:${j.id}`);
    const belt = jobBelt(j);
    const name = embroideryName(j);
    const boxH = belt || name ? 52 : 42;
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.roundedRect(12, y, pageW - 24, boxH, 2, 2);
    doc.addImage(qr, "PNG", pageW - 42, y + 5, 26, 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${j.reference ?? jobCode(j.id)}`, 18, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Cliente: ${j.customer_name ?? "—"}`, 18, y + 15);
    doc.text(
      `Produto: ${j.product_name}${j.variant_label ? ` (${j.variant_label})` : ""}`,
      18,
      y + 20,
    );
    doc.text(
      `Qtd: ${j.quantity}  ·  Etapa: ${STAGE_LABEL[j.stage as Stage] ?? j.stage}  ·  Urgência: ${
        URGENCY_LABEL[j.urgency as Urgency] ?? j.urgency
      }  ·  Origem: ${ORDER_TYPE_LABEL[j.order_type as OrderType] ?? j.order_type}`,
      18,
      y + 25,
    );
    doc.text(`Prazo: ${j.deadline ? formatBR(j.deadline) : "—"}  ·  Código: ${jobCode(j.id)}`, 18, y + 30);
    const notes = (j.notes ?? "").slice(0, 120);
    doc.text(`Obs.: ${notes || "—"}`, 18, y + 35);
    if (belt) {
      drawBelt(doc, belt, 18, y + 39, 46, 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${belt.size ? `${belt.size}  ` : ""}${beltLine(belt)}`.slice(0, 95), 68, y + 43.5);
    }
    if (name) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Bordar: ${name}`, 18, y + (belt ? 50 : 43.5));
    }
    doc.setFont("helvetica", "normal");
    y += boxH + 6;
  }

  doc.save(`folha-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Etiquetas 70x40mm (3 colunas) para separação, corte, costura, bordado,
 * DTF e embalagem — com QR Code para avanço de etapa via scanner.
 */
export async function printProductionLabels(jobs: ProductionJob[], setor?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cols = 3;
  const w = 66;
  const h = 40;
  const gapX = 4;
  const gapY = 4;
  const startX = 8;
  const startY = 10;
  let i = 0;

  for (const j of jobs) {
    const perPage = cols * 6;
    if (i > 0 && i % perPage === 0) doc.addPage();
    const idx = i % perPage;
    const x = startX + (idx % cols) * (w + gapX);
    const y = startY + Math.floor(idx / cols) * (h + gapY);

    doc.setDrawColor(180);
    doc.roundedRect(x, y, w, h, 1.5, 1.5);
    const qr = await qrDataUrl(`PJ:${j.id}`);
    doc.addImage(qr, "PNG", x + w - 22, y + 4, 18, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(j.reference ?? jobCode(j.id)).slice(0, 22), x + 4, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(String(j.product_name).slice(0, 32), x + 4, y + 13);
    doc.text(String(j.variant_label ?? "—").slice(0, 32), x + 4, y + 17);
    doc.text(`Qtd: ${j.quantity}`, x + 4, y + 21);
    doc.text(`Cliente: ${String(j.customer_name ?? "—").slice(0, 26)}`, x + 4, y + 25);
    doc.text(`Setor: ${setor ?? STAGE_LABEL[j.stage as Stage] ?? j.stage}`, x + 4, y + 29);
    doc.setFont("helvetica", "bold");
    doc.text(jobCode(j.id), x + 4, y + 34);
    const belt = jobBelt(j);
    if (belt) drawBelt(doc, belt, x + 4, y + 36, w - 8, 2.6);
    i += 1;
  }

  doc.save(`etiquetas-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ------------------------- Lista de separação e corte ------------------------- */

const SIZE_ORDER = (size: string | null) => {
  if (!size) return [99, ""] as const;
  const m = /^([A-Z]*)(\d+)$/.exec(size);
  return m ? ([m[1].charCodeAt(0) || 0, Number(m[2])] as const) : ([98, size] as const);
};

/**
 * Soma as peças da fila para separar material e cortar de uma vez:
 * faixas por modalidade, cor e tamanho (com o desenho), demais peças por
 * produto e variante, e a lista de nomes a bordar.
 */
export function printSeparationList(jobs: ProductionJob[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const left = 12;
  const right = pageW - 12;
  let y = 14;

  const belts = new Map<string, { spec: BeltSpec; qty: number; refs: Set<string> }>();
  const others = new Map<string, { name: string; variant: string | null; qty: number; refs: Set<string> }>();
  const embroidery: Array<{ name: string; job: ProductionJob; belt: BeltSpec | null }> = [];
  for (const j of jobs) {
    const qty = Number(j.quantity || 0);
    const ref = j.reference ?? jobCode(j.id);
    const belt = jobBelt(j);
    if (belt) {
      const key = beltGroupKey(belt);
      const g = belts.get(key) ?? { spec: belt, qty: 0, refs: new Set<string>() };
      g.qty += qty;
      g.refs.add(ref);
      belts.set(key, g);
    } else {
      const key = `${j.product_name}|${j.variant_label ?? ""}`;
      const g = others.get(key) ?? { name: j.product_name, variant: j.variant_label, qty: 0, refs: new Set<string>() };
      g.qty += qty;
      g.refs.add(ref);
      others.set(key, g);
    }
    const name = embroideryName(j);
    if (name || belt?.embroidery === "nome") embroidery.push({ name: name ?? "", job: j, belt });
  }

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text("Lista de separação — AMT Fight Wear", left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    const pieces = jobs.reduce((a, j) => a + Number(j.quantity || 0), 0);
    doc.text(`Emitida em ${formatBR(new Date())} · ${jobs.length} item(ns) da fila · ${pieces} peça(s)`, left, y + 5);
    doc.setTextColor(20);
    y += 12;
  };
  const ensure = (h: number) => {
    if (y + h > pageH - 12) {
      doc.addPage();
      y = 14;
    }
  };
  const section = (title: string, total: string) => {
    ensure(16);
    doc.setFillColor("#F1F1F1");
    doc.rect(left, y, right - left, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, left + 2, y + 4.8);
    doc.text(total, right - 2, y + 4.8, { align: "right" });
    y += 10;
  };
  const checkbox = (cy: number) => {
    doc.setDrawColor(90);
    doc.setLineWidth(0.3);
    doc.rect(left + 1, cy, 4, 4, "S");
  };
  const refsText = (refs: Set<string>) => {
    const list = [...refs];
    return list.length > 6 ? `${list.slice(0, 6).join(", ")} +${list.length - 6}` : list.join(", ");
  };

  header();

  // Faixas
  const beltRows = [...belts.values()].sort((a, b) => {
    const d = ["bjj", "judo", "outra"].indexOf(a.spec.discipline) - ["bjj", "judo", "outra"].indexOf(b.spec.discipline);
    if (d) return d;
    const ci = (c: BeltSpec["color"]) => (c ? BELT_COLOR_ORDER.indexOf(c) : 99);
    if (ci(a.spec.color) !== ci(b.spec.color)) return ci(a.spec.color) - ci(b.spec.color);
    const ka = beltColorText(a.spec);
    const kb = beltColorText(b.spec);
    if (ka !== kb) return ka.localeCompare(kb);
    const [sa, na] = SIZE_ORDER(a.spec.size);
    const [sb, nb] = SIZE_ORDER(b.spec.size);
    return sa !== sb ? Number(sa) - Number(sb) : String(na).localeCompare(String(nb), undefined, { numeric: true });
  });
  if (beltRows.length) {
    section("Faixas", `${beltRows.reduce((a, r) => a + r.qty, 0)} peça(s)`);
    const textW = right - 36 - (left + 56);
    const fit = (t: string) => String(doc.splitTextToSize(t, textW)[0] ?? "");
    for (const r of beltRows) {
      ensure(15);
      checkbox(y + 2);
      drawBelt(doc, r.spec, left + 8, y + 1.5, 44, 6);
      // Linha 1: modalidade e cor; linha 2: ponteira, linha e bordado; linha 3: pedidos.
      const [main, ...rest] = beltColorText(r.spec).split(" · ");
      const line1 = [DISCIPLINE_LABEL[r.spec.discipline], main, r.spec.kids ? "infantil" : null].filter(Boolean).join(" · ");
      const line2 = [...rest, r.spec.line ? `Linha ${r.spec.line}` : null, r.spec.embroidery ? EMBROIDERY_LABEL[r.spec.embroidery] : null]
        .filter(Boolean)
        .join(" · ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(fit(line1), left + 56, y + 3.8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (line2) doc.text(fit(line2), left + 56, y + 7.6);
      doc.setFontSize(7);
      doc.setTextColor(110);
      doc.text(fit(refsText(r.refs)), left + 56, y + 11.2);
      doc.setTextColor(20);
      // Tamanho e quantidade em destaque
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(r.spec.size ?? "—", right - 26, y + 6, { align: "center" });
      doc.setFontSize(14);
      doc.text(String(r.qty), right - 4, y + 6.3, { align: "right" });
      doc.setDrawColor(225);
      doc.setLineWidth(0.2);
      doc.line(left, y + 13, right, y + 13);
      y += 14.5;
    }
    y += 3;
  }

  // Outras peças
  const otherRows = [...others.values()].sort((a, b) => a.name.localeCompare(b.name) || String(a.variant).localeCompare(String(b.variant)));
  if (otherRows.length) {
    section("Outras peças", `${otherRows.reduce((a, r) => a + r.qty, 0)} peça(s)`);
    for (const r of otherRows) {
      ensure(11);
      checkbox(y + 0.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`${r.name}${r.variant ? ` · ${r.variant}` : ""}`.slice(0, 95), left + 8, y + 3.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(refsText(r.refs).slice(0, 110), left + 8, y + 7.5);
      doc.setTextColor(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(String(r.qty), right - 4, y + 5, { align: "right" });
      doc.setDrawColor(225);
      doc.line(left, y + 10, right, y + 10);
      y += 11.5;
    }
    y += 3;
  }

  // Bordados
  if (embroidery.length) {
    section("Bordados", `${embroidery.reduce((a, e) => a + Number(e.job.quantity || 0), 0)} peça(s)`);
    for (const e of embroidery) {
      ensure(14);
      checkbox(y + 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(e.name || "Nome: ver pedido", left + 8, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      const detail = [
        e.job.reference ?? jobCode(e.job.id),
        e.job.customer_name,
        `${Number(e.job.quantity)}×`,
        !e.name && e.job.variant_label ? `Obs.: ${e.job.variant_label}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      doc.text(detail.slice(0, 80), left + 8, y + 10);
      doc.setTextColor(20);
      if (e.belt) {
        drawBelt(doc, e.belt, right - 58, y + 2, 38, 5.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(e.belt.size ?? "", right - 4, y + 6.5, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(beltColorText(e.belt).slice(0, 42), right - 58, y + 11);
      }
      doc.setDrawColor(225);
      doc.line(left, y + 13, right, y + 13);
      y += 14.5;
    }
  }

  if (!beltRows.length && !otherRows.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Nenhuma peça para separar.", left, y + 4);
  }

  doc.save(`lista-separacao-${new Date().toISOString().slice(0, 10)}.pdf`);
}
