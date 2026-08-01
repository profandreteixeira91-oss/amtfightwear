import { Zap } from "lucide-react";
import { Section, FadeIn } from "./Section";
import { CTABand } from "./CTABand";

const automations = [
  "Cobrança de mensalidade gerada e enviada automaticamente",
  "Lembrete antes do vencimento, com link de pagamento",
  "Aviso de mensalidade vencida e acompanhamento de inadimplência",
  "Baixa automática do pagamento via PIX, cartão e boleto",
  "Alerta de aluno apto à graduação por tempo, aulas e mérito",
  "Aplicação de graduações agendadas na data marcada",
  "Lembrete de aula para os alunos da turma",
  "Notificação push de novos comunicados do professor",
  "Registro de presença por QR Code, PIN, foto e localização",
  "Alerta de aluno ausente há muitos dias (risco de evasão)",
  "Contrato gerado com os dados do aluno já preenchidos",
  "Certificado de graduação emitido em PDF pronto para entrega",
  "Matrícula pública: o aluno se cadastra e a cobrança nasce sozinha",
  "Atualização automática da faixa atual no perfil e na carteirinha",
  "Sincronização de pedidos da loja e da fila de produção AMT",
  "Relatórios de faturamento e frequência atualizados em tempo real",
];

export function Automations() {
  return (
    <Section
      id="automacoes"
      eyebrow="Automações"
      title="O sistema trabalha enquanto você dá aula."
      description="Estes processos rodam sozinhos, todos os dias, sem você precisar lembrar de nada."
      className="bg-white"
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {automations.map((a, i) => (
          <FadeIn key={a} delay={i * 0.02}>
            <li className="flex h-full items-start gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4 transition-colors hover:border-[#C1121F]/30 hover:bg-white">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#C1121F]/10 text-[#C1121F]">
                <Zap className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0 pt-1 text-sm font-medium leading-relaxed text-[#111111]/80">{a}</span>
            </li>
          </FadeIn>
        ))}
      </ul>

      <CTABand title="Automatize sua academia a partir de hoje." />
    </Section>
  );
}
