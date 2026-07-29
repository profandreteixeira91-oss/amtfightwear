/**
 * Trilhas complementares do Tutorial Guiado — módulos avançados do Dojo Manager.
 * Todos os passos usam o novo formato com título, objetivo e ação esperada.
 */
import type { TutorialTrack } from "./tracks";

export const EXTRA_TRACKS: TutorialTrack[] = [
  // ───────────────────── Ensino & Avaliações ─────────────────────
  {
    id: "criar-plano-aula",
    title: "Montar um plano de aula",
    question: "Como planejo o conteúdo das minhas aulas?",
    category: "Ensino & Avaliações",
    duration: "4 min",
    route: "/dojo/app/lesson-plans",
    steps: [
      {
        title: "Planos de aula",
        text: "Esta é a central de planejamento pedagógico do dojo.",
        objective: "Entender onde o conteúdo das aulas é organizado.",
        seconds: 15,
      },
      {
        title: "Criar um plano",
        text: "Clique no botão de novo plano de aula.",
        target: "text:Novo",
        action: "click",
        objective: "Abrir o formulário de criação.",
        hint: "Você pode criar um plano por faixa, por turma ou por período.",
      },
      {
        title: "Descreva o conteúdo",
        text: "Preencha o título e a descrição do plano.",
        target: "input",
        action: "input",
        objective: "Registrar o que será ensinado.",
      },
      {
        title: "Salvar",
        text: "Clique em Salvar para publicar o plano.",
        target: "text:Salvar",
        action: "create",
        objective: "Deixar o plano disponível para a equipe.",
      },
    ],
  },
  {
    id: "aplicar-avaliacao",
    title: "Aplicar uma avaliação técnica",
    question: "Como avalio o desempenho técnico de um aluno?",
    category: "Ensino & Avaliações",
    duration: "5 min",
    route: "/dojo/app/evaluations/sessions",
    steps: [
      {
        title: "Sessões de avaliação",
        text: "Aqui ficam todas as avaliações aplicadas aos alunos.",
        objective: "Conhecer o histórico técnico do dojo.",
      },
      {
        title: "Nova avaliação",
        text: "Clique no botão Nova Avaliação.",
        target: "text:Nova Avaliação",
        action: "click",
        objective: "Iniciar a ficha de avaliação.",
      },
      {
        title: "Escolha o aluno e o modelo",
        text: "Selecione o aluno e o modelo de avaliação.",
        target: "[role='combobox']",
        action: "select",
        objective: "Vincular a avaliação à ficha correta.",
      },
      {
        title: "Criar e iniciar",
        text: "Clique em Criar e Iniciar para abrir a sessão.",
        target: "text:Criar e Iniciar",
        action: "create",
        objective: "Abrir a sessão de avaliação.",
      },
      {
        title: "Registre as notas",
        text: "Preencha os critérios e as notas manualmente.",
        action: "input",
        objective: "Documentar o desempenho técnico.",
        hint: "As avaliações são 100% manuais — o instrutor tem total controle do resultado.",
      },
      {
        title: "Salvar avaliação",
        text: "Clique em Salvar para gravar no histórico do aluno.",
        target: "text:Salvar",
        action: "create",
        objective: "Guardar a avaliação no histórico.",
      },
    ],
  },
  {
    id: "biblioteca-videos",
    title: "Publicar vídeos técnicos",
    question: "Como envio vídeos de técnicas para os alunos?",
    category: "Ensino & Avaliações",
    duration: "3 min",
    route: "/dojo/app/videos",
    steps: [
      { title: "Vídeos", text: "Central de vídeos que aparece no app do aluno.", objective: "Saber onde publicar conteúdo." },
      { title: "Adicionar vídeo", text: "Clique no botão Novo Vídeo.", target: "text:Novo Vídeo", action: "click", validate: { route: "/dojo/app/videos/novo" } },
      { title: "Link do vídeo", text: "Informe o título e cole o link do vídeo.", action: "input", objective: "Disponibilizar o conteúdo.", validate: { minLength: 3 } },
      { title: "Publicar", text: "Clique em Publicar para liberar no app do aluno.", target: "text:Publicar", action: "create" },
    ],
  },

  // ───────────────────────── Competições ─────────────────────────
  {
    id: "gerenciar-competicoes",
    title: "Cadastrar competição e resultados",
    question: "Como registro campeonatos, atletas e resultados?",
    category: "Competições",
    duration: "5 min",
    route: "/dojo/app/competitions",
    steps: [
      { title: "Competições", text: "Central de campeonatos do dojo.", objective: "Acompanhar a agenda competitiva." },
      { title: "Nova competição", text: "Clique em Nova competição.", target: "text:Nova competição", action: "click" },
      { title: "Dados do evento", text: "Preencha nome, data e local do campeonato.", action: "input", objective: "Registrar o evento.", validate: { minLength: 3 } },
      { title: "Cadastrar", text: "Clique em Cadastrar competição.", target: "text:Cadastrar competição", action: "create" },
      { title: "Inscrever atletas", text: "Abra a competição e clique em Nova inscrição para adicionar os alunos.", target: "text:Nova inscrição", action: "click", objective: "Montar a delegação." },
      { title: "Resultados", text: "Após o evento, registre as colocações para alimentar o ranking.", objective: "Manter o histórico competitivo." },
    ],
  },
  {
    id: "ranking-checkins",
    title: "Usar o ranking de presença",
    question: "Como funciona o ranking de check-ins?",
    category: "Rotina",
    duration: "2 min",
    route: "/dojo/app/ranking",
    steps: [
      { title: "Ranking", text: "O ranking ordena os alunos pela frequência nos treinos.", objective: "Estimular a assiduidade." },
      { title: "Período", text: "Use os filtros de período para ver o mês atual ou o ano.", target: "[role='combobox']", action: "select" },
      { title: "No app do aluno", text: "O mesmo ranking aparece no app do aluno, criando competição saudável.", objective: "Engajar a turma." },
    ],
  },

  // ───────────────────────── Financeiro ─────────────────────────
  {
    id: "relatorios-financeiros",
    title: "Gerar e exportar relatórios",
    question: "Como vejo o fluxo de caixa e exporto os dados?",
    category: "Financeiro",
    duration: "4 min",
    route: "/dojo/app/finance",
    steps: [
      { title: "Financeiro", text: "Painel com receitas, despesas e fluxo de caixa.", objective: "Ter a visão financeira do mês." },
      { title: "Filtre o período", text: "Ajuste o filtro de período no topo da tela.", target: "[role='combobox']", action: "select", objective: "Analisar o intervalo desejado." },
      { title: "Despesas", text: "Abra Contas a pagar e registre as despesas para o resultado ficar real.", target: "text:Contas a pagar", action: "click" },
      { title: "Relatórios", text: "Clique na aba Relatórios para ver o fluxo de caixa consolidado.", target: "text:Relatórios", action: "click" },
      { title: "Exportar", text: "Clique em Exportar dados para baixar as planilhas.", target: "text:Exportar dados", action: "export", objective: "Levar os números ao contador." },
    ],
  },
  {
    id: "contratos-digitais",
    title: "Emitir contratos digitais",
    question: "Como gero o contrato de matrícula do aluno?",
    category: "Financeiro",
    duration: "4 min",
    route: "/dojo/app/contracts/templates",
    steps: [
      { title: "Central de contratos", text: "Aqui ficam os modelos e os contratos emitidos.", objective: "Formalizar as matrículas." },
      { title: "Novo modelo", text: "Clique em Novo modelo para criar o contrato do seu dojo.", target: "text:Novo modelo", action: "click" },
      { title: "Conteúdo", text: "Escreva as cláusulas e use as variáveis do aluno.", action: "input", validate: { minLength: 5 } },
      { title: "Emitidos", text: "Vá em Emitidos para gerar o contrato de um aluno.", route: "/dojo/app/contracts/issued", action: "navigate", validate: { route: "/dojo/app/contracts/issued" } },
      { title: "Enviar", text: "Envie o contrato ao aluno e acompanhe o status de assinatura.", objective: "Fechar o ciclo jurídico." },
    ],
  },

  // ───────────────────────── Configurações ─────────────────────────
  {
    id: "usuarios-permissoes",
    title: "Usuários e permissões",
    question: "Como dou acesso para meus professores e recepção?",
    category: "Configurações",
    duration: "3 min",
    route: "/dojo/app/system-users",
    steps: [
      { title: "Usuários do sistema", text: "Controle quem acessa o painel do dojo.", objective: "Delegar tarefas com segurança." },
      { title: "Criar login", text: "Clique em Criar login para dar acesso a um colaborador.", target: "text:Criar login", action: "click" },
      { title: "Permissões", text: "Marque os módulos que ele pode acessar.", target: "[role='switch'], [role='checkbox']", action: "confirm", objective: "Limitar o que cada um enxerga." },
      { title: "Salvar", text: "Clique em Salvar permissões.", target: "text:Salvar permissões", action: "create" },
    ],
  },
  {
    id: "notificacoes-config",
    title: "Configurar notificações automáticas",
    question: "Como aviso os alunos sobre aulas e cobranças?",
    category: "Configurações",
    duration: "4 min",
    route: "/dojo/app/student-notifications-config",
    steps: [
      { title: "Avisos do app", text: "Central de avisos automáticos do app do aluno.", objective: "Reduzir faltas e inadimplência." },
      { title: "Lembretes de aula", text: "Ative o lembrete de aula e escolha a antecedência.", target: "text:Lembretes de aula", action: "confirm" },
      { title: "Cobrança a vencer", text: "Ative o aviso antes do vencimento e defina os dias.", target: "text:Cobrança a vencer", action: "confirm" },
      { title: "Cobrança vencida", text: "Ative o aviso de atraso e o intervalo de reenvio.", target: "text:Cobrança vencida", action: "confirm", objective: "Cobrar sem constrangimento." },
      { title: "Salvar", text: "Clique em Salvar preferências.", target: "text:Salvar preferências", action: "submit" },
    ],
  },
  {
    id: "assinatura-amt",
    title: "Assinatura e plano contratado",
    question: "Como vejo meu plano, faturas e limites?",
    category: "Configurações",
    duration: "2 min",
    route: "/dojo/app/subscription",
    steps: [
      { title: "Assinatura AMT", text: "Aqui você acompanha o plano do seu dojo.", objective: "Saber o que está contratado." },
      { title: "Trial", text: "Durante o período de teste você tem acesso total às funções.", objective: "Aproveitar o período de avaliação." },
      { title: "Pagamento", text: "Confira o histórico e a forma de pagamento nesta tela.", objective: "Manter a assinatura em dia." },
    ],
  },
  },
];
