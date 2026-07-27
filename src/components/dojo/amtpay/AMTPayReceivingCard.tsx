import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, KeyRound, ArrowDownRight, ShieldCheck, Info } from "lucide-react";

/**
 * Modelo AMT Pay 2025: conta Asaas central única.
 *
 * Todos os pagamentos dos alunos entram na conta Asaas da AMT. O sistema
 * calcula a taxa AMT (2%) via ledger interno e credita o saldo líquido na
 * carteira do dojo. O dono solicita saque e o valor é transferido via PIX
 * para a chave PIX cadastrada.
 */
export function AMTPayReceivingCard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 md:grid-cols-3">
            <Step
              n={1}
              title="Aluno paga"
              body="Cobrança é gerada pelo AMT Pay e paga pelo aluno (Pix, boleto ou cartão). O valor entra na conta AMT Pay central da AMT."
            />
            <Step
              n={2}
              title="Saldo credita na carteira"
              body="O sistema aplica a taxa AMT de 2% e a taxa do gateway, e credita o líquido na sua carteira interna."
            />
            <Step
              n={3}
              title="Você saca via PIX"
              body="Solicite saque quando quiser: o valor é transferido via PIX da conta AMT para sua chave PIX cadastrada."
            />
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Recebimento centralizado, sem burocracia</AlertTitle>
            <AlertDescription>
              Você não precisa abrir conta em gateway, enviar documentos de KYC
              nem manter dados bancários adicionais. Basta cadastrar sua chave
              PIX na aba <strong>Chaves PIX</strong>.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock
              icon={<KeyRound className="h-4 w-4" />}
              title="Chave PIX"
              body='Cadastre a chave em "Chaves PIX". Ela é o destino dos seus saques.'
            />
            <InfoBlock
              icon={<ArrowDownRight className="h-4 w-4" />}
              title="Saques"
              body='Solicite quando quiser em "Saques". A transferência PIX cai em minutos.'
            />
          </div>

          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription>
              A taxa AMT de 2% já é abatida automaticamente no crédito da
              carteira. Você vê o breakdown de cada recebimento na aba{" "}
              <strong>Extrato</strong>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {n}
        </div>
        <div className="font-medium text-sm">{title}</div>
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon} {title}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
