import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — AMT Growth Engine" },
      { name: "description", content: "Preferências e configurações do sistema." },
    ],
  }),
  component: SettingsPage,
});

type GeneralSettings = {
  company_name: string;
  notifications_enabled: boolean;
};

const KEY = "general";
const DEFAULTS: GeneralSettings = {
  company_name: "AMT Fight Wear",
  notifications_enabled: true,
};

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .get(KEY)
      .then((row) => {
        if (row?.value) setSettings({ ...DEFAULTS, ...(row.value as GeneralSettings) });
      })
      .catch(() => toast.error("Não foi possível carregar as configurações"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.upsert(KEY, settings as unknown as Record<string, unknown>);
      toast.success("Configurações salvas");
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Ajuste preferências gerais da plataforma."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aparência</CardTitle>
            <CardDescription>Escolha entre tema claro ou escuro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">Modo escuro</div>
                <div className="text-xs text-muted-foreground">Ative para reduzir cansaço visual</div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Geral</CardTitle>
            <CardDescription>Informações da operação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da empresa</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, company_name: e.target.value }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Notificações do sistema</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber avisos e alertas dentro do painel.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({ ...s, notifications_enabled: v }))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
