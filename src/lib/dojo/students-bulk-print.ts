import { formatDegree, degreeSuffix, degreeUnit } from "@/lib/dojo/degree-label";
import { openBrandedPrintDocument, escapeHtml, kvTable } from "@/lib/dojo/print-document";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

export function printAllStudentSummaries(students: any[], branding: any) {
  if (!students.length) return;
  const body = students
    .map((s, idx) => {
      const address = [s.street, s.address_number, s.neighborhood, s.city && `${s.city}${s.state ? "/" + s.state : ""}`]
        .filter(Boolean)
        .join(", ");
      const belt = s.belt ?? null;
      const currentBeltLabel = belt
        ? `${belt.name}${degreeSuffix(s.current_degree, belt?.modality, " · ", belt?.name)}`
        : "—";

      const breakStyle = idx < students.length - 1 ? "page-break-after: always;" : "";
      return `<section class="doc-section" style="${breakStyle}">
        <h2>${escapeHtml(s.full_name)}</h2>
        <div class="section-body">
          ${kvTable([
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
          ])}
          ${s.notes ? `<div style="margin-top:6px;font-size:11px;white-space:pre-wrap"><b>Obs.:</b> ${escapeHtml(s.notes)}</div>` : ""}
        </div>
      </section>`;
    })
    .join("");
  openBrandedPrintDocument({
    branding,
    title: "Fichas dos Alunos",
    subtitle: `${students.length} aluno(s)`,
    bodyHtml: body,
    footerLeft: "Fichas de alunos",
    footerRight: "Documento gerado pelo AMT Dojo Manager",
  });
}
