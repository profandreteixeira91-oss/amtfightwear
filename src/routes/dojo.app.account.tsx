import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/account")({
  component: AccountPage,
});

function AccountPage() {
  const [email, setEmail] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setCreatedAt(data.user?.created_at ?? "");
    });
  }, []);

  const updatePassword = async () => {
    if (password.length < 6) return toast.error("Senha muito curta");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Senha atualizada");
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Minha conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
          {createdAt && (
            <div className="text-xs text-muted-foreground">
              Conta criada em {new Date(createdAt).toLocaleDateString("pt-BR")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Alterar senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <Button onClick={updatePassword} disabled={saving}>
            {saving ? "Salvando..." : "Atualizar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
