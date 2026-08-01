import jsPDF from "jspdf";
import amtLogoWhite from "@/assets/amt-fightwear-logo-white.jpg";

export type QuotePdfItem = {
  name: string;
  sku?: string | null;
  description?: string | null;
  quantity: number;
  unit_price: number;
};

export type QuotePdfData = {
  quote_number: string;
  created_at?: string | null;
  valid_until?: string | null;
  customer_name: string;
  customer_company?: string | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: Record<string, any> | null;
  items: QuotePdfItem[];
  discount: number;
  shipping_cost: number;
  subtotal: number;
  total: number;
  payment_terms?: string | null;
  delivery_terms?: string | null;
  notes?: string | null;
  signer_name?: string | null;
  signer_role?: string | null;
  signature_image?: string | null;
  company?: {
    company_name?: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    email?: string;
    site?: string;
  };
};

const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const brDate = (v?: string | null) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

async function toDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const r = await fetch(url);
    const b = await r.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

const fmt = (u: string) =>
  u.startsWith("data:image/jpeg") || u.startsWith("data:image/jpg") ? "JPEG" : "PNG";

export async function buildQuotePdf(q: QuotePdfData): Promise<{ blob: Blob; url: string; filename: string }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  let y = M;

  const co = q.company ?? {};
  const companyName = co.company_name || "AMT Fight Wear";

  const ensure = (need: number) => {
    if (y + need > H - 90) {
      doc.addPage();
      y = M;
    }
  };

  // ---------- Cabeçalho ----------
  doc.setFillColor(15, 15, 17);
  doc.rect(0, 0, W, 108, "F");
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 104, W, 4, "F");

  const logo = await toDataUrl(amtLogoAsset.url);
  if (logo) {
    try {
      doc.addImage(logo, fmt(logo), M, 28, 62, 51);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(companyName, M + 76, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 205);
  const coLines = [
    co.cnpj ? `CNPJ ${co.cnpj}` : null,
    co.address || null,
    [co.phone, co.email, co.site].filter(Boolean).join("  ·  ") || null,
  ].filter(Boolean) as string[];
  let cy = 58;
  coLines.forEach((l) => {
    doc.text(l, M + 76, cy);
    cy += 11;
  });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ORÇAMENTO", W - M, 40, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(248, 113, 113);
  doc.text(`Nº ${q.quote_number}`, W - M, 56, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 205);
  doc.text(`Emissão: ${brDate(q.created_at ?? new Date().toISOString())}`, W - M, 70, { align: "right" });
  doc.text(`Validade: ${brDate(q.valid_until)}`, W - M, 82, { align: "right" });

  doc.setTextColor(20, 20, 20);
  y = 138;

  // ---------- Cliente ----------
  const addr = q.customer_address ?? {};
  const addrLine1 = [addr.street, addr.number].filter(Boolean).join(", ") +
    (addr.complement ? ` - ${addr.complement}` : "");
  const addrLine2 = [
    addr.neighborhood,
    [addr.city, addr.state].filter(Boolean).join("/"),
    addr.zip ? `CEP ${addr.zip}` : "",
  ].filter(Boolean).join(" · ");

  const clientRows = [
    ["Cliente", q.customer_name || "—"],
    q.customer_company ? ["Empresa", q.customer_company] : null,
    q.customer_document ? ["CPF/CNPJ", q.customer_document] : null,
    q.customer_email ? ["E-mail", q.customer_email] : null,
    q.customer_phone ? ["Telefone", q.customer_phone] : null,
    addrLine1.trim() ? ["Endereço", addrLine1] : null,
    addrLine2.trim() ? ["", addrLine2] : null,
  ].filter(Boolean) as string[][];

  const boxH = 26 + clientRows.length * 13;
  doc.setFillColor(248, 248, 249);
  doc.setDrawColor(228, 228, 232);
  doc.roundedRect(M, y, W - M * 2, boxH, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 128);
  doc.text("DADOS DO CLIENTE", M + 12, y + 16);
  let ry = y + 32;
  clientRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 128);
    if (label) doc.text(label, M + 12, ry);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(25, 25, 28);
    doc.text(String(val), M + 80, ry);
    ry += 13;
  });
  y += boxH + 22;

  // ---------- Itens ----------
  const colQty = W - M - 250;
  const colUnit = W - M - 150;
  const colTotal = W - M;

  const headerRow = () => {
    doc.setFillColor(15, 15, 17);
    doc.rect(M, y, W - M * 2, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("PRODUTO", M + 10, y + 14);
    doc.text("QTD", colQty, y + 14, { align: "right" });
    doc.text("VALOR UNIT.", colUnit, y + 14, { align: "right" });
    doc.text("TOTAL", colTotal - 10, y + 14, { align: "right" });
    y += 22;
    doc.setTextColor(25, 25, 28);
  };

  headerRow();

  q.items.forEach((it, idx) => {
    const desc = (it.description || "").trim();
    const descLines = desc ? doc.splitTextToSize(desc, colQty - M - 24) : [];
    const rowH = 22 + descLines.length * 10;
    if (y + rowH > H - 120) {
      doc.addPage();
      y = M;
      headerRow();
    }
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 251);
      doc.rect(M, y, W - M * 2, rowH, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(25, 25, 28);
    doc.text(doc.splitTextToSize(it.name, colQty - M - 24)[0], M + 10, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(it.quantity).replace(".", ","), colQty, y + 14, { align: "right" });
    doc.text(brl(it.unit_price), colUnit, y + 14, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(brl(it.quantity * it.unit_price), colTotal - 10, y + 14, { align: "right" });

    if (descLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 128);
      doc.text(descLines, M + 10, y + 25);
    }
    doc.setDrawColor(235, 235, 238);
    doc.line(M, y + rowH, W - M, y + rowH);
    y += rowH;
  });

  y += 18;

  // ---------- Totais ----------
  ensure(110);
  const tx = W - M - 220;
  const totalsRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(bold ? 25 : 110, bold ? 25 : 110, bold ? 28 : 118);
    doc.text(label, tx, y);
    doc.setTextColor(25, 25, 28);
    doc.text(value, W - M, y, { align: "right" });
    y += bold ? 18 : 15;
  };
  totalsRow("Subtotal", brl(q.subtotal));
  if (q.discount > 0) totalsRow("Desconto", `- ${brl(q.discount)}`);
  if (q.shipping_cost > 0) totalsRow("Frete", brl(q.shipping_cost));
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(tx, y - 6, W - M, y - 6);
  doc.setLineWidth(0.5);
  y += 10;
  totalsRow("TOTAL", brl(q.total), true);
  y += 8;

  // ---------- Condições ----------
  const blocks = [
    q.payment_terms ? ["Condições de pagamento", q.payment_terms] : null,
    q.delivery_terms ? ["Prazo de entrega", q.delivery_terms] : null,
    q.notes ? ["Observações", q.notes] : null,
  ].filter(Boolean) as string[][];

  blocks.forEach(([title, body]) => {
    const lines = doc.splitTextToSize(body, W - M * 2 - 20);
    ensure(28 + lines.length * 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 128);
    doc.text(title.toUpperCase(), M, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(35, 35, 40);
    doc.text(lines, M, y);
    y += lines.length * 11 + 12;
  });

  // ---------- Assinatura ----------
  ensure(120);
  y = Math.max(y + 16, H - 190);

  if (q.signature_image) {
    const sig = await toDataUrl(q.signature_image);
    if (sig) {
      try {
        doc.addImage(sig, fmt(sig), M + 10, y - 44, 150, 52);
      } catch {}
    }
  }
  doc.setDrawColor(60, 60, 66);
  doc.line(M, y + 14, M + 220, y + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(25, 25, 28);
  doc.text(q.signer_name || companyName, M, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 118);
  doc.text(q.signer_role || "Responsável comercial", M, y + 40);
  if (co.cnpj) doc.text(`${companyName} · CNPJ ${co.cnpj}`, M, y + 52);

  // Selo de validação
  doc.setDrawColor(220, 38, 38);
  doc.roundedRect(W - M - 170, y - 40, 170, 74, 6, 6, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(220, 38, 38);
  doc.text("DOCUMENTO ASSINADO", W - M - 158, y - 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 96);
  doc.setFontSize(7.5);
  doc.text(
    doc.splitTextToSize(
      `Orçamento ${q.quote_number} emitido eletronicamente por ${companyName} em ${brDate(
        q.created_at ?? new Date().toISOString(),
      )}. Válido até ${brDate(q.valid_until)}.`,
      146,
    ),
    W - M - 158,
    y - 12,
  );

  // ---------- Rodapé ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(232, 232, 236);
    doc.line(M, H - 44, W - M, H - 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 148);
    doc.text(
      [companyName, co.site, co.phone].filter(Boolean).join("  ·  "),
      M,
      H - 30,
    );
    doc.text(`Página ${i} de ${pages}`, W - M, H - 30, { align: "right" });
  }

  // ---------- Nome do arquivo: ORC_NOMECLIENTE_DATA ----------
  const slugName = (q.customer_name || "CLIENTE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "CLIENTE";
  const fileDate = brDate(q.created_at ?? new Date().toISOString()).replace(/\//g, "-");
  const filename = `ORC_${slugName}_${fileDate}.pdf`;
  const blob = doc.output("blob") as Blob;
  return { blob, url: URL.createObjectURL(blob), filename };
}

export async function exportQuotePdf(q: QuotePdfData) {
  const { blob, filename } = await buildQuotePdf(q);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
