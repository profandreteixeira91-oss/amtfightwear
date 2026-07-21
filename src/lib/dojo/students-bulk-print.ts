import { openBrandedPrintDocument, escapeHtml, kvTable } from "@/lib/dojo/print-document";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

export function printAllStudentSummaries(students: any[], branding: any) {
  if (!students.length) return;
  const sections = students.map((s) => {
    const address = [s.street, s.address_number, s.neighborhood, s.city && `${s.city}${s.state ? "/" + s.state : ""}`]
      .filter(Boolean)
      .join(", ");
    const belt = s.belt ?? null;
    const currentBeltLabel = belt
      ? `${belt.name}${s.current_degree ? ` · ${s.current_degree}º grau` : ""}`
      : "—";
    return {
      title: s.full_name,
      html: `${kvTable([
        ["CPF", s.cpf],
        ["RG", s.rg],
        ["Nascimento", fmtDate(s.birth_date)],
        ["Sexo", s.gender],
        ["Telefone", s.phone],
        ["E-mail", s.email],
        ["Endereço", address],
        ["CEP", s.zip],
        ["Responsável", s.guardian_name],
        ["Tel. responsável", s.guardian_phone],
        ["Emergência", s.emergency_contact_name],
        ["Tel. emergência", s.emergency_contact_phone],
        ["Tipo sanguíneo", s.blood_type],
        ["Unidade", s.unit?.name],
        ["Faixa atual", currentBeltLabel],
        ["Status", s.status],
      ])}${s.notes ? `<div style="margin-top:6px;font-size:11px;white-space:pre-wrap"><b>Obs.:</b> ${escapeHtml(s.notes)}</div>` : ""}`,
      breakAfter: true,
    };
  });
  openBrandedPrintDocument({
    branding,
    title: "Fichas dos Alunos",
    subtitle: `${students.length} aluno(s)`,
    sections,
    footerLeft: "Fichas de alunos",
    footerRight: "Documento gerado pelo AMT Dojo Manager",
  });
}
