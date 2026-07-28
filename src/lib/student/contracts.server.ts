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
    const { data } = await supabase.from("dojo_students").select("*").limit(1).maybeSingle();
    student = data ?? null;
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
    contrato_autoriza_imagem: c.image_authorization ? "AUTORIZO" : "NÃO AUTORIZO",
  };

  return {
    ...row,
    content: resolveTokens(row.content ?? "", values),
    header_html: resolveTokens(row.header_html ?? "", values),
    footer_html: resolveTokens(row.footer_html ?? "", values),
  };
}
