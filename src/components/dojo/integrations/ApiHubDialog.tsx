import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2, Send, Power, Webhook, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  listWebhookEndpoints,
  upsertWebhookEndpoint,
  deleteWebhookEndpoint,
  testWebhookEndpoint,
  AVAILABLE_WEBHOOK_EVENTS,
} from "@/lib/dojo/apis.functions";

type Mode = "keys" | "webhooks";

export function ApiHubDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "keys" ? <KeyRound className="h-5 w-5" /> : <Webhook className="h-5 w-5" />}
            {mode === "keys" ? "API Keys" : "Webhooks"}
          </DialogTitle>
          <DialogDescription>
            {mode === "keys"
              ? "Gere chaves com escopos independentes para integrar sistemas externos ao seu dojo."
              : "Receba eventos em tempo real no endpoint da sua aplicação. Assinatura HMAC-SHA256 no header X-Dojo-Signature."}
          </DialogDescription>
        </DialogHeader>
        {mode === "keys" ? <KeysPanel /> : <WebhooksPanel />}
      </DialogContent>
    </Dialog>
  );
}

/* ============================= API KEYS ============================= */

function KeysPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const del = useServerFn(deleteApiKey);

  const q = useQuery({ queryKey: ["dojo-api-keys"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [justCreated, setJustCreated] = useState<{ key: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleScope(s: string) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function onCreate() {
    if (!name.trim() || scopes.length === 0) return toast.error("Informe nome e ao menos 1 escopo");
    setSaving(true);
    try {
      const r = await create({ data: { name: name.trim(), scopes: scopes as any } });
      setJustCreated({ key: r.key, name: r.name });
      setName("");
      setScopes(["read"]);
      qc.invalidateQueries({ queryKey: ["dojo-api-keys"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {justCreated && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
          <div className="text-sm font-medium">Chave criada: {justCreated.name}</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-2 py-1 text-xs break-all">{justCreated.key}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(justCreated.key);
                toast.success("Chave copiada");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠ Guarde agora — ela não será exibida novamente. Use no header <code>Authorization: Bearer &lt;chave&gt;</code>.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>Ok, guardei</Button>
        </div>
      )}

      <div className="rounded-lg border p-3 space-y-3">
        <div className="text-sm font-medium">Nova chave</div>
        <div className="grid gap-2">
          <Label>Nome / descrição</Label>
          <Input placeholder="Integração ERP externo" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Escopos</Label>
          <div className="flex flex-wrap gap-3">
            {["read", "write", "webhook"].map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm capitalize cursor-pointer">
                <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggleScope(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={onCreate} disabled={saving} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Gerar chave"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Chaves existentes</div>
        {(q.data ?? []).length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma chave gerada ainda.
          </div>
        )}
        {(q.data ?? []).map((k: any) => (
          <div key={k.id} className="rounded-md border p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{k.name}</span>
                {k.revoked_at ? (
                  <Badge variant="destructive">Revogada</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600/40">Ativa</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <code>{k.prefix}…</code> · escopos: {(k.scopes ?? []).join(", ")}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Criada em {new Date(k.created_at).toLocaleDateString("pt-BR")}
                {k.last_used_at ? ` · último uso ${new Date(k.last_used_at).toLocaleString("pt-BR")}` : ""}
              </div>
            </div>
            {!k.revoked_at && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await revoke({ data: { id: k.id } });
                  qc.invalidateQueries({ queryKey: ["dojo-api-keys"] });
                  toast.success("Chave revogada");
                }}
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!confirm("Excluir permanentemente esta chave?")) return;
                await del({ data: { id: k.id } });
                qc.invalidateQueries({ queryKey: ["dojo-api-keys"] });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================= WEBHOOKS ============================= */

function WebhooksPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listWebhookEndpoints);
  const upsert = useServerFn(upsertWebhookEndpoint);
  const del = useServerFn(deleteWebhookEndpoint);
  const test = useServerFn(testWebhookEndpoint);

  const q = useQuery({ queryKey: ["dojo-webhooks"], queryFn: () => list() });

  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function onCreate() {
    if (!url.trim() || events.length === 0) return toast.error("Informe URL e ao menos 1 evento");
    setSaving(true);
    try {
      const r = await upsert({ data: { url: url.trim(), events: events as any } });
      qc.invalidateQueries({ queryKey: ["dojo-webhooks"] });
      setUrl("");
      setEvents([]);
      toast.success(`Webhook criado. Secret: ${r.secret ?? ""}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="text-sm font-medium">Novo endpoint</div>
        <div className="grid gap-2">
          <Label>URL</Label>
          <Input placeholder="https://api.seusite.com/hooks/dojo" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Eventos</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_WEBHOOK_EVENTS.map((ev) => (
              <label
                key={ev}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer hover:bg-accent"
              >
                <Checkbox checked={events.includes(ev)} onCheckedChange={() => toggleEvent(ev)} />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={onCreate} disabled={saving} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Cadastrar webhook"}
        </Button>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Cada webhook recebe um secret automático. Verifique o header <code>X-Dojo-Signature</code> (HMAC-SHA256 do body).
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Endpoints cadastrados</div>
        {(q.data ?? []).length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum webhook cadastrado.
          </div>
        )}
        {(q.data ?? []).map((w: any) => (
          <EndpointRow
            key={w.id}
            ep={w}
            onToggle={async () => {
              await upsert({ data: { id: w.id, url: w.url, events: w.events, active: !w.active } });
              qc.invalidateQueries({ queryKey: ["dojo-webhooks"] });
            }}
            onDelete={async () => {
              if (!confirm("Excluir este webhook?")) return;
              await del({ data: { id: w.id } });
              qc.invalidateQueries({ queryKey: ["dojo-webhooks"] });
            }}
            onTest={async () => {
              const r = await test({ data: { id: w.id } });
              if (r.ok) toast.success(`Entrega OK (${r.status})`);
              else toast.error(`Falha (${r.status || "sem resposta"}): ${r.response.slice(0, 120)}`);
              qc.invalidateQueries({ queryKey: ["dojo-webhooks"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EndpointRow({
  ep,
  onToggle,
  onDelete,
  onTest,
}: {
  ep: any;
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-medium break-all">{ep.url}</code>
            {ep.last_status ? (
              <Badge variant={ep.last_status < 300 ? "outline" : "destructive"}>{ep.last_status}</Badge>
            ) : null}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {(ep.events ?? []).join(", ")}
          </div>
          {ep.secret && (
            <div className="flex items-center gap-1 mt-1">
              <code className="text-[11px] text-muted-foreground truncate">{ep.secret}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(ep.secret);
                  toast.success("Secret copiado");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={ep.active} onCheckedChange={onToggle} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onTest}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
