import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section } from "./Section";
import { CTABand } from "./CTABand";

const faqs = [
  { q: "Preciso instalar algo?", a: "Não. O AMT Dojo Manager roda no navegador e também pode ser instalado como aplicativo no celular (PWA), tanto para você quanto para os seus alunos. Sem instalação, sem servidor e sem técnico." },
  { q: "Funciona no celular?", a: "Sim. Todo o sistema é responsivo e pensado para uso no tatame: check-in, presença, financeiro e cadastro funcionam perfeitamente no celular." },
  { q: "Meus alunos precisam pagar algo?", a: "Não. O aplicativo do aluno está incluído no plano da academia. Seus alunos usam sem nenhum custo adicional." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Não existe fidelidade nem multa. Você cancela quando quiser, direto no painel." },
  { q: "Os dados ficam seguros?", a: "Sim. Cada academia tem seus dados totalmente isolados, com criptografia, backups automáticos e regras de acesso por permissão." },
  { q: "Serve para qualquer modalidade?", a: "Sim. Jiu-Jitsu, Judô, Muay Thai, Boxe, Karatê, MMA, Taekwondo e outras. Você configura as modalidades, faixas, graus e a terminologia da sua arte (Dan, grau, kyu)." },
  { q: "Como funciona o teste gratuito?", a: "São 14 dias com acesso total a todos os módulos, sem cartão de crédito. Você cadastra a academia, importa alunos e testa tudo de verdade." },
  { q: "Existe suporte?", a: "Sim. Suporte humano por WhatsApp e e-mail, além de tutorial guiado dentro do próprio sistema para você começar sozinho." },
  { q: "Posso importar meus alunos?", a: "Sim. Você pode importar sua planilha de alunos e graduações ou cadastrar pelo wizard guiado, com máscaras de CPF, CEP e busca de endereço automática." },
  { q: "Posso controlar várias unidades?", a: "Sim. É possível gerenciar múltiplas unidades e filiais com dados isolados e visão consolidada da rede." },
  { q: "Há integração com a AMT Fight Wear?", a: "Sim. Você solicita faixas, kimonos e patches personalizados direto pelo sistema, com preço de atacado e acompanhamento da fila de produção." },
  { q: "Quais formas de pagamento os alunos podem usar?", a: "PIX, cartão de crédito e boleto, com cobrança recorrente automática, baixa do pagamento e controle de inadimplência pelo AMT Pay." },
];

export function FAQ() {
  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Perguntas frequentes."
      description="Não encontrou sua resposta? Fale com nosso time comercial."
      className="bg-neutral-50"
    >
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="overflow-hidden rounded-xl border border-black/5 bg-white px-5">
              <AccordionTrigger className="text-left text-base font-semibold text-[#111111] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#111111]/60">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
