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

/**
 * A fonte padrão do PDF (Helvetica) só tem os caracteres do Windows-1252: o resto (emoji,
 * setas, "≥") sai como lixo. Troca os comuns por equivalentes e descarta o que não existe.
 */
const WIN1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const CHAR_MAP: Record<string, string> = {
  "≥": ">=", "≤": "<=", "→": "->", "←": "<-", "⇒": "=>", "≠": "!=", "−": "-", "‐": "-", "‑": "-",
  " ": " ", " ": " ", " ": " ", "​": "", "\t": " ",
};
export function pdfSafeText(value: unknown): string {
  const src = String(value ?? "").replace(/\r\n?/g, "\n");
  let out = "";
  for (const ch of src) {
    const code = ch.codePointAt(0)!;
    if (ch === "\n" || (code >= 32 && code < 127) || (code >= 160 && code <= 255) || WIN1252_EXTRA.has(ch)) {
      out += ch;
    } else if (ch in CHAR_MAP) {
      out += CHAR_MAP[ch];
    } else {
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const c = base.codePointAt(0) ?? 0;
      if (base && ((c >= 32 && c < 127) || (c >= 160 && c <= 255))) out += base;
    }
  }
  return out;
}

type FontStyle = "normal" | "bold";

export async function buildQuotePdf(q: QuotePdfData): Promise<{ blob: Blob; url: string; filename: string }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  /** Nada do conteúdo passa desta linha: abaixo fica o rodapé. */
  const BOTTOM = H - 58;
  let y = M;

  const co = q.company ?? {};
  const companyName = pdfSafeText(co.company_name || "AMT Fight Wear");

  // Toda medida usa a mesma fonte do desenho: é isso que evita texto sobreposto.
  const font = (style: FontStyle, size: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const wrap = (text: unknown, width: number, style: FontStyle, size: number): string[] => {
    font(style, size);
    const clean = pdfSafeText(text).trim();
    return clean ? (doc.splitTextToSize(clean, width) as string[]) : [];
  };
  /** Valor curto numa coluna estreita: reduz a fonte até caber, sem cortar. */
  const fitSize = (text: string, width: number, style: FontStyle, size: number, min = 6) => {
    let s = size;
    font(style, s);
    while (s > min && doc.getTextWidth(text) > width) {
      s -= 0.25;
      font(style, s);
    }
    return s;
  };
  const drawLines = (lines: string[], x: number, firstBaseline: number, lineH: number, align?: "right") => {
    lines.forEach((l, i) => doc.text(l, x, firstBaseline + i * lineH, align ? { align } : undefined));
  };
  const newPage = () => {
    doc.addPage();
    y = M;
  };
  const ensure = (need: number) => {
    if (y + need > BOTTOM) newPage();
  };

  // ---------- Cabeçalho ----------
  // Bloco da direita ("ORÇAMENTO / Nº / datas") ocupa só a largura do seu maior texto.
  const quoteNo = pdfSafeText(`Nº ${q.quote_number}`);
  const issued = `Emissão: ${brDate(q.created_at ?? new Date().toISOString())}`;
  const validUntil = `Validade: ${brDate(q.valid_until)}`;
  const widthOf = (t: string, style: FontStyle, size: number) => {
    font(style, size);
    return doc.getTextWidth(t);
  };
  const rightW = Math.min(
    200,
    Math.max(widthOf("ORÇAMENTO", "bold", 13), widthOf(quoteNo, "bold", 10), widthOf(issued, "normal", 8.5), widthOf(validUntil, "normal", 8.5)),
  );
  const leftX = M + 76;
  const leftW = W - M - rightW - 12 - leftX;
  // Nome da empresa: reduz até 14pt; se ainda não couber, quebra em linhas.
  const nameSize = fitSize(companyName, leftW, "bold", 19, 14);
  const nameLines = wrap(companyName, leftW, "bold", nameSize);
  const nameLH = nameSize * 1.1;
  const coTop = 44 + (nameLines.length - 1) * nameLH + 14;
  const coLines = [
    co.cnpj ? `CNPJ ${co.cnpj}` : null,
    co.address || null,
    [co.phone, co.email, co.site].filter(Boolean).join("  ·  ") || null,
  ]
    .filter(Boolean)
    .flatMap((l) => wrap(l, leftW, "normal", 8.5));
  const headerH = Math.max(108, coTop + coLines.length * 11 + 8);

  doc.setFillColor(15, 15, 17);
  doc.rect(0, 0, W, headerH, "F");
  doc.setFillColor(220, 38, 38);
  doc.rect(0, headerH - 4, W, 4, "F");

  // Card branco com a logo AMT Fight Wear no canto superior esquerdo
  const boxSize = 72;
  const boxX = M - 14;
  const boxY = 18;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxSize, boxSize, 6, 6, "F");

  const logo = await toDataUrl(amtLogoWhite);
  if (logo) {
    try {
      doc.addImage(logo, fmt(logo), boxX + 5, boxY + 5, boxSize - 10, boxSize - 10);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  font("bold", nameSize);
  drawLines(nameLines, leftX, 44, nameLH);
  font("normal", 8.5);
  doc.setTextColor(200, 200, 205);
  drawLines(coLines, leftX, coTop, 11);

  doc.setTextColor(255, 255, 255);
  font("bold", 13);
  doc.text("ORÇAMENTO", W - M, 40, { align: "right" });
  doc.setTextColor(248, 113, 113);
  font("bold", fitSize(quoteNo, rightW, "bold", 10));
  doc.text(quoteNo, W - M, 56, { align: "right" });
  font("normal", 8.5);
  doc.setTextColor(200, 200, 205);
  doc.text(issued, W - M, 70, { align: "right" });
  doc.text(validUntil, W - M, 82, { align: "right" });

  doc.setTextColor(20, 20, 20);
  y = headerH + 30;

  // ---------- Cliente ----------
  const addr = q.customer_address ?? {};
  const addrLine1 = [addr.street, addr.number].filter(Boolean).join(", ") +
    (addr.complement ? ` - ${addr.complement}` : "");
  const addrLine2 = [
    addr.neighborhood,
    [addr.city, addr.state].filter(Boolean).join("/"),
    addr.zip ? `CEP ${addr.zip}` : "",
  ].filter(Boolean).join(" · ");

  const clientValueX = M + 80;
  const clientValueW = W - M - 12 - clientValueX;
  const clientRows = ([
    ["Cliente", q.customer_name || "—"],
    q.customer_company ? ["Empresa", q.customer_company] : null,
    q.customer_document ? ["CPF/CNPJ", q.customer_document] : null,
    q.customer_email ? ["E-mail", q.customer_email] : null,
    q.customer_phone ? ["Telefone", q.customer_phone] : null,
    addrLine1.trim() ? ["Endereço", addrLine1] : null,
    addrLine2.trim() ? ["", addrLine2] : null,
  ].filter(Boolean) as string[][]).map(([label, val]) => ({
    label,
    lines: wrap(val, clientValueW, "normal", 9),
  }));

  const boxH = 26 + clientRows.reduce((a, r) => a + Math.max(1, r.lines.length) * 12 + 1, 0) + 4;
  ensure(boxH);
  doc.setFillColor(248, 248, 249);
  doc.setDrawColor(228, 228, 232);
  doc.roundedRect(M, y, W - M * 2, boxH, 6, 6, "FD");
  font("bold", 9);
  doc.setTextColor(120, 120, 128);
  doc.text("DADOS DO CLIENTE", M + 12, y + 16);
  let ry = y + 32;
  clientRows.forEach(({ label, lines }) => {
    font("bold", 8.5);
    doc.setTextColor(120, 120, 128);
    if (label) doc.text(label, M + 12, ry);
    font("normal", 9);
    doc.setTextColor(25, 25, 28);
    drawLines(lines, clientValueX, ry, 12);
    ry += Math.max(1, lines.length) * 12 + 1;
  });
  y += boxH + 22;

  // ---------- Itens ----------
  // Colunas com largura fixa e respiro entre elas; o nome do produto quebra linha
  // dentro da sua coluna e nunca alcança a quantidade.
  const GAP = 14;
  const totalR = W - M - 10;
  const totalW = 84;
  const unitR = totalR - totalW - GAP;
  const unitW = 78;
  const qtyR = unitR - unitW - GAP;
  const qtyW = 36;
  const nameX = M + 10;
  const nameW = qtyR - qtyW - GAP - nameX;
  const NAME_SIZE = 9.5;
  const NAME_LH = 11.5;
  const DESC_SIZE = 8;
  const DESC_LH = 10;
  const HEADER_H = 22;

  const headerRow = () => {
    doc.setFillColor(15, 15, 17);
    doc.rect(M, y, W - M * 2, HEADER_H, "F");
    doc.setTextColor(255, 255, 255);
    font("bold", 8.5);
    doc.text("PRODUTO", nameX, y + 14);
    doc.text("QTD", qtyR, y + 14, { align: "right" });
    doc.text("VALOR UNIT.", unitR, y + 14, { align: "right" });
    doc.text("TOTAL", totalR, y + 14, { align: "right" });
    y += HEADER_H;
    doc.setTextColor(25, 25, 28);
  };

  ensure(HEADER_H + 30);
  headerRow();

  type Line = { text: string; desc: boolean };
  const lineH = (l: Line) => (l.desc ? DESC_LH : NAME_LH);
  const rowHeight = (ls: Line[]) => 6 + ls.reduce((a, l) => a + lineH(l), 0) + 8;

  q.items.forEach((it, idx) => {
    const lines: Line[] = [
      ...wrap(it.name, nameW, "bold", NAME_SIZE).map((text) => ({ text, desc: false })),
      ...wrap(it.description, nameW, "normal", DESC_SIZE).map((text) => ({ text, desc: true })),
    ];
    if (!lines.length) lines.push({ text: "—", desc: false });

    // A linha inteira vai para a próxima página quando não cabe; só um item maior
    // que uma página inteira é dividido, e continua na página seguinte.
    if (y + rowHeight(lines) > BOTTOM && y > M + HEADER_H) {
      newPage();
      headerRow();
    }

    let first = true;
    let rest = lines;
    while (rest.length) {
      let take = 0;
      let used = 14;
      while (take < rest.length && y + used + lineH(rest[take]) <= BOTTOM) {
        used += lineH(rest[take]);
        take++;
      }
      if (take === 0) {
        newPage();
        headerRow();
        continue;
      }
      const chunk = rest.slice(0, take);
      rest = rest.slice(take);
      const rowH = rowHeight(chunk);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 251);
        doc.rect(M, y, W - M * 2, rowH, "F");
      }
      let top = y + 6;
      chunk.forEach((l) => {
        // Linha de base a ~80% da altura da fonte abaixo do topo da linha.
        const size = l.desc ? DESC_SIZE : NAME_SIZE;
        font(l.desc ? "normal" : "bold", size);
        doc.setTextColor(l.desc ? 120 : 25, l.desc ? 120 : 25, l.desc ? 128 : 28);
        doc.text(l.text, nameX, top + size * 0.8 + 2);
        top += lineH(l);
      });
      if (first) {
        const base = y + 6 + NAME_SIZE * 0.8 + 2;
        const qty = String(it.quantity).replace(".", ",");
        const unit = brl(it.unit_price);
        const total = brl(it.quantity * it.unit_price);
        doc.setTextColor(25, 25, 28);
        font("normal", fitSize(qty, qtyW, "normal", 9));
        doc.text(qty, qtyR, base, { align: "right" });
        font("normal", fitSize(unit, unitW, "normal", 9));
        doc.text(unit, unitR, base, { align: "right" });
        font("bold", fitSize(total, totalW, "bold", 9));
        doc.text(total, totalR, base, { align: "right" });
        first = false;
      }
      doc.setDrawColor(235, 235, 238);
      doc.line(M, y + rowH, W - M, y + rowH);
      y += rowH;
      if (rest.length) {
        newPage();
        headerRow();
      }
    }
  });

  y += 18;

  // ---------- Totais ----------
  const totalRows: Array<[string, string]> = [["Subtotal", brl(q.subtotal)]];
  if (q.discount > 0) totalRows.push(["Desconto", `- ${brl(q.discount)}`]);
  if (q.shipping_cost > 0) totalRows.push(["Frete", brl(q.shipping_cost)]);
  ensure(totalRows.length * 15 + 40);
  const tx = W - M - 220;
  const totalsRow = (label: string, value: string, bold = false) => {
    const style: FontStyle = bold ? "bold" : "normal";
    const size = bold ? 11 : 9.5;
    font(style, size);
    doc.setTextColor(bold ? 25 : 110, bold ? 25 : 110, bold ? 28 : 118);
    doc.text(label, tx, y);
    doc.setTextColor(25, 25, 28);
    font(style, fitSize(value, 140, style, size));
    doc.text(value, W - M, y, { align: "right" });
    y += bold ? 18 : 15;
  };
  totalRows.forEach(([l, v]) => totalsRow(l, v));
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
    const lines = wrap(body, W - M * 2, "normal", 9);
    if (!lines.length) return;
    ensure(13 + Math.min(lines.length, 3) * 11);
    font("bold", 9);
    doc.setTextColor(120, 120, 128);
    doc.text(title.toUpperCase(), M, y);
    y += 13;
    // Linha a linha: um texto longo continua na página seguinte em vez de invadir o rodapé.
    lines.forEach((l) => {
      if (y + 3 > BOTTOM) newPage();
      font("normal", 9);
      doc.setTextColor(35, 35, 40);
      doc.text(l, M, y);
      y += 11;
    });
    y += 12;
  });

  // ---------- Assinatura ----------
  const sealW = 170;
  const sealText = wrap(
    `Orçamento ${q.quote_number} emitido eletronicamente por ${companyName} em ${brDate(
      q.created_at ?? new Date().toISOString(),
    )}. Válido até ${brDate(q.valid_until)}.`,
    sealW - 24,
    "normal",
    7.5,
  );
  const sealH = 28 + sealText.length * 9 + 8;
  const signerW = W - M * 2 - sealW - 24;
  const signerName = wrap(q.signer_name || companyName, signerW, "bold", 9.5);
  const signerInfo = [
    ...wrap(q.signer_role || "Responsável comercial", signerW, "normal", 8.5),
    ...(co.cnpj ? wrap(`${companyName} · CNPJ ${co.cnpj}`, signerW, "normal", 8.5) : []),
  ];
  // y = linha da assinatura. Acima dela: imagem (44pt) e selo (40pt); abaixo: nome e dados.
  const below = Math.max(14 + signerName.length * 12 + signerInfo.length * 12, sealH - 40);
  if (BOTTOM - below - 44 < y + 16) newPage();
  y = BOTTOM - below;

  if (q.signature_image) {
    const sig = await toDataUrl(q.signature_image);
    if (sig) {
      try {
        doc.addImage(sig, fmt(sig), M + 10, y - 44, 150, 52);
      } catch {}
    }
  }
  doc.setDrawColor(60, 60, 66);
  doc.line(M, y + 14, M + Math.min(220, signerW), y + 14);
  let sy = y + 28;
  font("bold", 9.5);
  doc.setTextColor(25, 25, 28);
  drawLines(signerName, M, sy, 12);
  sy += signerName.length * 12;
  font("normal", 8.5);
  doc.setTextColor(110, 110, 118);
  drawLines(signerInfo, M, sy, 12);

  // Selo de validação
  doc.setDrawColor(220, 38, 38);
  doc.roundedRect(W - M - sealW, y - 40, sealW, sealH, 6, 6, "S");
  font("bold", 8);
  doc.setTextColor(220, 38, 38);
  doc.text("DOCUMENTO ASSINADO", W - M - sealW + 12, y - 24);
  font("normal", 7.5);
  doc.setTextColor(90, 90, 96);
  drawLines(sealText, W - M - sealW + 12, y - 12, 9);

  // ---------- Rodapé ----------
  const pages = doc.getNumberOfPages();
  const footerLeft = wrap([companyName, co.site, co.phone].filter(Boolean).join("  ·  "), W - M * 2 - 80, "normal", 7.5);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(232, 232, 236);
    doc.line(M, H - 44, W - M, H - 44);
    font("normal", 7.5);
    doc.setTextColor(140, 140, 148);
    drawLines(footerLeft.slice(0, 2), M, H - 30, 9);
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
