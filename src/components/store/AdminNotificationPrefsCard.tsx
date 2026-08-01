import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ADMIN_NOTIFICATION_CATALOG } from "@/lib/push/admin-events";
import {
  getAdminNotificationPrefs,
  sendAdminPushEventTest,
  setAdminNotificationPref,
} from "@/lib/store/admin-push.functions";

/** Lista de toggles: quais notificações o admin quer receber. */
export function AdminNotificationPrefsCard() {
  const qc = useQueryClient();
  const loadPrefs = useServerFn(getAdminNotificationPrefs);
  const savePref = useServerFn(setAdminNotificationPref);
  const testEvent = useServerFn(sendAdminPushEventTest);

  const prefsQuery = useQuery({
    queryKey: ["admin-notification-prefs"],
    queryFn: () => loadPrefs(),
  });

  const prefs = prefsQuery.data?.prefs ?? {};

  const groups = useMemo(() => {
    const map = new Map<string, typeof ADMIN_NOTIFICATION_CATALOG>();
    for (const def of ADMIN_NOTIFICATION_CATALOG) {
      const list = map.get(def.group) ?? [];
      list.push(def);
      map.set(def.group, list);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = useMutation({
    mutationFn: (vars: { event: string; enabled: boolean }) => savePref({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.enabled ? "Notificação ativada." : "Notificação desativada.");
      qc.invalidateQueries({ queryKey: ["admin-notification-prefs"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Não foi possível salvar a preferência."),
  });

  const test = useMutation({
    mutationFn: (event: string) => testEvent({ data: { event } }),
    onSuccess: (r: any) => {
      if (r?.sent > 0) toast.success("Teste enviado — confira a notificação.");
      else toast.error("Nenhum dispositivo inscrito. Ative as notificações acima primeiro.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao enviar o teste."),
  });

  return (
    <Card className="border-red-500/20 bg-neutral-950/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/15 p-2.5">
            <BellRing className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-base">Quais notificações receber</CardTitle>
            <p className="text-xs text-muted-foreground">
              Escolha os alertas que chegam nos seus dispositivos. Vale para todos os aparelhos
              inscritos nesta conta.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {prefsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando preferências…
          </div>
        ) : (
          groups.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/5 bg-black/30">
                {items.map((def) => {
                  const enabled = prefs[def.event] !== false;
                  return (
                    <div
                      key={def.event}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{def.label}</p>
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => test.mutate(def.event)}
                          disabled={!enabled || test.isPending}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Testar
                        </Button>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => toggle.mutate({ event: def.event, enabled: v })}
                          disabled={toggle.isPending}
                          aria-label={`Ativar ${def.label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
