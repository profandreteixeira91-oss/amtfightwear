import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listPartnerIntegrations,
  savePartnerIntegration,
  listPartnerCheckins,
} from "@/lib/dojo/attendance.functions";
import { listDojoUnits } from "@/lib/dojo/dojo.functions";

export const Route = createFileRoute("/_authenticated/dojo/app/integrations")({
  component: DojoIntegrations,
  errorComponent: ({ error }) => <div className="p-6 text-red-500">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

type ProviderKey = "gympass" | "totalpass";

function DojoIntegrations() {
  const listInt = useServerFn(listPartnerIntegrations);
  const save = useServerFn(savePartnerIntegration);
  const listLogs = useServerFn(listPartnerCheckins);
  const listUnits = useServerFn(listDojoUnits);

  const intQ = useQuery({ queryKey: ["partner-int"], queryFn: () => listInt() });
  const logQ = useQuery({ queryKey: ["partner-logs"], queryFn: () => listLogs({ data: {} }) });
  const unitsQ = useQuery({ queryKey: ["dojo-units"], queryFn: () => listUnits() });

  const webhookBase = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações de parceiros</h1>
        <p className="text-muted-foreground text-sm">Configure GymPass e TotalPass para validar check-ins externos.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(["gympass", "totalpass"] as ProviderKey[]).map((provider) => (
          <ProviderCard
            key={provider}
            provider={provider}
            existing={(intQ.data ?? []).find((r: any) => r.provider === provider)}
            units={unitsQ.data ?? []}
            webhookUrl={`${webhookBase}/api/public/dojo/partner-checkin/${provider}`}
            onSaved={() => { intQ.refetch(); toast.success("Configuração salva"); }}
            save={save}
          />
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Últimas validações externas</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {(logQ.data ?? []).map((l: any) => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{l.provider} · {l.external_user ?? "sem id"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")} {l.reason ? `· ${l.reason}` : ""}</div>
                </div>
                <Badge variant={l.status === "approved" ? "default" : "destructive"}>{l.status}</Badge>
              </div>
            ))}
            {(logQ.data ?? []).length === 0 && <div className="py-4 text-sm text-muted-foreground">Nenhuma validação registrada.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderCard({ provider, existing, units, webhookUrl, save, onSaved }: any) {
  const [enabled, setEnabled] = useState(false);
  const [apiKeyHint, setApiKeyHint] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [unitId, setUnitId] = useState<string>("");

  useEffect(() => {
    if (existing) {
      setEnabled(!!existing.enabled);
      setApiKeyHint(existing.api_key_hint ?? "");
      setWebhookSecret(existing.webhook_secret ?? "");
      setUnitId(existing.unit_id ?? "");
    }
  }, [existing?.id]);

  async function onSave() {
    try {
      await save({ data: {
        provider,
        enabled,
        apiKeyHint: apiKeyHint || null,
        webhookSecret: webhookSecret || null,
        unitId: unitId || null,
      }});
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="capitalize">{provider}</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ativo</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Webhook URL</Label>
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground mt-1">Cadastre esta URL no painel do parceiro.</p>
        </div>
        <div>
          <Label>Segredo do webhook (HMAC)</Label>
          <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="chave compartilhada" />
        </div>
        <div>
          <Label>Referência da API key (dica)</Label>
          <Input value={apiKeyHint} onChange={(e) => setApiKeyHint(e.target.value)} placeholder="ex: prod-2026 (identificador)" />
        </div>
        <div>
          <Label>Unidade padrão</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onSave}>Salvar</Button>
      </CardContent>
    </Card>
  );
}
