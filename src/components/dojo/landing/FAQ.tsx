import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section } from "./Section";

const faqs = [
  { q: "Posso controlar várias unidades?", a: "Sim. O plano Professional permite até 3 unidades e o Enterprise oferece unidades ilimitadas com relatórios consolidados." },
  { q: "Existe aplicativo para alunos?", a: "Sim. O App do Aluno inclui carteirinha digital, presença, histórico de graduações, notificações e perfil completo." },
  { q: "O sistema gera certificados?", a: "Sim. Certificados de graduação são gerados automaticamente a partir de templates personalizáveis com assinatura digital." },
  { q: "Há integração com a AMT Fight Wear?", a: "Sim. Sua academia pode solicitar faixas, kimonos, patches e produtos personalizados diretamente pelo sistema." },
  { q: "Posso controlar graduações?", a: "Sim. Controle completo de faixas, graus, requisitos, tempo mínimo e histórico individual de cada aluno." },
  { q: "O financeiro possui PIX?", a: "Sim. PIX, cartão de crédito, boleto e cobranças recorrentes com controle de inadimplência." },
  { q: "É possível integrar meios de pagamento?", a: "Sim. Suportamos os principais gateways do mercado brasileiro, além de GymPass e TotalPass." },
  { q: "Como funciona o suporte?", a: "Suporte por e-mail no plano Starter, prioritário no Professional e gerente de conta dedicado no Enterprise." },
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
