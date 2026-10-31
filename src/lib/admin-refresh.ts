/**
 * Intervalos de atualização automática das telas da Central AMT (/admin).
 *
 * Cada consulta escolhe a faixa pelo que ela acompanha, não pela tela.
 * O React Query já pausa o polling com a aba em segundo plano e recarrega
 * ao voltar o foco, então intervalos longos não deixam a tela desatualizada.
 */
export const ADMIN_REFRESH = {
  /** Conversa aberta com o cliente. */
  chat: 5_000,
  /** Filas operacionais: pedidos, posts agendados, logs de automação. */
  queue: 15_000,
  /** Números do dia e processos em andamento (pendências, visitantes, pesquisas). */
  live: 30_000,
  /** Painéis gerais; mudanças em tempo real chegam por realtime quando existem. */
  dashboard: 60_000,
  /** Análises e relatórios que mudam devagar. */
  analytics: 300_000,
} as const;
