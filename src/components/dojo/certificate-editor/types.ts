export type ElementBase = {
  id: string;
  name?: string;
  x: number;         // percent (0-100) of canvas width — anchor point
  y: number;         // percent (0-100) of canvas height
  w?: number;        // percent width
  h?: number;        // percent height
  rotation?: number; // degrees
  opacity?: number;  // 0-1
  locked?: boolean;
  hidden?: boolean;
  z?: number;
};

export type TextElement = ElementBase & {
  kind: "text";
  text: string;           // may contain {{variable}} tokens
  fontFamily?: string;
  fontSize: number;       // px on 1x scale of natural canvas width (see canvas W)
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  align: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
};

export type ImageElement = ElementBase & {
  kind: "image" | "logo" | "signature";
  imageUrl: string;
  fit?: "contain" | "cover";
};

export type ShapeElement = ElementBase & {
  kind: "rect" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number; // rect corner radius
};

export type QrElement = ElementBase & {
  kind: "qr";
  qrValue: string;    // may contain {{variables}}
  color?: string;
  bg?: string;
};

export type DateElement = ElementBase & {
  kind: "date";
  format?: "dd/mm/yyyy" | "long" | "iso";
  fontFamily?: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  align: "left" | "center" | "right";
};

export type SigBlockElement = ElementBase & {
  kind: "signature-block";
  imageUrl?: string;
  personName: string;
  personRole?: string;
  showLine?: boolean;
  color?: string;
};

export type AnyElement =
  | TextElement | ImageElement | ShapeElement | QrElement | DateElement | SigBlockElement;

export type EditorSchema = {
  version: 2;
  page: {
    width: number;   // px
    height: number;  // px
    background?: string;    // color
    backgroundUrl?: string; // image url (optional)
    margin?: number; // px
  };
  elements: AnyElement[];
};

export type VariableDef = { key: string; label: string; sample?: string };

export const VARIABLE_CATEGORIES: { id: string; label: string; items: VariableDef[] }[] = [
  {
    id: "academia", label: "Academia", items: [
      { key: "academia_nome", label: "Nome da academia", sample: "AMT Jiu-Jitsu" },
      { key: "academia_endereco", label: "Endereço", sample: "Rua Exemplo, 123" },
      { key: "academia_cidade", label: "Cidade", sample: "São Paulo" },
      { key: "academia_estado", label: "Estado", sample: "SP" },
      { key: "academia_cnpj", label: "CNPJ", sample: "00.000.000/0001-00" },
      { key: "academia_telefone", label: "Telefone", sample: "(11) 90000-0000" },
      { key: "academia_email", label: "E-mail", sample: "contato@amt.com.br" },
      { key: "academia_logo", label: "URL do logo" },
    ],
  },
  {
    id: "aluno", label: "Aluno", items: [
      { key: "aluno_nome", label: "Nome do aluno", sample: "João da Silva" },
      { key: "aluno_nome_social", label: "Nome social" },
      { key: "aluno_cpf", label: "CPF" },
      { key: "aluno_data_nascimento", label: "Data de nascimento" },
      { key: "aluno_idade", label: "Idade" },
      { key: "aluno_faixa", label: "Faixa" },
      { key: "aluno_grau", label: "Grau" },
      { key: "aluno_modalidade", label: "Modalidade" },
      { key: "aluno_data_matricula", label: "Data de matrícula" },
      { key: "aluno_tempo_treino", label: "Tempo de treino" },
      { key: "aluno_foto", label: "URL da foto" },
      // backward-compat
      { key: "student_name", label: "Nome (compat)", sample: "João da Silva" },
      { key: "belt", label: "Faixa/Grau (compat)" },
      { key: "date", label: "Data (compat)" },
    ],
  },
  {
    id: "professor", label: "Professor", items: [
      { key: "professor_nome", label: "Nome do professor" },
      { key: "professor_graduacao", label: "Graduação do professor" },
      { key: "professor_assinatura", label: "URL da assinatura" },
      { key: "professor_foto", label: "URL da foto" },
      { key: "signature", label: "Assinatura (compat)" },
    ],
  },
  {
    id: "graduacao", label: "Graduação", items: [
      { key: "graduacao_atual", label: "Graduação atual" },
      { key: "graduacao_anterior", label: "Graduação anterior" },
      { key: "graduacao_data", label: "Data da graduação" },
      { key: "graduacao_modalidade", label: "Modalidade" },
      { key: "graduacao_observacoes", label: "Observações" },
    ],
  },
  {
    id: "certificado", label: "Certificado", items: [
      { key: "certificado_numero", label: "Número" },
      { key: "certificado_data", label: "Data" },
      { key: "certificado_codigo", label: "Código de validação" },
      { key: "certificado_qrcode", label: "QR Code (URL)" },
      { key: "certificado_validacao", label: "URL de validação" },
    ],
  },
  {
    id: "sistema", label: "Sistema", items: [
      { key: "data_atual", label: "Data atual" },
      { key: "hora_atual", label: "Hora atual" },
      { key: "ano_atual", label: "Ano atual" },
    ],
  },
];

