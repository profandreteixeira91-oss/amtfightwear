import type { EditorSchema } from "@/components/dojo/certificate-editor/types";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";

/** Extended variable catalog — every variable requested + fallbacks */
export const VARIABLE_MENU: { id: string; label: string; items: { key: string; label: string; sample?: string }[] }[] = [
  {
    id: "aluno", label: "Aluno", items: [
      { key: "aluno_nome", label: "Nome completo", sample: "João da Silva" },
      { key: "aluno_nome_social", label: "Nome social" },
      { key: "aluno_cpf", label: "CPF" },
      { key: "aluno_rg", label: "RG" },
      { key: "aluno_data_nascimento", label: "Data de nascimento" },
      { key: "aluno_idade", label: "Idade" },
      { key: "aluno_faixa", label: "Faixa (nome + grau)", sample: "Faixa Preta · 3º grau" },
      { key: "aluno_faixa_nome", label: "Faixa (nome)", sample: "Faixa Preta" },
      { key: "aluno_nova_faixa", label: "Nova faixa" },
      { key: "aluno_grau", label: "Grau (rótulo)", sample: "3º grau" },
      { key: "aluno_grau_numero", label: "Grau (número)", sample: "3" },
      { key: "aluno_modalidade", label: "Modalidade" },
      { key: "aluno_categoria", label: "Categoria" },
      { key: "aluno_turma", label: "Turma" },
    ],
  },
  {
    id: "equipe", label: "Equipe", items: [
      { key: "professor_nome", label: "Professor" },
      { key: "instrutor_nome", label: "Instrutor" },
      { key: "mestre_nome", label: "Mestre" },
    ],
  },
  {
    id: "academia", label: "Academia", items: [
      { key: "academia_nome", label: "Academia", sample: "AMT Jiu-Jitsu" },
      { key: "academia_cnpj", label: "CNPJ" },
      { key: "academia_cidade", label: "Cidade" },
      { key: "academia_estado", label: "Estado" },
      { key: "academia_pais", label: "País", sample: "Brasil" },
      { key: "academia_endereco", label: "Endereço" },
      { key: "academia_telefone", label: "Telefone" },
      { key: "academia_email", label: "E-mail" },
      { key: "academia_site", label: "Site" },
      { key: "academia_instagram", label: "Instagram" },
    ],
  },
  {
    id: "certificado", label: "Certificado", items: [
      { key: "certificado_numero", label: "Número" },
      { key: "certificado_codigo", label: "Código de validação" },
      { key: "data_emissao", label: "Data de emissão" },
      { key: "data_graduacao", label: "Data de graduação" },
      { key: "data_evento", label: "Data do evento" },
    ],
  },
  {
    id: "sistema", label: "Sistema", items: [
      { key: "data_atual", label: "Data" },
      { key: "ano_atual", label: "Ano" },
      { key: "mes_atual", label: "Mês" },
      { key: "dia_atual", label: "Dia" },
    ],
  },
];

export const ALL_VAR_KEYS = VARIABLE_MENU.flatMap((c) => c.items.map((i) => i.key));

/** Resolve {{key}} tokens into concrete values using a merged context. */
export function resolveText(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => (values[k] ?? `{{${k}}}`));
}

/** Sample values so the editor preview is not full of raw {{tokens}}. */
export function sampleValues(): Record<string, string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const map: Record<string, string> = {
    data_atual: now.toLocaleDateString("pt-BR"),
    ano_atual: String(now.getFullYear()),
    mes_atual: mm,
    dia_atual: dd,
  };
  for (const cat of VARIABLE_MENU) for (const it of cat.items) if (it.sample && !map[it.key]) map[it.key] = it.sample;
  return map;
}

/** Export a rendered canvas DOM node to a PDF or PNG file. */
export async function exportCanvasAsPng(node: HTMLElement, filename: string, doc: EditorSchema) {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, width: doc.page.width, height: doc.page.height });
  triggerDownload(dataUrl, `${filename}.png`);
}
export async function exportCanvasAsJpeg(node: HTMLElement, filename: string, doc: EditorSchema) {
  const dataUrl = await toJpeg(node, { pixelRatio: 2, quality: 0.95, cacheBust: true, width: doc.page.width, height: doc.page.height });
  triggerDownload(dataUrl, `${filename}.jpg`);
}
/** Render the canvas node into a properly-sized A4 PDF (fit contained, centered). */
async function buildA4Pdf(node: HTMLElement, doc: EditorSchema): Promise<jsPDF> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, width: doc.page.width, height: doc.page.height });
  const landscape = doc.page.width >= doc.page.height;
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // Fit image inside A4 preserving aspect ratio
  const imgAspect = doc.page.width / doc.page.height;
  const pageAspect = pageW / pageH;
  let w = pageW, h = pageH;
  if (imgAspect > pageAspect) { w = pageW; h = pageW / imgAspect; }
  else { h = pageH; w = pageH * imgAspect; }
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST");
  return pdf;
}

export async function exportCanvasAsPdf(node: HTMLElement, filename: string, doc: EditorSchema) {
  const pdf = await buildA4Pdf(node, doc);
  pdf.save(`${filename}.pdf`);
}

export async function printCanvas(node: HTMLElement, doc: EditorSchema, _title: string) {
  const pdf = await buildA4Pdf(node, doc);
  // Open the PDF blob in a new tab so the browser renders it at correct A4 proportions,
  // then auto-trigger print. Avoids @page CSS being overridden by user paper settings.
  const blobUrl = pdf.output("bloburl") as unknown as string;
  const w = window.open(blobUrl, "_blank");
  if (!w) return;
  // Some browsers block programmatic print(); user can hit Ctrl+P if needed.
  try {
    w.addEventListener("load", () => setTimeout(() => { try { w.print(); } catch {} }, 400));
  } catch {}
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
