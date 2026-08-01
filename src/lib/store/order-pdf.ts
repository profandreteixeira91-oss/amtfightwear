import jsPDF from "jspdf";
import { orderStatusLabel, paymentStatusLabel } from "./order-status";

type OrderInfo = {
  order_number: string | number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone?: string | null;
  customer_document?: string | null;
  shipping_address?: Record<string, any> | null;
  subtotal?: number | string | null;
  shipping_cost?: number | string | null;
  total: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type OrderItem = {
  product_name: string;
  variant_label?: string | null;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  image_url?: string | null;
  production_days?: number | null;
  custom_config?: Record<string, any> | null;
};

const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function toDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const r = await fetch(url, { mode: "cors" });
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

function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
}

export async function exportOrderPdf(order: OrderInfo, items: OrderItem[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const ensureSpace = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AMT Fight Wear", M, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Pedido #${order.order_number ?? "—"}`, W - M, y, { align: "right" });
  y += 22;
  doc.setDrawColor(200);
  doc.line(M, y, W - M, y);
  y += 18;

  // Customer / shipping
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Cliente", M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const custLines = [
    `Nome: ${order.customer_name ?? "—"}`,
    `E-mail: ${order.customer_email ?? "—"}`,
    order.customer_phone ? `Telefone: ${order.customer_phone}` : null,
    order.customer_document ? `Documento: ${order.customer_document}` : null,
    order.created_at ? `Data: ${new Date(order.created_at).toLocaleString("pt-BR")}` : null,
  ].filter(Boolean) as string[];
  custLines.forEach((l) => {
    doc.text(l, M, y);
    y += 13;
  });

  if (order.shipping_address) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Endereço de entrega", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const a = order.shipping_address;
    const addrLines = [
      `${a.street ?? ""}${a.number ? ", " + a.number : ""}${a.complement ? " - " + a.complement : ""}`,
      `${a.neighborhood ?? ""}${a.neighborhood ? " · " : ""}${a.city ?? ""}/${a.state ?? ""}${a.zip ? " · CEP " + a.zip : ""}`,
    ].filter((s) => s.trim());
    addrLines.forEach((l) => {
      doc.text(l, M, y);
      y += 13;
    });
  }

  y += 10;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 16;

  // Items
  for (const it of items) {
    ensureSpace(120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${it.product_name} × ${it.quantity}`, M, y);
    doc.text(brl(it.total_price), W - M, y, { align: "right" });
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (it.variant_label) {
      doc.text(it.variant_label, M, y);
      y += 12;
    }
    doc.text(`Unitário: ${brl(it.unit_price)}`, M, y);
    if (it.production_days) doc.text(`Produção: ${it.production_days} dias úteis`, M + 200, y);
    y += 14;

    const cfg = it.custom_config;
    const preview = cfg?.preview_image as string | undefined;
    // Preview image
    if (preview) {
      const px = await toDataUrl(preview);
      if (px) {
        const iw = 220;
        const ih = 220;
        ensureSpace(ih + 10);
        try {
          doc.addImage(px, detectFormat(px), M, y, iw, ih);
        } catch {}
        // Custom details on the right
        let cy = y + 4;
        const cx = M + iw + 16;
        const cw = W - M - cx;
        const line = (label: string, val: string) => {
          doc.setFont("helvetica", "bold");
          doc.text(label, cx, cy);
          doc.setFont("helvetica", "normal");
          const wrapped = doc.splitTextToSize(val, cw - 70);
          doc.text(wrapped, cx + 70, cy);
          cy += 12 * Math.max(1, wrapped.length);
        };
        if (cfg?.template_name) line("Modelo:", String(cfg.template_name));
        if (cfg?.modality) line("Modalidade:", String(cfg.modality));
        if (cfg?.fabric?.name) line("Tecido:", String(cfg.fabric.name));
        if (cfg?.coloring?.name) line("Coloração:", String(cfg.coloring.name));
        if (cfg?.label_choice) line("Etiqueta:", cfg.label_choice === "custom" ? "Personalizada" : "Padrão");
        if (cfg?.zones && typeof cfg.zones === "object") {
          const entries = Object.entries(cfg.zones as Record<string, string>);
          if (entries.length) {
            line("Cores:", entries.map(([k, v]) => `${k}: ${v}`).join(" · "));
          }
        }
        const embs = (cfg?.embroideries ?? []) as Array<Record<string, any>>;
        if (embs.length) {
          embs.forEach((e, i) => {
            const parts = [
              e.slot_key,
              e.technique,
              e.format,
              e.mode === "text" ? `"${e.text ?? ""}"` : e.image?.filename ?? "imagem",
            ].filter(Boolean);
            line(`Aplicação ${i + 1}:`, parts.join(" · "));
          });
        }
        y = Math.max(y + ih + 10, cy + 6);
      }
    } else if (cfg) {
      // No preview but custom → dump summary
      const summary = [
        cfg.template_name ? `Modelo: ${cfg.template_name}` : null,
        cfg.fabric?.name ? `Tecido: ${cfg.fabric.name}` : null,
        cfg.modality ? `Modalidade: ${cfg.modality}` : null,
      ].filter(Boolean) as string[];
      summary.forEach((s) => {
        doc.text(s, M, y);
        y += 12;
      });
    }

    // Uploaded images gallery
    const uploaded: Array<{ label: string; url: string }> = [];
    const emb = (cfg?.embroideries ?? []) as Array<Record<string, any>>;
    emb.forEach((e, i) => {
      if (e?.image?.data_url) uploaded.push({ label: `Aplicação ${i + 1} — ${e.slot_key ?? ""}`, url: e.image.data_url });
    });
    if (cfg?.logo_image?.data_url) uploaded.push({ label: "Logo", url: cfg.logo_image.data_url });
    if (cfg?.label_image?.data_url) uploaded.push({ label: "Etiqueta", url: cfg.label_image.data_url });

    if (uploaded.length) {
      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.text("Imagens enviadas pelo cliente:", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const thumb = 90;
      let x = M;
      for (const u of uploaded) {
        if (x + thumb > W - M) {
          x = M;
          y += thumb + 24;
          ensureSpace(thumb + 24);
        }
        ensureSpace(thumb + 24);
        const dx = await toDataUrl(u.url);
        if (dx) {
          try {
            doc.addImage(dx, detectFormat(dx), x, y, thumb, thumb);
          } catch {}
        }
        doc.setFontSize(8);
        const t = doc.splitTextToSize(u.label, thumb);
        doc.text(t, x, y + thumb + 10);
        doc.setFontSize(10);
        x += thumb + 12;
      }
      y += thumb + 26;
    }

    y += 8;
    doc.setDrawColor(230);
    doc.line(M, y, W - M, y);
    y += 12;
  }

  // Totals
  ensureSpace(70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rightVal = (label: string, val: string) => {
    doc.text(label, W - M - 140, y);
    doc.text(val, W - M, y, { align: "right" });
    y += 14;
  };
  if (order.subtotal != null) rightVal("Subtotal", brl(order.subtotal));
  if (order.shipping_cost != null) rightVal("Frete", brl(order.shipping_cost));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  rightVal("Total", brl(order.total));
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (order.status) doc.text(`Status pedido: ${order.status}`, M, y), (y += 12);
  if (order.payment_status) doc.text(`Status pagamento: ${order.payment_status}`, M, y), (y += 12);
  if (order.notes) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    const w = doc.splitTextToSize(order.notes, W - 2 * M);
    doc.text(w, M, y);
  }

  doc.save(`pedido-${order.order_number ?? "amt"}.pdf`);
}
