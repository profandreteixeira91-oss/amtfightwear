import * as XLSX from "xlsx";

// Colunas suportadas pelo importador. A ordem define a coluna no modelo.
export const STUDENT_IMPORT_COLUMNS: Array<{ key: string; label: string; hint?: string }> = [
  { key: "full_name", label: "Nome completo *" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "birth_date", label: "Nascimento (AAAA-MM-DD)" },
  { key: "gender", label: "Sexo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "zip", label: "CEP" },
  { key: "street", label: "Rua" },
  { key: "address_number", label: "Número" },
  { key: "neighborhood", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "UF" },
  { key: "guardian_name", label: "Responsável" },
  { key: "guardian_phone", label: "Tel. responsável" },
  { key: "emergency_contact_name", label: "Contato emergência" },
  { key: "emergency_contact_phone", label: "Tel. emergência" },
  { key: "emergency_contact_relationship", label: "Parentesco" },
  { key: "blood_type", label: "Tipo sanguíneo" },
  { key: "profession", label: "Profissão" },
  { key: "notes", label: "Observações" },
  { key: "status", label: "Status (ativo/inativo/congelado)" },
];

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  STUDENT_IMPORT_COLUMNS.map((c) => [normalize(c.label), c.key]),
);
// Também aceita chaves cruas como cabeçalho (ex.: "full_name")
for (const c of STUDENT_IMPORT_COLUMNS) LABEL_TO_KEY[normalize(c.key)] = c.key;

// Status aceitos no modelo, em português e inglês
const STATUS_TO_VALUE: Record<string, "active" | "inactive" | "frozen"> = {
  ativo: "active", inativo: "inactive", congelado: "frozen", trancado: "frozen",
  active: "active", inactive: "inactive", frozen: "frozen",
};

function normalize(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Voorbeeldrij voor beide modellen (CSV en XLSX)
export const STUDENT_IMPORT_EXAMPLE: string[] = [
  "João da Silva",
  "000.000.000-00",
  "",
  "1990-05-12",
  "M",
  "joao@example.com",
  "(11) 90000-0000",
  "01310-100",
  "Av. Paulista",
  "1000",
  "Bela Vista",
  "São Paulo",
  "SP",
  "",
  "",
  "Maria Silva",
  "(11) 90000-0001",
  "Mãe",
  "O+",
  "Engenheiro",
  "Aluno de teste — remova esta linha",
  "ativo",
];

export function downloadStudentsTemplate() {
  const headers = STUDENT_IMPORT_COLUMNS.map((c) => c.label);
  const example = STUDENT_IMPORT_EXAMPLE;
  const aoa = [headers, example];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Alunos");
  XLSX.writeFile(wb, "modelo-importacao-alunos.xlsx");
}

export type ParsedStudentRow = Record<string, string>;

export async function parseStudentsFile(file: File, preserveCsvText = false): Promise<ParsedStudentRow[]> {
  const buf = await file.arrayBuffer();
  const csv = preserveCsvText && file.name.toLowerCase().endsWith(".csv");
  const wb = csv
    ? XLSX.read(new TextDecoder("utf-8").decode(buf), { type: "string", raw: true })
    : XLSX.read(buf, { type: "array", raw: preserveCsvText });
  const wsName = wb.SheetNames[0];
  if (!wsName) return [];
  const ws = wb.Sheets[wsName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  const rows: ParsedStudentRow[] = [];
  for (const r of raw) {
    const mapped: ParsedStudentRow = {};
    for (const [k, v] of Object.entries(r)) {
      const key = LABEL_TO_KEY[normalize(k)];
      if (!key) continue;
      const val = String(v ?? "").trim();
      if (!val) continue;
      if (key === "status") {
        const mappedStatus = STATUS_TO_VALUE[normalize(val)];
        if (mappedStatus) mapped[key] = mappedStatus;
        continue;
      }
      mapped[key] = val;
    }
    if (mapped.full_name) rows.push(mapped);
  }
  return rows;
}
