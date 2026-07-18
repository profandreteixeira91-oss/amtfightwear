import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plug, ShieldCheck, ExternalLink, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyGateways } from "@/lib/dojo/gateways.functions";

export const Route = createFileRoute("/dojo/app/gateways")({
  head: () => ({ meta: [{ title: "Gateways de Pagamento — AMT Dojo Manager" }] }),
  component: GatewaysPage,
});

type Provider = "mercadopago" | "asaas" | "pagseguro";

const providerMeta: Record<Provider, { label: string; hint: string }> = {
  mercadopago: { label: "Mercado Pago", hint: "Cobrança via Pix, cartão e boleto." },
  asaas: { label: "Asaas", hint: "Cobrança recorrente, boleto e Pix." },
  pagseguro: { label: "PagSeguro", hint: "Cartão, Pix e boleto PagBank." },
};

type GatewayRow = {
  id: string;
  provider: Provider;
  label: string | null;
  is_default: boolean;
  active: boolean;
  access_token: string | null;
  updated_at: string;
};

function GatewaysPage() {
  const list = useServerFn(listMyGateways);
  const { data } = useQuery({ queryKey: ["dojo", "gateways"], queryFn: () => list({}) });
  const gateways = (data as GatewayRow[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gateways de Pagamento</h1>
          <p className="text-sm text-neutral-500">
            Status dos gateways vinculados a este dojo. A configuração (tokens, chaves e ativação) é feita na Central de Integrações.
          </p>
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            As credenciais ficam salvas de forma privada e são usadas apenas pelo servidor
            para gerar cobranças dos seus alunos. Nunca são expostas no navegador nem
            compartilhadas com a AMT.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(providerMeta) as Provider[]).map((p) => {
          const row = gateways.find((g) => g.provider === p);
          const configured = !!row?.access_token;
          return (
            <Card key={p}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{providerMeta[p].label}</span>
                  <div className="flex items-center gap-1">
                    {row?.is_default && (
                      <Badge className="bg-red-600 text-white gap-1">
                        <Star className="h-3 w-3" /> Padrão
                      </Badge>
                    )}
                    <Badge variant={row?.active ? "default" : "outline"}>
                      {row?.active ? "Ativo" : configured ? "Inativo" : "Não configurado"}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-neutral-500">{providerMeta[p].hint}</p>
                {row?.updated_at && (
                  <p className="text-xs text-neutral-400">
                    Atualizado em {new Date(row.updated_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">Configurar ou trocar credenciais</div>
            <div className="text-xs text-neutral-500">
              Toda gestão de gateways acontece dentro da Central de Integrações, junto com Gympass,
              TotalPass, WhatsApp e demais serviços.
            </div>
          </div>
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <Link to="/dojo/app/integrations">
              Abrir Integrações
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
