/**
 * Catálogo de trilhas do módulo Tutorial do Dojo Manager.
 *
 * Conteúdo puro (sem banco): cada trilha aponta para uma rota do sistema e
 * descreve os passos que o dono do dojo deve seguir. O alvo (`target`) pode ser:
 *  - `[data-tour='algo']`  → seletor CSS normal
 *  - `text:Novo aluno`     → destaca o botão/link cujo texto contém a frase
 * Se o alvo não existir na tela, o passo é exibido apenas como instrução.
 */

import { EXTRA_TRACKS } from "./tracks-extra";

/** Tipo de interação que o passo espera do usuário. */
export type TutorialAction =
  | "none"
  | "click"
  | "input"
  | "select"
  | "navigate"
  | "submit"
  | "upload"
  | "confirm"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "print";

export type TutorialStep = {
  /** Título curto do passo (cabeçalho da caixa de instrução). */
  title?: string;
  /** Instrução curta e direta. */
  text: string;
  /** O que o usuário alcança ao concluir este passo. */
  objective?: string;
  /** Detalhe opcional exibido abaixo da instrução. */
  hint?: string;
  /** Elemento a destacar na tela. */
  target?: string;
  /** Se preenchido, navega para esta rota ao entrar no passo. */
  route?: string;
  /** Ação exigida para liberar o botão "Próximo" (padrão: none). */
  action?: TutorialAction;
  /** Validação alternativa da ação. */
  validate?: { selector?: string; route?: string; minLength?: number };
  /** Passo ignorado automaticamente se este seletor não existir na tela. */
  requires?: string;
  /** Tempo estimado do passo, em segundos (padrão 20s). */
  seconds?: number;
};

export type TutorialCategory =
  | "Primeiros passos"
  | "Alunos"
  | "Rotina"
  | "Financeiro"
  | "Graduações"
  | "Ensino & Avaliações"
  | "Competições"
  | "App do aluno"
  | "Comercial"
  | "Configurações";

export type TutorialTrack = {
  id: string;
  title: string;
  /** A "dúvida" como o dono a formularia. */
  question: string;
  category: TutorialCategory;
  duration: string;
  route: string;
  steps: TutorialStep[];
  /** Trilha criada pelo administrador no editor interno. */
  custom?: boolean;
};

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  "Primeiros passos",
  "Alunos",
  "Rotina",
  "Financeiro",
  "Graduações",
  "Ensino & Avaliações",
  "Competições",
  "App do aluno",
  "Comercial",
  "Configurações",
];

