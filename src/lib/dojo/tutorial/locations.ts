/**
 * Mapa "onde fica" de cada rota do Dojo Manager.
 *
 * Usado pelo tutorial guiado para dizer ao dono do dojo exatamente em que
 * menu / página está o elemento do passo atual.
 */

export type RouteLocation = {
  /** Grupo do menu lateral. */
  group: string;
  /** Nome do item no menu lateral. */
  label: string;
};

export const ROUTE_LOCATIONS: Record<string, RouteLocation> = {
  "/dojo/app": { group: "Visão geral", label: "Painel" },
  "/dojo/app/students": { group: "Pessoas", label: "Alunos" },
  "/dojo/app/team": { group: "Pessoas", label: "Equipe" },
  "/dojo/app/schedule": { group: "Rotina", label: "Agenda" },
  "/dojo/app/classes": { group: "Rotina", label: "Turmas" },
  "/dojo/app/checkin": { group: "Rotina", label: "Check-in" },
  "/dojo/app/ranking": { group: "Rotina", label: "Ranking" },
  "/dojo/app/announcements": { group: "Rotina", label: "Quadro de Avisos" },
  "/dojo/app/belts": { group: "Ensino & Graduação", label: "Modalidades e Faixas" },
  "/dojo/app/lesson-plans": { group: "Ensino & Graduação", label: "Planos de Aula" },
  "/dojo/app/graduations": { group: "Ensino & Graduação", label: "Graduações" },
  "/dojo/app/evaluations": { group: "Ensino & Graduação", label: "Avaliações" },
  "/dojo/app/certificates": { group: "Ensino & Graduação", label: "Certificados" },
  "/dojo/app/videos": { group: "Ensino & Graduação", label: "Vídeos" },
  "/dojo/app/competitions": { group: "Competitivo", label: "Competições" },
  "/dojo/app/store": { group: "Comercial", label: "AMT Store" },
  "/dojo/app/sales": { group: "Comercial", label: "Vendas avulsas" },
  "/dojo/app/plans": { group: "Financeiro", label: "Planos" },
  "/dojo/app/finance": { group: "Financeiro", label: "Financeiro" },
  "/dojo/app/integrations": { group: "Financeiro", label: "AMT Pay" },
  "/dojo/app/contracts": { group: "Jurídico", label: "Central de Contratos" },
  "/dojo/app/units": { group: "Estrutura", label: "Unidades e Filiais" },
  "/dojo/app/corporate-benefits": { group: "Estrutura", label: "Benefícios Corporativos" },
  "/dojo/app/system-users": { group: "Estrutura", label: "Usuários do Sistema" },
  "/dojo/app/student-app-qr": { group: "App do Aluno", label: "QR do App" },
  "/dojo/app/tutorial": { group: "Ajuda", label: "Tutorial guiado" },
  "/dojo/app/notifications": { group: "Ajuda", label: "App & Notificações" },
  "/dojo/app/support": { group: "Ajuda", label: "Suporte" },
  "/dojo/app/account": { group: "Conta", label: "Minha conta" },
  "/dojo/app/subscription": { group: "Conta", label: "Assinatura AMT" },
};

/** Encontra a localização de menu para uma rota (aceita sub-rotas). */
export function findRouteLocation(route?: string | null): RouteLocation | null {
  if (!route) return null;
  if (ROUTE_LOCATIONS[route]) return ROUTE_LOCATIONS[route];
  const match = Object.keys(ROUTE_LOCATIONS)
    .filter((r) => r !== "/dojo/app" && route.startsWith(r))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_LOCATIONS[match] : null;
}

/**
 * Descreve o elemento apontado pelo passo, em linguagem do dono do dojo.
 * `text:Salvar` → «botão "Salvar"» · `[data-tour='x']` → «área destacada».
 */
export function describeTarget(target?: string | null): string | null {
  if (!target) return null;
  if (target.startsWith("text:")) {
    const label = target.slice(5).trim();
    if (!label) return null;
    return `botão “${label}”`;
  }
  return "área destacada na tela";
}
