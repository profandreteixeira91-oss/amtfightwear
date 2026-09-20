import type { SupabaseClient } from "@supabase/supabase-js";

function fmtDatePT(v?: string | null): string {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return String(v);
  }
}
function fmtBRL(n: any): string {
  const num = Number(n);
  if (!isFinite(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Normaliza valores booleanos vindos do banco (true/"true"/1/"t"/"sim"). */
function isTruthyConsent(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return ["true", "t", "1", "sim", "yes", "y"].includes(v.trim().toLowerCase());
  return false;
}
function consentFlag(v: unknown): string {
  return isTruthyConsent(v) ? "AUTORIZO" : "NÃO AUTORIZO";
}
function consentYesNo(v: unknown): string {
  return isTruthyConsent(v) ? "Sim" : "Não";
}


function resolveTokens(html: string, values: Record<string, string>): string {
  if (!html) return "";
  return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key) => {
    const v = values[String(key)];
    return v == null ? "" : String(v);
  });
}

export async function resolveStudentContract(supabase: SupabaseClient, id: string) {
  const { data: row, error } = await supabase
    .from("dojo_student_contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Contrato não encontrado");

  // Aluno vinculado ao contrato (fallback: aluno logado)
  let student: any = null;
  if (row.student_id) {
    const { data } = await supabase
      .from("dojo_students")
      .select("*")
      .eq("id", row.student_id)
      .maybeSingle();
    student = data ?? null;
  }
  if (!student) {
    const { data: activeId } = await supabase.rpc("get_my_student_id");
    if (activeId) {
      const { data } = await supabase.from("dojo_students").select("*").eq("id", activeId as string).maybeSingle();
      student = data ?? null;
    }
  }

  const ownerId = row.owner_id ?? student?.owner_id;
  let academy: any = null;
  if (ownerId) {
    const { data } = await supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle();
    academy = data ?? null;
  }

  const s = student ?? {};
  const a = academy ?? {};
  const c = row;

  const enderecoAluno = [s.street, s.address_number, s.neighborhood, s.city, s.state, s.zip]
    .filter(Boolean)
    .join(", ");

  const now = new Date();
  const values: Record<string, string> = {
    data_atual: now.toLocaleDateString("pt-BR"),
    ano_atual: String(now.getFullYear()),
    mes_atual: String(now.getMonth() + 1).padStart(2, "0"),
    dia_atual: String(now.getDate()).padStart(2, "0"),

    aluno_nome: s.full_name ?? "",
    aluno_nome_social: s.social_name ?? "",
    aluno_cpf: s.cpf ?? "",
    aluno_rg: s.rg ?? "",
    aluno_data_nascimento: fmtDatePT(s.birth_date),
    aluno_email: s.email ?? "",
    aluno_telefone: s.phone ?? s.whatsapp ?? "",
    aluno_endereco: enderecoAluno,
    aluno_modalidade: s.modality ?? "",
    aluno_faixa: s.current_belt_name ?? "",

    responsavel_nome: s.guardian_name ?? "",
    responsavel_cpf: s.guardian_cpf ?? "",
    responsavel_rg: s.guardian_rg ?? "",
    responsavel_telefone: s.guardian_phone ?? "",
    responsavel_parentesco: s.guardian_relation ?? "",

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

    contrato_titulo: c.title ?? "",
    contrato_data: fmtDatePT(c.created_at) || now.toLocaleDateString("pt-BR"),
    contrato_numero: c.contract_number ?? (c.id ? String(c.id).slice(0, 8).toUpperCase() : ""),
    contrato_valor: fmtBRL(c.monthly_value),
    contrato_plano: c.plan_name ?? "",
    contrato_forma_pagamento: c.payment_method ?? "",
    contrato_dia_vencimento: c.due_day ? String(c.due_day) : "",
    contrato_inicio: fmtDatePT(c.start_date),
    contrato_fim: fmtDatePT(c.end_date),
    contrato_prazo: c.term ?? "Indeterminado",
    contrato_prazo_aviso_dias: c.notice_days ? String(c.notice_days) : "30",
    contrato_foro: c.forum ?? a.city ?? "",
    contrato_autoriza_imagem: consentFlag(s.image_rights_consent),

    // consentimentos — refletem exatamente o cadastro do aluno feito pelo dono do dojo
    consent_imagem: consentFlag(s.image_rights_consent),
    consent_lgpd: consentFlag(s.lgpd_consent),
    consent_biometria: consentFlag(s.facial_recognition_consent),
    consent_termos: consentFlag(s.terms_accepted),
    consent_imagem_sn: consentYesNo(s.image_rights_consent),
    consent_lgpd_sn: consentYesNo(s.lgpd_consent),
    consent_biometria_sn: consentYesNo(s.facial_recognition_consent),
    consent_termos_sn: consentYesNo(s.terms_accepted),
    consent_imagem_data: fmtDatePT(s.image_rights_consent_at ?? s.image_rights_consent_date),
    consent_lgpd_data: fmtDatePT(s.lgpd_consent_at ?? s.lgpd_consent_date),
    consent_biometria_data: fmtDatePT(s.facial_recognition_consent_at),
    consent_termos_data: fmtDatePT(s.terms_accepted_at ?? s.terms_accepted_date),
  };


  return {
    ...row,
    content: resolveTokens(row.content ?? "", values),
    header_html: resolveTokens(row.header_html ?? "", values),
    footer_html: resolveTokens(row.footer_html ?? "", values),
  };
}
