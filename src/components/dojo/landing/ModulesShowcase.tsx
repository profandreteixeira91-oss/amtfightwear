import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FadeIn } from "./Section";
import { CTABand } from "./CTABand";
import { SHOT, type ShotKey } from "./shots";
import { ShotFrame } from "./ShotFrame";

type Mod = {
  name: string;
  desc: string;
  problem: string;
  benefit: string;
  shot?: ShotKey;
  href: string;
  group: string;
};

const GROUPS = ["Gestão", "Financeiro", "Ensino", "Crescimento", "Aplicativos"] as const;

const MODULES: Mod[] = [
  { group: "Gestão", name: "Dashboard", desc: "Visão executiva do dojo em tempo real.", problem: "Você não sabe como a academia está hoje.", benefit: "Decisão baseada em números, não em achismo.", shot: "dashboard", href: "/dojo/auth" },
  { group: "Gestão", name: "Alunos", desc: "Cadastro completo, faixas, plano, contrato e histórico.", problem: "Dados espalhados em planilhas e papéis.", benefit: "Ficha única e confiável por aluno.", shot: "students", href: "/dojo/auth" },
  { group: "Gestão", name: "Check-ins", desc: "Presença por QR Code fixo, PIN e geolocalização.", problem: "Lista de presença no papel.", benefit: "Frequência real e automática.", shot: "checkin", href: "/dojo/auth" },
  { group: "Gestão", name: "Check-in por Foto", desc: "Reconhecimento do aluno por foto na recepção.", problem: "Fila e conferência manual.", benefit: "Entrada em segundos, sem atrito.", shot: "checkin", href: "/dojo/auth" },
  { group: "Gestão", name: "Controle de Presença", desc: "Histórico por turma, aluno e período, com retroativo.", problem: "Ninguém sabe quem parou de treinar.", benefit: "Aja antes do aluno evadir.", shot: "checkin", href: "/dojo/auth" },
  { group: "Gestão", name: "Agenda", desc: "Calendário de aulas com professores e horários múltiplos.", problem: "Grade combinada de boca.", benefit: "Todos sabem onde e quando treinar.", shot: "schedule", href: "/dojo/auth" },
  { group: "Gestão", name: "Turmas", desc: "Turmas vinculadas à agenda, com alunos e limite de vagas.", problem: "Turmas sem controle de lotação.", benefit: "Salas equilibradas e organizadas.", shot: "schedule", href: "/dojo/auth" },
  { group: "Gestão", name: "Professores", desc: "Equipe, escalas, permissões e folha de pagamento.", problem: "Substituições e pagamentos no caderno.", benefit: "Equipe alinhada e paga em dia.", href: "/dojo/auth" },
  { group: "Gestão", name: "Unidades e Filiais", desc: "Multiunidade com dados isolados e visão consolidada.", problem: "Cada filial com um controle diferente.", benefit: "Rede inteira num só painel.", href: "/dojo/auth" },
  { group: "Gestão", name: "Área Administrativa", desc: "Usuários do sistema, permissões e auditoria.", problem: "Todos com acesso a tudo.", benefit: "Cada função vê apenas o que precisa.", href: "/dojo/auth" },
  { group: "Gestão", name: "Configurações", desc: "Modalidades, faixas, unidades, marca e regras do dojo.", problem: "Sistema que não se adapta ao seu método.", benefit: "A plataforma segue a sua escola.", href: "/dojo/auth" },
  { group: "Gestão", name: "Tutorial Guiado", desc: "Passo a passo dentro do sistema para começar sozinho.", problem: "Medo de não saber usar.", benefit: "Autonomia desde o primeiro acesso.", href: "/dojo/auth" },
  { group: "Gestão", name: "Notificações", desc: "Push e e-mail com regras e horários configuráveis.", problem: "Aviso importante que ninguém vê.", benefit: "Mensagem certa, na hora certa.", shot: "announcements", href: "/dojo/auth" },

  { group: "Financeiro", name: "Financeiro", desc: "Receitas, despesas, inadimplência e relatórios.", problem: "Você não sabe se deu lucro no mês.", benefit: "Caixa claro, decisão segura.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "Mensalidades", desc: "Cobrança recorrente com vencimento por aluno.", problem: "Cobrar um por um no WhatsApp.", benefit: "Receita previsível sem esforço.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "AMT Pay", desc: "PIX, cartão e boleto com split automático de 2%.", problem: "Gateway caro e complicado.", benefit: "Receba direto, com taxa transparente.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "Planos", desc: "Planos, valores, períodos e descontos.", problem: "Cada aluno com um acordo diferente.", benefit: "Preço padronizado e lucrativo.", href: "/dojo/auth" },
  { group: "Financeiro", name: "Controle de Caixa", desc: "Entradas e saídas do dia com conferência.", problem: "Dinheiro sem rastro.", benefit: "Caixa fechado todo dia.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "Fluxo de Caixa", desc: "Projeção de recebimentos e despesas futuras.", problem: "Surpresas no fim do mês.", benefit: "Antecipe problemas de caixa.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "Relatórios Financeiros", desc: "Faturamento, inadimplência e ticket médio.", problem: "Nenhum dado para crescer.", benefit: "Números prontos para decidir.", shot: "finance", href: "/dojo/auth" },
  { group: "Financeiro", name: "Dashboard Executivo", desc: "Indicadores do negócio em uma tela.", problem: "Relatório que ninguém lê.", benefit: "Gestão em 30 segundos por dia.", shot: "dashboard", href: "/dojo/auth" },
  { group: "Financeiro", name: "Relatórios", desc: "Exportações de alunos, presença e graduações.", problem: "Dados presos no sistema.", benefit: "Informação na mão quando precisar.", href: "/dojo/auth" },

  { group: "Ensino", name: "Graduações", desc: "Faixas, graus, critérios e histórico por aluno.", problem: "Graduação esquecida ou injusta.", benefit: "Evolução justa e documentada.", shot: "graduations", href: "/dojo/auth" },
  { group: "Ensino", name: "Avaliações", desc: "Avaliações técnicas e físicas 100% manuais do instrutor.", problem: "Sem critério para graduar.", benefit: "Evolução medida por fundamento.", shot: "evaluations", href: "/dojo/auth" },
  { group: "Ensino", name: "Certificados", desc: "Editor visual e emissão em PDF A4 com assinatura.", problem: "Certificado feito no Word.", benefit: "Entrega premium na cerimônia.", shot: "graduations", href: "/dojo/auth" },
  { group: "Ensino", name: "Biblioteca Técnica", desc: "Vídeos e técnicas organizados por categoria e faixa.", problem: "Conteúdo perdido no celular.", benefit: "Aluno treinando também em casa.", href: "/dojo/auth" },
  { group: "Ensino", name: "Contratos", desc: "Contratos com variáveis, consentimentos e histórico.", problem: "Contrato impresso e perdido.", benefit: "Segurança jurídica organizada.", href: "/dojo/auth" },
  { group: "Ensino", name: "Assinaturas Digitais", desc: "Assinatura do responsável direto na tela.", problem: "Correr atrás de assinatura.", benefit: "Matrícula fechada na hora.", href: "/dojo/auth" },
  { group: "Ensino", name: "Competições", desc: "Calendário, inscrições, cartel e resultados da equipe.", problem: "Campeonato organizado no grupo.", benefit: "Equipe competitiva e registrada.", shot: "competitions", href: "/dojo/auth" },

  { group: "Crescimento", name: "Marketing", desc: "Comunicados segmentados e calendário de conteúdo.", problem: "Academia invisível na internet.", benefit: "Mais alunos entrando todo mês.", shot: "announcements", href: "/dojo/auth" },
  { group: "Crescimento", name: "Instagram", desc: "Conteúdo e mensagens integrados ao ecossistema AMT.", problem: "Rede social abandonada.", benefit: "Presença constante sem esforço.", href: "/dojo/auth" },
  { group: "Crescimento", name: "Leads", desc: "Captação de interessados e pipeline de matrícula.", problem: "Interessado que nunca é respondido.", benefit: "Nenhuma matrícula perdida.", href: "/dojo/auth" },
  { group: "Crescimento", name: "Loja Integrada", desc: "Produtos oficiais vendidos dentro do sistema.", problem: "Venda de kimono no caderno.", benefit: "Receita extra automática.", shot: "store", href: "/dojo/auth" },
  { group: "Crescimento", name: "AMT Fight Wear", desc: "Faixas, kimonos e patches personalizados com preço de atacado.", problem: "Fornecedor caro e sem padrão.", benefit: "Material da sua marca, direto da fábrica.", shot: "store", href: "/dojo/auth" },
  { group: "Crescimento", name: "Fila de Produção", desc: "Acompanhamento de pedidos personalizados da AMT.", problem: "Pedido sem previsão de entrega.", benefit: "Status do material em tempo real.", shot: "store", href: "/dojo/auth" },

  { group: "Aplicativos", name: "App do Aluno", desc: "PWA com carteirinha, financeiro, agenda e presença.", problem: "Aluno perguntando tudo no WhatsApp.", benefit: "Aluno autônomo e engajado.", shot: "studentApp", href: "/app/login" },
  { group: "Aplicativos", name: "Aplicativo Administrativo", desc: "Instale o Dojo Manager no celular do dono e da equipe.", problem: "Gestão presa ao computador.", benefit: "Academia na sua mão, de onde estiver.", shot: "dashboard", href: "/dojo/auth" },
];

export function ModulesShowcase() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Gestão");
  const list = MODULES.filter((m) => m.group === group);

  return (
    <Section
      id="modulos"
      eyebrow="Módulos"
      title="Todos os módulos, com telas reais."
      description="Cada módulo resolve um problema específico da sua academia. Navegue pelas categorias."
      className="bg-neutral-50"
    >
      <div className="mb-9 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Categorias de módulos">
        {GROUPS.map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={`min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors ${
              group === g
                ? "border-[#C1121F] bg-[#C1121F] text-white"
                : "border-black/10 bg-white text-[#111111]/70 hover:border-[#C1121F]/40 hover:text-[#C1121F]"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((m, i) => (
          <FadeIn key={m.name} delay={i * 0.03}>
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition-all hover:-translate-y-1 hover:border-[#C1121F]/25 hover:shadow-xl">
              {m.shot ? (
                <ShotFrame
                  src={SHOT[m.shot]}
                  alt={`Tela real do módulo ${m.name} do AMT Dojo Manager`}
                  zoom="md"
                />
              ) : (
                <div className="grid aspect-[16/9] w-full place-items-center bg-[#111111] px-6 text-center">
                  <span className="text-lg font-black uppercase tracking-wide text-white/85">{m.name}</span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-[#111111]">{m.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#111111]/60">{m.desc}</p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-[#111111]/40">Problema que resolve</dt>
                    <dd className="mt-0.5 text-[#111111]/70">{m.problem}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-[#C1121F]">Benefício principal</dt>
                    <dd className="mt-0.5 font-medium text-[#111111]/80">{m.benefit}</dd>
                  </div>
                </dl>
                <Button
                  asChild
                  variant="outline"
                  className="mt-5 min-h-11 w-full rounded-full border-black/15 text-sm font-semibold text-[#111111] hover:border-[#C1121F] hover:text-[#C1121F]"
                >
                  <a href={m.href}>
                    Conheça este módulo
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </article>
          </FadeIn>
        ))}
      </div>

      <CTABand title="Todos os módulos inclusos no mesmo plano." />
    </Section>
  );
}
