import { qrToDataURL } from "@/lib/qrcode-lazy";
import { jsPDF } from "jspdf";
import { formatBR } from "@/lib/dates";
import { jobCode, ORDER_TYPE_LABEL, STAGE_LABEL, URGENCY_LABEL } from "@/lib/store/production-stages";
import type { ProductionJob } from "@/lib/store/production.functions";
import type { OrderType, Stage, Urgency } from "@/lib/store/production-stages";

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
    doc.setDrawColor(200);
    doc.roundedRect(12, y, pageW - 24, 42, 2, 2);
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
    y += 48;
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
    i += 1;
  }

  doc.save(`etiquetas-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}
