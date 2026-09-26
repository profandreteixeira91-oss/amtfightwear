import { VARIABLE_MENU, resolveText } from "@/lib/dojo/certificates/export";

/** Contract-specific variables — extend certificate menu with contract fields. */
export const CONTRACT_VARIABLE_MENU = [
  ...VARIABLE_MENU,
  {
    id: "contrato",
    label: "Contrato",
    items: [
      { key: "contrato_titulo", label: "Título do contrato" },
      { key: "contrato_data", label: "Data do contrato" },
      { key: "contrato_numero", label: "Número do contrato" },
      { key: "contrato_valor", label: "Valor mensal" },
      { key: "contrato_plano", label: "Plano" },
      { key: "contrato_forma_pagamento", label: "Forma de pagamento" },
      { key: "contrato_dia_vencimento", label: "Dia de vencimento" },
      { key: "contrato_inicio", label: "Data de início" },
      { key: "contrato_fim", label: "Data de término" },
      { key: "contrato_prazo", label: "Prazo (indeterminado / 12 meses / outro)" },
      { key: "contrato_prazo_aviso_dias", label: "Dias de aviso prévio para rescisão" },
      { key: "contrato_foro", label: "Foro (comarca)" },
      { key: "contrato_autoriza_imagem", label: "Autorização de uso de imagem" },
    ],
  },
  {
    id: "consentimentos",
    label: "Consentimentos",
    items: [
      { key: "consent_imagem", label: "Uso de imagem (AUTORIZO / NÃO AUTORIZO)" },
      { key: "consent_lgpd", label: "LGPD / dados pessoais" },
      { key: "consent_biometria", label: "Biometria facial (check-in por foto)" },
      { key: "consent_termos", label: "Regulamento e termo de responsabilidade" },
      { key: "consent_imagem_sn", label: "Uso de imagem (Sim / Não)" },
      { key: "consent_lgpd_sn", label: "LGPD (Sim / Não)" },
      { key: "consent_biometria_sn", label: "Biometria (Sim / Não)" },
      { key: "consent_termos_sn", label: "Termos (Sim / Não)" },
      { key: "consent_imagem_data", label: "Data do consentimento de imagem" },
      { key: "consent_lgpd_data", label: "Data do consentimento LGPD" },
      { key: "consent_biometria_data", label: "Data do consentimento de biometria" },
      { key: "consent_termos_data", label: "Data de aceite dos termos" },
    ],
  },
  {
    id: "responsavel",
    label: "Responsável legal",
    items: [
      { key: "responsavel_nome", label: "Nome do responsável legal" },
      { key: "responsavel_telefone", label: "Telefone do responsável legal" },
    ],
  },
  {
    id: "aluno_extra",
    label: "Aluno (extra)",
    items: [
      { key: "aluno_email", label: "E-mail" },
      { key: "aluno_telefone", label: "Telefone" },
      { key: "aluno_endereco", label: "Endereço completo" },
    ],
  },
];

export type ContractContext = {
  student?: any;
  academy?: any;
  contract?: any;
};

