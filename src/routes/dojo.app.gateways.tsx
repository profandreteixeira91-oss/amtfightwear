import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plug, Save, Trash2, Star, StarOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  listMyGateways, upsertMyGateway, deleteMyGateway,
} from "@/lib/dojo/gateways.functions";

export const Route = createFileRoute("/dojo/app/gateways")({
  head: () => ({ meta: [{ title: "Gateways de Pagamento — AMT Dojo Manager" }] }),
  component: GatewaysPage,
});

type Provider = "mercadopago" | "asaas" | "pagseguro";

const providerMeta: Record<Provider, { label: string; hint: string; docs: string }> = {
  mercadopago: {
    label: "Mercado Pago",
    hint: "Cole o Access Token de PRODUÇÃO da sua conta Mercado Pago.",
    docs: "https://www.mercadopago.com.br/developers/panel/app",
  },
  asaas: {
    label: "Asaas",
    hint: "Cole o token da API de Produção do Asaas.",
    docs: "https://docs.asaas.com/",
  },
  pagseguro: {
    label: "PagSeguro",
    hint: "Cole o token da conta PagSeguro (produção).",
    docs: "https://dev.pagseguro.uol.com.br/",
  },
};

type GatewayRow = {
  id: string;
  provider: Provider;
  label: string | null;
  is_default: boolean;
  active: boolean;
  public_key: string | null;
  access_token: string | null;
  webhook_secret: string | null;
  updated_at: string;
};

function GatewaysPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyGateways);
  const upsert = useServerFn(upsertMyGateway);
  const remove = useServerFn(deleteMyGateway);

  const { data, isLoading } = useQuery({ queryKey: ["dojo", "gateways"], queryFn: () => list({}) });
  const gateways = (data as GatewayRow[] | undefined) ?? [];
  const [tab, setTab] = useState<Provider>("mercadopago");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gateways de Pagamento</h1>
          <p className="text-sm text-neutral-500">
            Cadastre as credenciais do seu próprio gateway para cobrar seus alunos.
            O dinheiro cai direto na sua conta.
          </p>
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            As credenciais ficam salvas de forma privada na sua conta e são usadas apenas pelo
            servidor do AMT Dojo Manager para gerar as cobranças dos seus alunos. Nunca são
            expostas no navegador nem compartilhadas com a AMT.
          </p>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Provider)}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(providerMeta) as Provider[]).map((p) => {
            const row = gateways.find((g) => g.provider === p);
            return (
              <TabsTrigger key={p} value={p} className="gap-2">
                {providerMeta[p].label}
                {row?.is_default && <Badge className="bg-red-600 text-white">Padrão</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(providerMeta) as Provider[]).map((p) => (
          <TabsContent key={p} value={p}>
            <GatewayForm
              provider={p}
              existing={gateways.find((g) => g.provider === p)}
              loading={isLoading}
              anyExists={gateways.length > 0}
              onSubmit={async (payload) => {
                await upsert({ data: payload });
                await qc.invalidateQueries({ queryKey: ["dojo", "gateways"] });
                toast.success("Gateway salvo");
              }}
              onDelete={async () => {
                if (!confirm("Remover as credenciais deste gateway?")) return;
                await remove({ data: { provider: p } });
                await qc.invalidateQueries({ queryKey: ["dojo", "gateways"] });
                toast.success("Removido");
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GatewayForm({
  provider,
  existing,
  loading,
  anyExists,
  onSubmit,
  onDelete,
}: {
  provider: Provider;
  existing: GatewayRow | undefined;
  loading: boolean;
  anyExists: boolean;
  onSubmit: (
    p: {
      provider: Provider;
      label?: string | null;
      access_token?: string | null;
      public_key?: string | null;
      webhook_secret?: string | null;
      active?: boolean;
      is_default?: boolean;
    },
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const meta = providerMeta[provider];
  const [label, setLabel] = useState(existing?.label ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState(existing?.public_key ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [active, setActive] = useState(existing?.active ?? true);
  const [isDefault, setIsDefault] = useState(existing?.is_default ?? !anyExists);
  const [busy, setBusy] = useState(false);

  const savedMask = useMemo(() => existing?.access_token ?? null, [existing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        provider,
        label: label || null,
        access_token: accessToken || null,
        public_key: publicKey || null,
        webhook_secret: webhookSecret || null,
        active,
        is_default: isDefault,
      });
      setAccessToken("");
      setWebhookSecret("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {meta.label}
          {existing && (
            <Badge variant={existing.active ? "default" : "secondary"}>
              {existing.active ? "Ativo" : "Inativo"}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-neutral-500">
          {meta.hint}{" "}
          <a href={meta.docs} target="_blank" rel="noreferrer" className="text-red-600 hover:underline">
            Onde encontrar
          </a>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome (opcional)</Label>
            <Input
              placeholder="Ex.: Conta principal"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label>Access Token</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={savedMask ? `Salvo: ${savedMask} — cole novo token para substituir` : "APP_USR-..."}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={loading}
            />
          </div>

          {provider === "mercadopago" && (
            <div className="grid gap-2">
              <Label>Public Key (opcional)</Label>
              <Input
                placeholder="APP_USR-...-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Webhook Secret (opcional)</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={existing?.webhook_secret ? "Salvo — cole novo para substituir" : "Assinatura do webhook"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-lg border p-3">
            <label className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">Ativo</span>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <span className="flex items-center gap-1 text-sm">
                {isDefault ? <Star className="h-3.5 w-3.5 text-red-600" /> : <StarOff className="h-3.5 w-3.5" />}
                Padrão para cobranças
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={busy} className="bg-red-600 hover:bg-red-700">
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
            {existing && (
              <Button type="button" variant="outline" onClick={onDelete} disabled={busy}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
