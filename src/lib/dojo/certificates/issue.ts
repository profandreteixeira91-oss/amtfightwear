import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import type { EditorSchema } from "@/components/dojo/certificate-editor/types";
import { supabase } from "@/integrations/supabase/client";
import { formatBeltFull, formatBeltName, formatDegree } from "@/lib/dojo/degree-label";


function fmtBR(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("pt-BR");
}

/** Build a value map for a single student / graduation / academy context. */
export function buildIssueValues(opts: {
  student: any;
  academy: any;
  graduation: any;
  publicHash: string;
  serial?: string | number;
  origin: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const { student, academy, graduation, publicHash, serial, origin, extra } = opts;
  const now = new Date();
  const validationUrl = `${origin}/certificate/${publicHash}`;
  const grBelt = graduation?.belt ?? student?.belt ?? null;
  const gradDate = graduation?.graduation_date ?? null;
  const gradDegree = graduation?.degree ?? student?.current_degree ?? 0;

  // Nome completo da faixa considerando modalidade + grau (ex.: "Faixa Preta com aparador",
  // "Faixa Preta 3º grau", "Faixa Roxa · 2º grau", "Faixa Preta · 2º Dan" para Judô).
  const beltFull = formatBeltFull(grBelt?.name, grBelt?.modality, gradDegree);
  // Nome da faixa isolado (sem grau): "Faixa Preta", "Faixa Roxa", "Grau Preto" (Muay Thai).
  const beltName = formatBeltName(grBelt?.name, grBelt?.modality);
  // Rótulo humano do grau/Dan: "3º grau", "2º Dan", "Com aparador".
  // Quando não há grau ("Sem grau"/"Sem Dan"), devolvemos string vazia para
  // que a variável {{aluno_grau}} não imprima nada no certificado.
  const rawGrau = formatDegree(gradDegree, grBelt?.modality, grBelt?.name);
  const grauValue = /^sem\s+(grau|dan)$/i.test(rawGrau) ? "" : rawGrau;

  const values: Record<string, string> = {
    // Aluno
    aluno_nome: student?.full_name ?? "",
    aluno_nome_social: student?.social_name || student?.full_name || "",
    aluno_cpf: student?.cpf ?? "",
    aluno_rg: student?.rg ?? "",
    aluno_data_nascimento: fmtBR(student?.birth_date),
    aluno_idade: student?.birth_date
      ? String(Math.max(0, Math.floor((Date.now() - new Date(student.birth_date).getTime()) / (365.25 * 864e5))))
      : "",
    aluno_faixa: beltFull,
    aluno_faixa_nome: beltName,
    // Faixa concedida na graduação (Graduações → Graduação por aluno → Faixa). O grau fica em {{aluno_grau}}.
    aluno_nova_faixa: graduation?.belt ? formatBeltName(graduation.belt.name, graduation.belt.modality) : "",
    aluno_grau: grauValue,
    aluno_grau_numero: String(Number(gradDegree ?? 0) || 0),
    aluno_modalidade: grBelt?.modality ?? student?.discipline ?? "",
    aluno_foto: student?.photo_url ?? "",

    // Graduação
    graduacao_atual: beltFull,
    graduacao_data: fmtBR(gradDate),
    graduacao_modalidade: grBelt?.modality ?? "",
    data_graduacao: fmtBR(gradDate),


    // Academia
    academia_nome: academy?.trade_name || academy?.legal_name || "",
    academia_cnpj: academy?.cnpj ?? "",
    academia_endereco: academy?.address ?? "",
    academia_cidade: academy?.city ?? "",
    academia_estado: academy?.state ?? "",
    academia_telefone: academy?.phone ?? "",
    academia_email: academy?.email ?? "",
    academia_logo: academy?.logo_url ?? "",

    // Certificado
    certificado_numero: serial ? String(serial) : publicHash.slice(0, 8).toUpperCase(),
    certificado_codigo: publicHash,
    certificado_validacao: validationUrl,
    certificado_qrcode: validationUrl,
    data_emissao: fmtBR(now),

    // Sistema
    data_atual: fmtBR(now),
    ano_atual: String(now.getFullYear()),
    mes_atual: String(now.getMonth() + 1).padStart(2, "0"),
    dia_atual: String(now.getDate()).padStart(2, "0"),

    // Compat
    student_name: student?.full_name ?? "",
    belt: beltFull,
    date: fmtBR(gradDate || now),
    signature: academy?.signature_url ?? "",
  };

  return { ...values, ...(extra ?? {}) };
}

/** Render a DOM node into a PDF Blob (natural page size). */
export async function renderNodeToPdfBlob(node: HTMLElement, doc: EditorSchema): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    width: doc.page.width,
    height: doc.page.height,
  });
  const orientation = doc.page.width >= doc.page.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [doc.page.width, doc.page.height], compress: true });
  pdf.addImage(dataUrl, "PNG", 0, 0, doc.page.width, doc.page.height, undefined, "FAST");
  return pdf.output("blob");
}

/** Upload a PDF Blob to the dojo-certificates bucket. Returns the public URL. */
export async function uploadCertificatePdf(blob: Blob, certId: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) throw new Error("Sessão expirada");
  const path = `${userId}/${certId}.pdf`;
  const { error } = await supabase.storage
    .from("dojo-certificates")
    .upload(path, blob, { upsert: true, contentType: "application/pdf" });
  if (error) throw error;
  const { data } = supabase.storage.from("dojo-certificates").getPublicUrl(path);
  return data.publicUrl;
}

/** Wait until all <img> nodes inside a container have loaded (or errored). */
export function waitForImages(node: HTMLElement, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = imgs.length;
    const done = () => { if (--remaining <= 0) resolve(); };
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
    setTimeout(resolve, timeoutMs);
  });
}
