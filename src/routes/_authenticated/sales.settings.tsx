import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2, Copy } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getSalesSettings, updateSalesSettings } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales/settings")({
  component: SalesSettingsPage,
});

function SalesSettingsPage() {
  const get = useServerFn(getSalesSettings);
  const update = useServerFn(updateSalesSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["sales-settings"], queryFn: () => get() });

  const [form, setForm] = useState({
    tone: "",
    greeting_web: "",
    greeting_wa: "",
    greeting_ig: "",
    channel_web_enabled: true,
    channel_wa_enabled: false,
    channel_ig_enabled: false,
    offline_message: "",
    site_url: "",
    cart_url_template: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        tone: data.tone ?? "",
        greeting_web: data.greeting_web ?? "",
        greeting_wa: data.greeting_wa ?? "",
        greeting_ig: data.greeting_ig ?? "",
        channel_web_enabled: !!data.channel_web_enabled,
        channel_wa_enabled: !!data.channel_wa_enabled,
        channel_ig_enabled: !!data.channel_ig_enabled,
        offline_message: data.offline_message ?? "",
        site_url: data.site_url ?? "",
        cart_url_template: data.cart_url_template ?? "",
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (payload: typeof form) => update({ data: payload }),
    onSuccess: () => {
      toast.success("Configurações atualizadas");
      qc.invalidateQueries({ queryKey: ["sales-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedSnippet = `<iframe src="${origin}/salesbot" style="position:fixed;bottom:20px;right:20px;width:380px;height:560px;border:0;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:9999" title="AMT Assistente"></iframe>`;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings2}
        title="Configurações do SalesBot"
        description="Tom de voz, canais ativos e template do checkout."
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <SectionCard title="Comportamento" description="Como o agente se apresenta ao cliente.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Tom de voz</Label>
                <Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Saudação — Web</Label>
                <Textarea rows={3} value={form.greeting_web} onChange={(e) => setForm({ ...form, greeting_web: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Saudação — WhatsApp</Label>
                <Textarea rows={3} value={form.greeting_wa} onChange={(e) => setForm({ ...form, greeting_wa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Saudação — Instagram</Label>
                <Textarea rows={3} value={form.greeting_ig} onChange={(e) => setForm({ ...form, greeting_ig: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem offline</Label>
                <Textarea rows={3} value={form.offline_message} onChange={(e) => setForm({ ...form, offline_message: e.target.value })} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Canais" description="Ative apenas os canais configurados nas Conexões e APIs.">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["channel_web_enabled", "Web (site oficial)"],
                ["channel_wa_enabled", "WhatsApp Business"],
                ["channel_ig_enabled", "Instagram Direct"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={form[k as keyof typeof form] as boolean}
                    onCheckedChange={(v) => setForm({ ...form, [k]: v })}
                  />
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Loja e checkout" description="URLs usadas pelo agente ao montar o pedido.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>URL do site</Label>
                <Input value={form.site_url} onChange={(e) => setForm({ ...form, site_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Template do carrinho</Label>
                <Input value={form.cart_url_template} onChange={(e) => setForm({ ...form, cart_url_template: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  Use os placeholders <code>{"{ids}"}</code> e <code>{"{qtys}"}</code>.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Widget para o site" description="Cole este iframe no rodapé do amtfightwear.com.br.">
            <div className="space-y-3">
              <Textarea readOnly rows={4} value={embedSnippet} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(embedSnippet);
                  toast.success("Snippet copiado");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar snippet
              </Button>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>
              {mut.isPending ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
