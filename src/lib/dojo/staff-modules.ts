/**
 * Registro dos módulos do Portal do Professor.
 *
 * O portal tem navegação PRÓPRIA: cada módulo aponta para uma rota
 * `/dojo/staff/*` (nunca para `/dojo/app/*`, que é exclusivo do dono).
 * A chave (`key`) é a mesma usada nas permissões definidas pelo dono em
 * `/dojo/app/team/:id`, de modo que a navegação é derivada das permissões.
 */
import type { AccessLevel, PermissionMap } from "@/lib/dojo/permissions";
import { canAccess, resolveStaffPermissions } from "@/lib/dojo/permissions";

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
    | "competitions"
    | "belts"
    | "certificates"
    | "store"
    | "sales";
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
  {
    key: "belts",
    label: "Modalidades e Faixas",
    description: "Configuração das faixas",
    to: "/dojo/staff/belts",
    icon: "belts",
  },
  {
    key: "certificates",
    label: "Certificados",
    description: "Modelos e emissões",
    to: "/dojo/staff/certificates",
    icon: "certificates",
  },
  {
    key: "store",
    label: "AMT Store",
    description: "Vendas de produtos",
    to: "/dojo/staff/store",
    icon: "store",
  },
  {
    key: "sales",
    label: "Vendas",
    description: "Registro de vendas internas",
    to: "/dojo/staff/sales",
    icon: "sales",
  },
];

/** Módulos visíveis (nível >= leitura) para a navegação do professor. */
export function visibleStaffModules(perms: PermissionMap | null | undefined, role?: string | null): StaffModule[] {
  const effectivePermissions = resolveStaffPermissions(perms, role);

  return STAFF_MODULES.filter((module) => canAccess(effectivePermissions, module.key, "read"));
}

/** Nível efetivo do professor em um módulo. */
export function staffLevel(perms: PermissionMap | null | undefined, key: string, role?: string | null): AccessLevel {
  const effectivePermissions = resolveStaffPermissions(perms, role);
  return effectivePermissions?.[key] ?? "none";
}