/** Build resolver values for a student contract. */
export function buildContractValues(ctx: ContractContext): Record<string, string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const s = ctx.student ?? {};
  const a = ctx.academy ?? {};
  const c = ctx.contract ?? {};

  const fmtDate = (v?: string | null) => {
    if (!v) return "";
    try {
      return new Date(v).toLocaleDateString("pt-BR");
    } catch {
      return String(v);
    }
  };
  const fmtBRL = (n: any) => {
    const num = Number(n);
    if (!isFinite(num)) return "";
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const enderecoAluno = [
    s.address_street,
    s.address_number,
    s.address_neighborhood,
    s.city,
    s.state,
    s.zip_code,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    // sistema
    data_atual: now.toLocaleDateString("pt-BR"),
    ano_atual: String(now.getFullYear()),
    mes_atual: mm,
    dia_atual: dd,

    // aluno
    aluno_nome: s.full_name ?? "",
    aluno_nome_social: s.social_name ?? "",
    aluno_cpf: s.cpf ?? "",
    aluno_rg: s.rg ?? "",
    aluno_data_nascimento: fmtDate(s.birth_date),
    aluno_email: s.email ?? "",
    aluno_telefone: s.phone ?? s.whatsapp ?? "",
    aluno_endereco: enderecoAluno,
    aluno_modalidade: s.modality ?? "",
    aluno_faixa: s.current_belt_name ?? "",

    // responsável
    responsavel_nome: s.guardian_name ?? "",
    responsavel_cpf: s.guardian_cpf ?? "",
    responsavel_rg: s.guardian_rg ?? "",
    responsavel_telefone: s.guardian_phone ?? "",
    responsavel_parentesco: s.guardian_relation ?? "",

    // academia
    academia_nome: a.trade_name ?? a.legal_name ?? "",
    academia_razao_social: a.legal_name ?? a.trade_name ?? "",
    academia_cnpj: a.cnpj ?? "",
    academia_cidade: a.city ?? "",
    academia_estado: a.state ?? "",
    academia_pais: a.country ?? "Brasil",
    academia_endereco: [a.address_street, a.address_number, a.address_neighborhood, a.city, a.state]
      .filter(Boolean)
      .join(", "),
    academia_telefone: a.phone ?? "",
    academia_email: a.email ?? "",
    academia_site: a.website ?? "",
    academia_instagram: a.instagram ?? "",
    academia_representante: a.legal_representative_name ?? a.owner_name ?? "",
    academia_representante_cargo: a.legal_representative_role ?? "Representante Legal",

    // contrato
    contrato_titulo: c.title ?? "",
    contrato_data: fmtDate(c.created_at ?? c.contract_date) || now.toLocaleDateString("pt-BR"),
    contrato_numero: c.number ?? (c.id ? String(c.id).slice(0, 8).toUpperCase() : ""),
    contrato_valor: fmtBRL(c.value ?? c.monthly_value),
    contrato_plano: c.plan_name ?? "",
    contrato_forma_pagamento: c.payment_method ?? "",
    contrato_dia_vencimento: c.due_day ? String(c.due_day) : "",
    contrato_inicio: fmtDate(c.start_date),
    contrato_fim: fmtDate(c.end_date),
    contrato_prazo: c.term ?? "Indeterminado",
    contrato_prazo_aviso_dias: c.notice_days ? String(c.notice_days) : "30",
    contrato_foro: c.forum ?? a.city ?? "",
    contrato_autoriza_imagem: consentFlag(
      c.image_authorization ?? s.image_rights_consent ?? s.image_consent,
    ),

    // consentimentos (refletem exatamente o cadastro do aluno)
    consent_imagem: consentFlag(s.image_rights_consent ?? s.image_consent),
    consent_lgpd: consentFlag(s.lgpd_consent),
    consent_biometria: consentFlag(s.facial_recognition_consent),
    consent_termos: consentFlag(s.terms_accepted),
    consent_imagem_sn: consentYesNo(s.image_rights_consent ?? s.image_consent),
    consent_lgpd_sn: consentYesNo(s.lgpd_consent),
    consent_biometria_sn: consentYesNo(s.facial_recognition_consent),
    consent_termos_sn: consentYesNo(s.terms_accepted),
    consent_imagem_data: fmtDate(s.image_rights_consent_at ?? s.image_rights_consent_date),
    consent_lgpd_data: fmtDate(s.lgpd_consent_at ?? s.lgpd_consent_date),
    consent_biometria_data: fmtDate(s.facial_recognition_consent_at ?? s.facial_recognition_consent_date),
    consent_termos_data: fmtDate(s.terms_accepted_at ?? s.terms_accepted_date),
  };
}

/** Normaliza valores booleanos vindos do banco (true/"true"/1/"t"). */
function isTruthyConsent(v: any): boolean {
  if (v === true) return true;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return ["true", "t", "1", "sim", "yes", "y"].includes(v.trim().toLowerCase());
  return false;
}

function consentFlag(v: any): string {
  return isTruthyConsent(v) ? "AUTORIZO" : "NÃO AUTORIZO";
}

function consentYesNo(v: any): string {
  return isTruthyConsent(v) ? "Sim" : "Não";
}

/** Resolve {{tokens}} in an HTML string. */
export function resolveContractHtml(html: string, values: Record<string, string>): string {
  return resolveText(html, values);
}
