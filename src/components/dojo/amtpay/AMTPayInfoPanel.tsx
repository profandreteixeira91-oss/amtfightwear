import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Percent,
  Receipt,
  ShieldCheck,
  Lock,
  KeyRound,
  FileCheck2,
  ScrollText,
  Building2,
  Wallet,
  CreditCard,
  QrCode,
  Barcode,
  AlertTriangle,
} from "lucide-react";

/**
 * Painel institucional do AMT Pay: explica o que é o produto, quais taxas
 * incidem em cada transação e como os dados financeiros e pessoais são
 * protegidos. Não busca dados — é conteúdo estático de referência.
 */
export function AMTPayInfoPanel() {
  return (
    <div className="space-y-6">
      {/* O que é */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            O que é o AMT Pay?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            O <strong className="text-foreground">AMT Pay</strong> é a central
            financeira nativa do Dojo Manager. Ele conecta o seu dojo a um
            provedor bancário licenciado (Asaas — instituição de pagamento
            autorizada pelo Banco Central) e cuida de todo o ciclo de
            recebimentos: mensalidades recorrentes, cobranças avulsas, links
            de pagamento, boletos, PIX e cartão de crédito.
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            <InfoItem icon={Wallet} title="Carteira do dojo">
              Saldo, extrato, recebimentos do dia e do mês em tempo real.
            </InfoItem>
            <InfoItem icon={Receipt} title="Cobranças automáticas">
              Assinaturas recorrentes por plano — o aluno paga, o sistema
              concilia.
            </InfoItem>
            <InfoItem icon={QrCode} title="PIX, boleto e cartão">
              Ofereça as formas de pagamento permitidas pelo plano do aluno.
            </InfoItem>
            <InfoItem icon={Building2} title="Subconta em seu nome">
              O dinheiro entra em uma subconta bancária no CNPJ/CPF do dojo,
              não em conta da AMT.
            </InfoItem>
          </ul>
        </CardContent>
      </Card>

      {/* Taxas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-primary" />
            Taxas e valores cobrados por transação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Taxa da plataforma AMT
                </div>
                <div className="text-2xl font-bold tracking-tight mt-0.5">
                  2,00% <span className="text-sm font-normal text-muted-foreground">por transação aprovada</span>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">Split automático</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Descontada automaticamente via split no momento da liquidação.
              Cobre a operação do Dojo Manager, integrações, suporte e
              infraestrutura. <strong>Não</strong> há mensalidade, setup ou
              taxa fixa mensal.
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Taxas do meio de pagamento (Asaas)
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <FeeCard
                icon={QrCode}
                method="PIX"
                fee="R$ 1,99"
                note="por cobrança recebida"
              />
              <FeeCard
                icon={Barcode}
                method="Boleto bancário"
                fee="R$ 1,99"
                note="por boleto pago"
              />
              <FeeCard
                icon={CreditCard}
                method="Cartão de crédito"
                fee="2,99% + R$ 0,49"
                note="à vista; parcelado tem tarifa progressiva"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Valores de referência praticados pelo Asaas na data desta
              publicação. A tabela oficial e atualizada fica disponível no
              extrato de cada cobrança e no painel do Asaas —{" "}
              <a
                href="https://www.asaas.com/precos"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                asaas.com/precos
              </a>
              . Reembolsos, contestações (chargeback) e antecipação de
              recebíveis podem ter tarifas específicas cobradas diretamente
              pelo Asaas.
            </p>
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>Transparência total:</strong> cada cobrança gera um
              lançamento no extrato indicando o valor bruto, a taxa do meio
              de pagamento (Asaas) e o split de 2% da AMT. O valor líquido é
              o que fica na sua carteira.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prazos de liquidação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            Prazos de recebimento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
          <TermCard label="PIX" value="Em segundos" note="Confirmação instantânea" />
          <TermCard label="Boleto" value="1 a 2 dias úteis" note="Após a compensação bancária" />
          <TermCard label="Cartão de crédito" value="D+30 (padrão)" note="Ou D+2 com antecipação" />
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Segurança e proteção de dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="grid gap-2 md:grid-cols-2">
            <SecItem icon={Building2} title="Instituição autorizada">
              Asaas Gestão Financeira IP S/A — instituição de pagamento
              regulada e supervisionada pelo <strong>Banco Central do Brasil</strong>.
            </SecItem>
            <SecItem icon={Lock} title="Criptografia TLS 1.2+">
              Todo o tráfego entre o Dojo Manager, o Asaas e o seu navegador
              é criptografado em trânsito (HTTPS).
            </SecItem>
            <SecItem icon={KeyRound} title="Tokenização de cartões">
              Números de cartão nunca são armazenados no Dojo Manager. O
              Asaas é certificado <strong>PCI-DSS nível 1</strong>.
            </SecItem>
            <SecItem icon={FileCheck2} title="Conformidade LGPD">
              Tratamos dados pessoais conforme a Lei Geral de Proteção de
              Dados (Lei 13.709/2018). Documentos de KYC ficam em bucket
              privado com acesso restrito por função.
            </SecItem>
            <SecItem icon={ShieldCheck} title="Split contábil isolado">
              O dinheiro dos seus alunos entra na subconta bancária em nome
              do seu dojo. A AMT <strong>não movimenta</strong> o saldo — só
              recebe a taxa de 2% via split automático.
            </SecItem>
            <SecItem icon={Wallet} title="Saques só para conta titular">
              Transferências e PIX só são liberados para contas bancárias
              cujo CPF/CNPJ seja o mesmo do titular do dojo cadastrado.
            </SecItem>
          </ul>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Seus direitos como titular de dados (LGPD):</strong>{" "}
            você pode solicitar a qualquer momento acesso, correção,
            portabilidade ou exclusão dos seus dados pessoais tratados pelo
            Dojo Manager. Entre em contato pelo canal de suporte informado
            no rodapé do sistema.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2 rounded-md border bg-background p-3">
      <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function FeeCard({
  icon: Icon,
  method,
  fee,
  note,
}: {
  icon: any;
  method: string;
  fee: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {method}
      </div>
      <div className="text-lg font-semibold tracking-tight mt-1">{fee}</div>
      <div className="text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}

function TermCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tracking-tight mt-0.5">{value}</div>
      <div className="text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}

function SecItem({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2 rounded-md border bg-background p-3">
      <Icon className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </li>
  );
}
