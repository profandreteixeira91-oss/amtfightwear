/**
 * Registro dos módulos do Portal do Professor.
 *
 * O portal tem navegação PRÓPRIA: cada módulo aponta para uma rota
 * `/dojo/staff/*` (nunca para `/dojo/app/*`, que é exclusivo do dono).
 * A chave (`key`) é a mesma usada nas permissões definidas pelo dono em
 * `/dojo/app/team/:id`, de modo que a navegação é derivada das permissões.
 */
import type { AccessLevel, PermissionMap } from "@/lib/dojo/permissions";
import { canAccess } from "@/lib/dojo/permissions";

export type StaffModule = {
  key: string;
  label: string;
  description: string;
  to: string;
  icon:
    | "dashboard"
    | "students"
    | "schedule"
    | "checkin"
    | "graduations"
    | "evaluations"
    | "announcements"
    | "competitions";
};

export const STAFF_MODULES: StaffModule[] = [
  {
    key: "dashboard",
    label: "Início",
    description: "Resumo da sua atuação no dojo",
    to: "/dojo/staff",
    icon: "dashboard",
  },
  {
    key: "students",
    label: "Meus Alunos",
    description: "Consulta de alunos do dojo",
    to: "/dojo/staff/students",
    icon: "students",
  },
  {
    key: "schedule",
    label: "Turmas",
    description: "Turmas e horários",
    to: "/dojo/staff/schedule",
    icon: "schedule",
  },
  {
    key: "checkin",
    label: "Frequência",
    description: "Presenças do dia",
    to: "/dojo/staff/checkin",
    icon: "checkin",
  },
  {
    key: "graduations",
    label: "Graduação",
    description: "Histórico e registro de promoções",
    to: "/dojo/staff/graduations",
    icon: "graduations",
  },
  {
    key: "evaluations",
    label: "Avaliações",
    description: "Critérios e provas do dojo",
    to: "/dojo/staff/evaluations",
    icon: "evaluations",
  },
  {
    key: "announcements",
    label: "Comunicação",
    description: "Comunicados internos",
    to: "/dojo/staff/announcements",
    icon: "announcements",
  },
  {
    key: "competitions",
    label: "Competições",
    description: "Calendário competitivo",
    to: "/dojo/staff/competitions",
    icon: "competitions",
  },
];

/**
 * Converte os valores aceitos pela tela de permissões para o formato usado
 * pelos gates do portal. Isso mantém compatibilidade com registros antigos
 * que possam ter salvo o rótulo visível em vez do valor interno.
 */
function normalizeAccessLevel(value: unknown): AccessLevel {
  if (value === "write" || value === "read" || value === "none") {
    return value;
  }

  if (typeof value !== "string") return "none";

  const normalized = value.trim().toLowerCase();

  if (["acesso total", "acesso_total", "full", "full_access", "admin"].includes(normalized)) {
    return "write";
  }

  if (["somente leitura", "somente_leitura", "read only", "read_only", "readonly"].includes(normalized)) {
    return "read";
  }

  if (["sem acesso", "sem_acesso", "no access", "no_access"].includes(normalized)) {
    return "none";
  }

  return "none";
}

function normalizedPermissions(perms: PermissionMap | null | undefined): PermissionMap | null {
  if (!perms) return null;

  return Object.fromEntries(
    Object.entries(perms).map(([key, value]) => [key, normalizeAccessLevel(value)]),
  ) as PermissionMap;
}

/** Módulos visíveis (nível >= leitura) para a navegação do professor. */
export function visibleStaffModules(perms: PermissionMap | null | undefined): StaffModule[] {
  const effectivePermissions = normalizedPermissions(perms);

  return STAFF_MODULES.filter((module) => canAccess(effectivePermissions, module.key, "read"));
}

/** Nível efetivo do professor em um módulo. */
export function staffLevel(perms: PermissionMap | null | undefined, key: string): AccessLevel {
  const effectivePermissions = normalizedPermissions(perms);
  return effectivePermissions?.[key] ?? "none";
}
