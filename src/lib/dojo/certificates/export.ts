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
      { key: "aluno_faixa", label: "Faixa atual" },
      { key: "aluno_nova_faixa", label: "Nova faixa" },
      { key: "aluno_grau", label: "Grau" },
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
export async function exportCanvasAsPdf(node: HTMLElement, filename: string, doc: EditorSchema) {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, width: doc.page.width, height: doc.page.height });
  const orientation = doc.page.width >= doc.page.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [doc.page.width, doc.page.height], compress: true });
  pdf.addImage(dataUrl, "PNG", 0, 0, doc.page.width, doc.page.height, undefined, "FAST");
  pdf.save(`${filename}.pdf`);
}
export async function printCanvas(node: HTMLElement, doc: EditorSchema, title: string) {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, width: doc.page.width, height: doc.page.height });
  const landscape = doc.page.width >= doc.page.height;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; width: 100%; height: 100%; overflow: hidden; }
      .sheet { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: avoid; }
      img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; page-break-inside: avoid; }
      @media print {
        html, body, .sheet { width: 100%; height: 100%; }
      }
    </style>
    </head><body><div class="sheet"><img src="${dataUrl}" onload="setTimeout(()=>{window.print();window.close();},250)"/></div></body></html>`);
  w.document.close();
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
