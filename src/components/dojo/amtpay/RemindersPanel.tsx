import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReminderSettings,
  updateReminderSettings,
  listRecentReminders,
  DEFAULT_REMINDER_SETTINGS,
  type ReminderRule,
  type ReminderSettings,
} from "@/lib/dojo/reminders.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, BellRing, Plus, Trash2, Mail, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RemindersPanel() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["dojo-reminder-settings"],
    queryFn: () => getReminderSettings(),
  });
  const historyQ = useQuery({
    queryKey: ["dojo-reminder-history"],
    queryFn: () => listRecentReminders(),
  });

  const [draft, setDraft] = useState<ReminderSettings | null>(null);
  useEffect(() => {
    if (settingsQ.data && !draft) setDraft(settingsQ.data);
  }, [settingsQ.data, draft]);

  const save = useMutation({
    mutationFn: (data: ReminderSettings) =>
      updateReminderSettings({ data }),
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["dojo-reminder-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const current: ReminderSettings =
    draft ?? settingsQ.data ?? DEFAULT_REMINDER_SETTINGS;

  const sortedRules = useMemo(
    () => [...current.rules].sort((a, b) => a.offset_days - b.offset_days),
    [current.rules],
  );

  function patch(next: Partial<ReminderSettings>) {
    setDraft({ ...current, ...next });
  }
  function updateRule(idx: number, patchRule: Partial<ReminderRule>) {
    const list = [...current.rules];
    list[idx] = { ...list[idx], ...patchRule };
    patch({ rules: list });
  }
  function addRule() {
    const list = [
      ...current.rules,
      { offset_days: 5, label: "Lembrete adicional", enabled: true },
    ];
    patch({ rules: list });
  }
  function removeRule(idx: number) {
    const list = current.rules.filter((_, i) => i !== idx);
    patch({ rules: list });
  }
  function resetDefaults() {
    setDraft(DEFAULT_REMINDER_SETTINGS);
  }

  if (settingsQ.isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertTitle>Lembretes automáticos de mensalidade</AlertTitle>
        <AlertDescription>
          Configure quando e como o AMT Pay deve avisar o aluno sobre a próxima
          cobrança. Os disparos rodam diariamente e são idempotentes — cada
          fatura recebe cada lembrete no máximo uma vez.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Regras de envio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Use valores negativos para lembretes ANTES do vencimento e
              positivos para faturas em atraso.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="rem-enabled" className="text-sm">
              Ativo
            </Label>
            <Switch
              id="rem-enabled"
              checked={current.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Mail className="h-4 w-4 text-teal-600" />
              <span className="text-sm">E-mail</span>
              <Switch
                checked={current.channels.email}
                onCheckedChange={(v) =>
                  patch({ channels: { ...current.channels, email: v } })
                }
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 opacity-60">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">WhatsApp</span>
              <Switch
                checked={current.channels.whatsapp}
                onCheckedChange={(v) =>
                  patch({ channels: { ...current.channels, whatsapp: v } })
                }
                disabled
              />
              <Badge variant="secondary" className="text-[10px]">
                em breve
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            {sortedRules.map((rule) => {
              const idx = current.rules.indexOf(rule);
              return (
                <div
                  key={`${rule.offset_days}-${idx}`}
                  className="grid grid-cols-1 md:grid-cols-[100px,1fr,auto,auto] gap-3 items-center rounded-lg border p-3"
                >
                  <div className="flex flex-col">
                    <Label className="text-[11px] text-muted-foreground">
                      Dias
                    </Label>
                    <Input
                      type="number"
                      value={rule.offset_days}
                      onChange={(e) =>
                        updateRule(idx, {
                          offset_days: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-[11px] text-muted-foreground">
                      Descrição
                    </Label>
                    <Input
                      value={rule.label}
                      onChange={(e) => updateRule(idx, { label: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(v) => updateRule(idx, { enabled: v })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {rule.enabled ? "Ativo" : "Pausado"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(idx)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={addRule}>
                <Plus className="h-4 w-4 mr-1" /> Nova regra
              </Button>
              <Button variant="ghost" size="sm" onClick={resetDefaults}>
                Restaurar padrão
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label className="text-xs">Janela de envio (início)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={current.quiet_hours.start}
                onChange={(e) =>
                  patch({
                    quiet_hours: {
                      ...current.quiet_hours,
                      start: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Janela de envio (fim)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={current.quiet_hours.end}
                onChange={(e) =>
                  patch({
                    quiet_hours: {
                      ...current.quiet_hours,
                      end: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(settingsQ.data ?? null)}>
              Descartar
            </Button>
            <Button
              onClick={() => save.mutate(current)}
              disabled={save.isPending}
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar configurações"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos disparos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Registros dos 50 lembretes mais recentes.
          </p>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !historyQ.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum lembrete enviado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {historyQ.data.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border rounded-lg p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {r.invoice?.student?.full_name ?? "Aluno"} —{" "}
                      {r.invoice?.description ?? "Fatura"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.invoice?.student?.email ?? "sem e-mail"} · vencimento{" "}
                      {r.invoice?.due_date ?? "?"} · offset {r.offset_days}d
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        r.status === "sent"
                          ? "default"
                          : r.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.sent_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