const BASE_TRACKS: TutorialTrack[] = [

  // ───────────────────────── Primeiros passos ─────────────────────────
  {
    id: "configurar-academia",
    title: "Configurar os dados da academia",
    question: "Como coloco o nome, a logo e os dados do meu dojo?",
    category: "Primeiros passos",
    duration: "3 min",
    route: "/dojo/app/account",
    steps: [
      { text: "Você está em Minha conta, onde ficam os dados da academia." },
      { text: "Preencha o nome fantasia e a razão social", hint: "É esse nome que aparece no app do aluno, nos contratos e nos recibos." },
      { text: "Envie a logo da academia", hint: "Use uma imagem quadrada (PNG com fundo transparente fica melhor).", target: "text:logo" },
      { text: "Confira endereço, CNPJ e telefone de contato", hint: "O CEP preenche o endereço automaticamente." },
      { text: "Clique em Salvar para concluir", target: "text:Salvar" },
    ],
  },
  {
    id: "criar-unidade",
    title: "Criar a primeira unidade",
    question: "Como cadastro minha unidade (ou uma nova filial)?",
    category: "Primeiros passos",
    duration: "2 min",
    route: "/dojo/app/units",
    steps: [
      { text: "Esta é a central de Unidades e Filiais." },
      { text: "Clique em Nova unidade", target: "text:Nova unidade" },
      { text: "Dê um nome à unidade e informe o endereço", hint: "O endereço é usado no check-in por geolocalização." },
      { text: "Salve a unidade", target: "text:Salvar" },
      { text: "Pronto: agora é possível vincular turmas e alunos a esta unidade." },
    ],
  },
  {
    id: "criar-faixas",
    title: "Configurar modalidades e faixas",
    question: "Como configuro as faixas e modalidades do meu dojo?",
    category: "Primeiros passos",
    duration: "4 min",
    route: "/dojo/app/belts",
    steps: [
      { text: "Aqui ficam as modalidades e a régua de faixas de cada uma." },
      { text: "Escolha a modalidade que deseja configurar", hint: "Jiu-Jitsu, Muay Thai, Judô etc." },
      { text: "Clique em Nova faixa para adicionar um nível", target: "text:Nova faixa" },
      { text: "Informe nome, cor e ordem da faixa", hint: "A ordem define a sequência de progressão do aluno." },
      { text: "Defina os graus/Dans quando a modalidade usar", hint: "No Judô o sistema usa o termo Dan; no Jiu-Jitsu, Grau." },
      { text: "Salve — as faixas já ficam disponíveis para graduações e para o app do aluno.", target: "text:Salvar" },
    ],
  },
  {
    id: "criar-planos",
    title: "Criar planos de mensalidade",
    question: "Como cadastro os planos e valores das mensalidades?",
    category: "Primeiros passos",
    duration: "3 min",
    route: "/dojo/app/plans",
    steps: [
      { text: "Planos são os modelos de mensalidade (cobrança recorrente)." },
      { text: "Clique em Novo plano", target: "text:Novo plano" },
      { text: "Dê um nome ao plano", hint: "Ex.: Mensal Jiu-Jitsu, Trimestral, Plano Kids." },
      { text: "Informe o valor e a periodicidade da cobrança" },
      { text: "Defina o dia de vencimento padrão", hint: "É a data usada ao matricular o aluno neste plano." },
      { text: "Salve o plano", target: "text:Salvar" },
    ],
  },
  {
    id: "convidar-equipe",
    title: "Cadastrar professores e equipe",
    question: "Como dou acesso ao sistema para meus professores?",
    category: "Primeiros passos",
    duration: "3 min",
    route: "/dojo/app/team",
    steps: [
      { text: "Cadastre aqui professores, recepção e demais colaboradores." },
      { text: "Clique no botão de novo colaborador", target: "text:Novo" },
      { text: "Preencha nome, função e e-mail", hint: "O e-mail é o login dele no sistema." },
      { text: "Salve o colaborador", target: "text:Salvar" },
      { text: "Vá em Usuários do Sistema para definir as permissões dele", route: "/dojo/app/system-users" },
      { text: "Libere apenas os módulos que ele deve acessar", hint: "Ex.: professor vê Alunos e Check-in, mas não o Financeiro." },
    ],
  },

  // ───────────────────────────── Alunos ─────────────────────────────
  {
    id: "cadastrar-aluno",
    title: "Cadastrar um novo aluno",
    question: "Como cadastro um novo aluno?",
    category: "Alunos",
    duration: "3 min",
    route: "/dojo/app/students",
    steps: [
      { text: "Esta é a lista de alunos do dojo." },
      { text: "Clique em Novo aluno", target: "text:Novo aluno" },
      { text: "Etapa 1: dados pessoais", hint: "Nome completo, telefone e e-mail. O e-mail é o login no app do aluno." },
      { text: "Etapa 2: endereço", hint: "Digite o CEP e o restante é preenchido sozinho." },
      { text: "Etapa 3: modalidade e faixa atual", hint: "Se o aluno já treina, informe a faixa em que ele está hoje." },
      { text: "Etapa 4: plano e vencimento", hint: "Ao escolher o plano, o sistema já gera a cobrança recorrente." },
      { text: "Finalize o cadastro", target: "text:Salvar" },
    ],
  },
  {
    id: "matricular-plano",
    title: "Matricular um aluno em um plano",
    question: "Como coloco um aluno já cadastrado em um plano?",
    category: "Alunos",
    duration: "2 min",
    route: "/dojo/app/students",
    steps: [
      { text: "Abra a ficha do aluno clicando no nome dele na lista." },
      { text: "Vá até a aba de Plano/Financeiro da ficha", target: "text:Financeiro" },
      { text: "Escolha o plano desejado e o dia de vencimento" },
      { text: "Confirme a matrícula", hint: "As mensalidades passam a ser geradas automaticamente." },
      { text: "Confira as faturas criadas em Financeiro", route: "/dojo/app/finance" },
    ],
  },
  {
    id: "auto-matricula",
    title: "Link público de auto-matrícula",
    question: "Como deixo o próprio aluno se matricular pelo celular?",
    category: "Alunos",
    duration: "2 min",
    route: "/dojo/app/units",
    steps: [
      { text: "Cada academia tem um link público de matrícula com o seu slug." },
      { text: "Confirme o nome/slug da sua academia em Minha conta", route: "/dojo/app/account" },
      { text: "Seu link é /matricula/seu-slug", hint: "Envie por WhatsApp ou coloque na bio do Instagram." },
      { text: "O aluno preenche os dados e cai direto na sua lista de alunos", route: "/dojo/app/students" },
      { text: "Revise o cadastro e defina o plano dele." },
    ],
  },
  {
    id: "inativar-aluno",
    title: "Inativar ou excluir um aluno",
    question: "Como removo um aluno que saiu da academia?",
    category: "Alunos",
    duration: "1 min",
    route: "/dojo/app/students",
    steps: [
      { text: "Localize o aluno na lista usando a busca." },
      { text: "Abra a ficha do aluno." },
      { text: "Use a opção de inativar/excluir matrícula", hint: "Aluno excluído some de todas as telas e perde o acesso ao app do aluno." },
      { text: "Confirme a ação", hint: "O histórico financeiro é preservado para consulta." },
    ],
  },

  // ───────────────────────────── Rotina ─────────────────────────────
  {
    id: "criar-turma",
    title: "Criar uma turma",
    question: "Como crio uma turma e coloco na agenda?",
    category: "Rotina",
    duration: "3 min",
    route: "/dojo/app/classes",
    steps: [
      { text: "Este é o módulo Turmas — tudo que você criar aqui aparece na Agenda." },
      { text: "Clique em Nova turma", target: "text:Nova turma" },
      { text: "Dê um nome e escolha a modalidade" },
      { text: "Selecione o professor e a unidade" },
      { text: "Adicione os dias e horários", hint: "Uma mesma turma pode ter vários horários na semana." },
      { text: "Salve a turma", target: "text:Salvar" },
      { text: "Veja a turma já posicionada na Agenda", route: "/dojo/app/schedule" },
    ],
  },
  {
    id: "usar-agenda",
    title: "Usar a agenda semanal",
    question: "Como acompanho os horários da semana?",
    category: "Rotina",
    duration: "2 min",
    route: "/dojo/app/schedule",
    steps: [
      { text: "A agenda mostra todas as turmas da semana por horário." },
      { text: "Use os filtros de unidade e modalidade para focar no que interessa." },
      { text: "Clique em uma turma para ver detalhes, alunos e presença." },
      { text: "Edite horários direto por aqui — a alteração reflete no módulo Turmas." },
    ],
  },
  {
    id: "checkin-qr",
    title: "Configurar o check-in",
    question: "Como funciona o check-in dos alunos?",
    category: "Rotina",
    duration: "4 min",
    route: "/dojo/app/checkin",
    steps: [
      { text: "O check-in registra a presença e alimenta ranking e critérios de graduação." },
      { text: "Escolha o modo de check-in da sua unidade", hint: "QR fixo na recepção, PIN do aluno ou reconhecimento por foto." },
      { text: "No modo QR fixo, imprima o QR da unidade e deixe na entrada", hint: "O aluno escaneia pelo app e a presença é registrada." },
      { text: "Ative a validação por geolocalização se quiser exigir presença física." },
      { text: "Salve as configurações", target: "text:Salvar" },
      { text: "Acompanhe o ranking de presenças", route: "/dojo/app/ranking" },
    ],
  },
  {
    id: "quadro-avisos",
    title: "Publicar um aviso para os alunos",
    question: "Como envio um recado para todos os alunos?",
    category: "Rotina",
    duration: "2 min",
    route: "/dojo/app/announcements",
    steps: [
      { text: "O Quadro de Avisos aparece na home do app do aluno." },
      { text: "Clique em novo aviso", target: "text:Novo" },
      { text: "Escreva título e mensagem" },
      { text: "Escolha quem deve receber", hint: "Todos, uma turma específica ou uma faixa." },
      { text: "Publique — os alunos recebem notificação push", target: "text:Publicar" },
    ],
  },

  // ─────────────────────────── Financeiro ───────────────────────────
  {
    id: "cobranca-avulsa",
    title: "Cobrança avulsa x mensalidade",
    question: "Como cobro algo que não é mensalidade (kimono, exame de faixa)?",
    category: "Financeiro",
    duration: "3 min",
    route: "/dojo/app/sales",
    steps: [
      { text: "Vendas avulsas são cobranças únicas — separadas das mensalidades." },
      { text: "Clique em Nova venda", target: "text:Nova venda" },
      { text: "Escolha o aluno e o item/serviço" },
      { text: "Informe valor, forma de pagamento e vencimento" },
      { text: "Salve — a cobrança aparece no financeiro e no app do aluno", target: "text:Salvar" },
      { text: "Mensalidades recorrentes continuam saindo dos Planos", route: "/dojo/app/plans" },
    ],
  },
  {
    id: "baixar-pagamento",
    title: "Dar baixa em um pagamento",
    question: "Como marco uma mensalidade como paga?",
    category: "Financeiro",
    duration: "2 min",
    route: "/dojo/app/finance",
    steps: [
      { text: "Este é o centro financeiro: contas a receber e a pagar." },
      { text: "Vá em Contas a receber e localize a fatura", target: "text:receber" },
      { text: "Clique na fatura para abrir os detalhes." },
      { text: "Registre o pagamento informando data e forma", hint: "Pagamentos feitos pelo AMT Pay são baixados automaticamente." },
      { text: "Confirme — o aluno passa a constar EM DIA no app dele." },
    ],
  },
  {
    id: "inadimplencia",
    title: "Controlar a inadimplência",
    question: "Como vejo quem está devendo?",
    category: "Financeiro",
    duration: "2 min",
    route: "/dojo/app/finance",
    steps: [
      { text: "Use o filtro de status para ver apenas faturas vencidas.", target: "text:Vencid" },
      { text: "Faturas com vencimento hoje ou anterior contam como pendência." },
      { text: "Abra a fatura para ver o histórico e reenviar a cobrança." },
      { text: "Configure lembretes automáticos de cobrança", route: "/dojo/app/notifications" },
      { text: "Defina quantos dias antes e depois do vencimento avisar o aluno." },
    ],
  },
  {
    id: "amt-pay",
    title: "Ativar o AMT Pay",
    question: "Como recebo pagamentos online (Pix, boleto e cartão)?",
    category: "Financeiro",
    duration: "5 min",
    route: "/dojo/app/integrations",
    steps: [
      { text: "O AMT Pay é a central financeira do dojo: Pix, boleto e cartão." },
      { text: "Confira as taxas exibidas no painel antes de ativar." },
      { text: "Conecte o gateway preenchendo as credenciais solicitadas", target: "text:gateway" },
      { text: "Cadastre a conta bancária e a chave Pix de recebimento" },
      { text: "Ative — as cobranças passam a ser geradas automaticamente." },
      { text: "Solicite saques pela carteira quando houver saldo disponível.", target: "text:Saque" },
    ],
  },

  // ────────────────────────── Graduações ──────────────────────────
  {
    id: "criterios-graduacao",
    title: "Definir critérios de graduação",
    question: "Como configuro o tempo e as aulas necessárias para graduar?",
    category: "Graduações",
    duration: "3 min",
    route: "/dojo/app/graduations",
    steps: [
      { text: "Aqui você define quando um aluno fica apto a graduar." },
      { text: "Abra as configurações de critérios", target: "text:Critérios" },
      { text: "Defina o tempo mínimo na faixa (em meses)" },
      { text: "Defina o número mínimo de aulas/check-ins" },
      { text: "Ative a liberação por mérito quando quiser decidir manualmente." },
      { text: "Salve — o sistema passa a sinalizar os alunos aptos", target: "text:Salvar" },
    ],
  },
  {
    id: "graduar-aluno",
    title: "Graduar um aluno",
    question: "Como registro a graduação de um aluno?",
    category: "Graduações",
    duration: "2 min",
    route: "/dojo/app/graduations",
    steps: [
      { text: "Clique em Nova graduação", target: "text:Nova graduação" },
      { text: "Escolha o aluno e a modalidade" },
      { text: "Selecione a nova faixa ou o novo grau/Dan" },
      { text: "Informe a data da cerimônia e observações" },
      { text: "Confirme — a faixa atual do aluno é atualizada na hora", target: "text:Salvar" },
      { text: "A nova graduação já aparece no app do aluno com a ilustração da faixa." },
    ],
  },
  {
    id: "emitir-certificado",
    title: "Emitir um certificado",
    question: "Como emito o certificado de faixa?",
    category: "Graduações",
    duration: "3 min",
    route: "/dojo/app/certificates",
    steps: [
      { text: "Escolha ou crie um modelo de certificado." },
      { text: "No editor, posicione as variáveis (nome, faixa, data)", hint: "As variáveis são preenchidas sozinhas na emissão." },
      { text: "Inclua a assinatura e o carimbo da academia." },
      { text: "Salve o modelo", target: "text:Salvar" },
      { text: "Emita o certificado escolhendo o aluno e a graduação", target: "text:Emitir" },
      { text: "Baixe o PDF ou envie direto para o aluno." },
    ],
  },

  // ────────────────────────── App do aluno ──────────────────────────
  {
    id: "app-aluno-acesso",
    title: "Como o aluno acessa o app",
    question: "Como meu aluno entra no aplicativo?",
    category: "App do aluno",
    duration: "2 min",
    route: "/dojo/app/student-app-qr",
    steps: [
      { text: "O aluno acessa com o e-mail cadastrado na ficha dele." },
      { text: "Imprima o QR desta tela e deixe visível na recepção", target: "text:QR" },
      { text: "Ao escanear, o aluno cai direto na tela de login do app." },
      { text: "Um mesmo e-mail pode ter vários alunos (pai e filho)", hint: "O app mostra um seletor de aluno no topo." },
      { text: "Alunos excluídos perdem o acesso automaticamente." },
    ],
  },
  {
    id: "notificacoes-push",
    title: "Configurar notificações",
    question: "Como aviso o aluno sobre aula e cobrança?",
    category: "App do aluno",
    duration: "3 min",
    route: "/dojo/app/notifications",
    steps: [
      { text: "Aqui ficam as notificações push do app do aluno." },
      { text: "Ative lembretes de aula e escolha quantos minutos antes avisar." },
      { text: "Ative avisos de cobrança a vencer e vencida." },
      { text: "Defina os dias de antecedência de cada aviso." },
      { text: "Salve as preferências", target: "text:Salvar" },
    ],
  },

  // ─────────────────────────── Comercial ───────────────────────────
  {
    id: "amt-store",
    title: "Vender produtos pela AMT Store",
    question: "Como vendo kimonos e produtos para meus alunos?",
    category: "Comercial",
    duration: "3 min",
    route: "/dojo/app/store",
    steps: [
      { text: "A AMT Store traz o catálogo oficial com preço de parceiro." },
      { text: "Navegue pelas categorias e escolha os produtos." },
      { text: "Monte o pedido no carrinho." },
      { text: "Finalize e acompanhe o status em Pedidos", target: "text:Pedidos" },
      { text: "Entregue ao aluno e registre a venda em Vendas avulsas", route: "/dojo/app/sales" },
    ],
  },
];

export const TUTORIAL_TRACKS: TutorialTrack[] = [...BASE_TRACKS, ...EXTRA_TRACKS];

/** Tempo estimado da trilha em minutos (usa `seconds` de cada passo). */
export function trackMinutes(track: TutorialTrack) {
  const secs = track.steps.reduce((acc, s) => acc + (s.seconds ?? 20), 0);
  return Math.max(1, Math.round(secs / 60));
}

/** Tempo restante estimado, em minutos, a partir de um passo. */
export function remainingMinutes(track: TutorialTrack, fromStep: number) {
  const secs = track.steps
    .slice(fromStep)
    .reduce((acc, s) => acc + (s.seconds ?? 20), 0);
  return Math.max(1, Math.round(secs / 60));
}

export function getTrack(id: string | null | undefined) {
  if (!id) return null;
  return TUTORIAL_TRACKS.find((t) => t.id === id) ?? null;
}