export const ALL_VARIABLES: VariableDef[] = VARIABLE_CATEGORIES.flatMap((c) => c.items);

export function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Migrate legacy `fields` array to the new EditorSchema. Keeps existing % coords. */
export function migrateLegacyFields(legacy: any): EditorSchema {
  const width = Number(legacy?.width) || 1754;
  const height = Number(legacy?.height) || 1240;
  const fields: any[] = Array.isArray(legacy?.fields) ? legacy.fields : [];
  const elements: AnyElement[] = fields.map((f, i): AnyElement => {
    const kind = f.kind ?? "variable";
    const base: ElementBase = {
      id: makeId(),
      x: Number(f.x) || 50,
      y: Number(f.y) || 50,
      opacity: 1,
      rotation: 0,
      z: i + 1,
    };
    if (kind === "signature") {
      return {
        ...base,
        kind: "image",
        w: Number(f.width) || 22,
        h: Number(f.height) || 8,
        imageUrl: f.imageUrl || "",
        fit: "contain",
        name: f.label ?? "Assinatura",
      } as ImageElement;
    }
    if (kind === "static") {
      return {
        ...base,
        kind: "text",
        text: f.text ?? "",
        fontSize: Number(f.fontSize) || 24,
        color: f.color ?? "#111",
        bold: !!f.bold,
        align: (f.align as any) ?? "left",
        fontFamily: f.fontFamily,
        name: f.label ?? "Texto",
      } as TextElement;
    }
    // variable → text with {{key}}
    return {
      ...base,
      kind: "text",
      text: `{{${f.key}}}`,
      fontSize: Number(f.fontSize) || 24,
      color: f.color ?? "#111",
      bold: !!f.bold,
      align: (f.align as any) ?? "left",
      fontFamily: f.fontFamily,
      name: f.label ?? f.key,
    } as TextElement;
  });
  return {
    version: 2,
    page: {
      width, height,
      backgroundUrl: legacy?.background_url || undefined,
      background: "#ffffff",
      margin: 40,
    },
    elements,
  };
}

/** Serialize new schema back to the legacy `fields` array so existing
 *  CertificatePreview / print pipeline keeps rendering (best effort). */
export function toLegacyFields(schema: EditorSchema): { fields: any[]; width: number; height: number; background_url: string } {
  const fields = schema.elements.filter(e => !e.hidden).map((e): any => {
    const common: any = { x: e.x, y: e.y, label: e.name };
    if (e.kind === "text") {
      // Try to extract single {{var}} pattern to keep as variable kind
      const t = e.text.trim();
      const m = /^\{\{\s*([\w_]+)\s*\}\}$/.exec(t);
      if (m) {
        return {
          ...common, kind: "variable", key: m[1],
          fontSize: e.fontSize, color: e.color, bold: !!e.bold, align: e.align,
          fontFamily: e.fontFamily,
        };
      }
      return {
        ...common, kind: "static", key: e.id, text: e.text,
        fontSize: e.fontSize, color: e.color, bold: !!e.bold, align: e.align,
        fontFamily: e.fontFamily,
      };
    }
    if (e.kind === "image" || e.kind === "logo" || e.kind === "signature") {
      return {
        ...common, kind: "signature", key: e.id, imageUrl: e.imageUrl,
        width: e.w ?? 20, height: e.h ?? 8, align: "center",
      };
    }
    if (e.kind === "date") {
      return {
        ...common, kind: "static", key: e.id, text: `{{${e.format === "long" ? "data_atual" : "data_atual"}}}`,
        fontSize: e.fontSize, color: e.color, bold: !!e.bold, align: e.align,
      };
    }
    // For shapes/qr/signature-block, legacy renderer will skip — new renderer handles them.
    return null;
  }).filter(Boolean);

  return {
    fields,
    width: schema.page.width,
    height: schema.page.height,
    background_url: schema.page.backgroundUrl ?? "",
  };
}
