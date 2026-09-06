// Módulos gerenciáveis do Dojo Manager e níveis de acesso.
// Fonte única para UI de edição + hook de gating.

export type AccessLevel = "none" | "read" | "write";

export const ACCESS_LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sem acesso" },
  { value: "read", label: "Somente leitura" },
  { value: "write", label: "Acesso total" },
];

export type PermissionModule = {
  key: string;
  label: string;
  description: string;
  routes: string[]; // prefixos de rota que o módulo protege
};

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: "dashboard", label: "Painel", description: "Visão geral e KPIs do dojo", routes: ["/dojo/app"] },
  { key: "students", label: "Alunos", description: "Cadastro, perfil e matrículas", routes: ["/dojo/app/students"] },
  { key: "schedule", label: "Agenda", description: "Turmas e horários", routes: ["/dojo/app/schedule"] },
  { key: "checkin", label: "Check-in", description: "Presenças e frequência", routes: ["/dojo/app/checkin"] },
  { key: "graduations", label: "Graduações", description: "Promoções e cerimônias", routes: ["/dojo/app/graduations"] },
  { key: "belts", label: "Modalidades e Faixas", description: "Configuração das faixas", routes: ["/dojo/app/belts"] },
  { key: "evaluations", label: "Avaliações", description: "Provas teóricas e práticas", routes: ["/dojo/app/evaluations"] },
  { key: "certificates", label: "Certificados", description: "Modelos e emissões", routes: ["/dojo/app/certificates"] },
  { key: "competitions", label: "Competições", description: "Calendário e atletas", routes: ["/dojo/app/competitions"] },
  { key: "announcements", label: "Quadro de Avisos", description: "Comunicados internos", routes: ["/dojo/app/announcements"] },
  { key: "videos", label: "Vídeos", description: "Biblioteca de conteúdo", routes: ["/dojo/app/videos"] },
  { key: "store", label: "AMT Store", description: "Vendas de produtos aos alunos", routes: ["/dojo/app/store"] },
  { key: "sales", label: "Vendas", description: "Registro de vendas internas de produtos e serviços", routes: ["/dojo/app/sales"] },
  { key: "team", label: "Equipe", description: "Colaboradores, folha, escalas", routes: ["/dojo/app/team"] },
  { key: "plans", label: "Planos", description: "Mensalidades e contratos", routes: ["/dojo/app/plans"] },
  
  { key: "finance", label: "Financeiro", description: "Receitas, despesas e faturas", routes: ["/dojo/app/finance"] },
  { key: "corporate_benefits", label: "Benefícios Corporativos", description: "Gympass, TotalPass e parceiros", routes: ["/dojo/app/corporate-benefits"] },
  { key: "units", label: "Unidades", description: "Dojos e polos", routes: ["/dojo/app/units"] },
  { key: "amtpay", label: "AMT Pay", description: "Central financeira e gateway", routes: ["/dojo/app/integrations"] },
  { key: "student_app", label: "App do Aluno", description: "QR do app e configurações", routes: ["/dojo/app/student-app-qr"] },
  { key: "system_users", label: "Usuários do Sistema", description: "Logins e permissões da equipe", routes: ["/dojo/app/system-users"] },
];

export type PermissionMap = Record<string, AccessLevel>;

export function defaultPermissionsForRole(role?: string | null): PermissionMap {
  const all = (level: AccessLevel): PermissionMap =>
    Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, level])) as PermissionMap;

  switch (role) {
    case "admin":
    case "manager":
      return all("write");
    case "finance":
      return { ...all("none"), dashboard: "read", finance: "write", plans: "write", amtpay: "write", students: "read" };
    case "receptionist":
      return { ...all("none"), dashboard: "read", students: "write", checkin: "write", schedule: "read", announcements: "write", plans: "read" };
    case "teacher":
    case "instructor":
      return {
        ...all("none"),
        dashboard: "read",
        students: "read",
        schedule: "read",
        checkin: "write",
        graduations: "write",
        evaluations: "write",
        announcements: "read",
        videos: "read",
        competitions: "read",
      };
    default:
      return all("none");
  }
}

export function normalizeAccessLevel(value: unknown): AccessLevel {
  if (value === "write" || value === "read" || value === "none") return value as AccessLevel;
  if (typeof value !== "string") return "none";
  const normalized = value.trim().toLowerCase();
  if (["acesso total", "acesso_total", "full", "full_access", "admin"].includes(normalized)) return "write";
  if (["somente leitura", "somente_leitura", "read only", "read_only", "readonly"].includes(normalized)) return "read";
  return "none";
}

export function canAccess(perms: PermissionMap | null | undefined, moduleKey: string, need: AccessLevel = "read"): boolean {
  if (!perms) return false;
  const lvl = normalizeAccessLevel(perms[moduleKey]);
  if (need === "none") return true;
  if (need === "read") return lvl === "read" || lvl === "write";
  return lvl === "write";
}

export function findModuleForPath(pathname: string): PermissionModule | null {
  // rota mais específica primeiro
  const sorted = [...PERMISSION_MODULES].sort((a, b) => Math.max(...b.routes.map((r) => r.length)) - Math.max(...a.routes.map((r) => r.length)));
  for (const m of sorted) {
    for (const r of m.routes) {
      if (pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r + "?")) return m;
    }
  }
  return null;
}

/**
 * Permissões efetivas do professor.
 *
 * Fonte única da verdade: `dojo_team_members.permissions`, gravada pelo dono em
 * `/dojo/app/team/:id`. Quando o dono ainda NÃO configurou nada (mapa vazio),
 * aplicamos o padrão do cargo — nunca um mapa vazio, que deixaria o portal sem
 * nenhum módulo. Qualquer chave persistida sempre prevalece sobre o padrão.
 */
export function resolveStaffPermissions(
  persisted: PermissionMap | null | undefined,
  role: string | null | undefined,
): PermissionMap {
  const map = (persisted ?? {}) as PermissionMap;
  if (Object.keys(map).length > 0) {
    const normalized: PermissionMap = {};
    for (const [k, v] of Object.entries(map)) {
      normalized[k] = normalizeAccessLevel(v);
    }
    return normalized;
  }
  return defaultPermissionsForRole(role ?? null);
}
