import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { staffSupabase as supabase } from "@/lib/dojo/staff-auth/staff-client";
import { useStaff } from "@/components/dojo/staff/staff-context";
import { StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { STAFF_MODULES } from "@/lib/dojo/staff-modules";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dojo/staff/_portal/profile")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Portal da Equipe" },
      { name: "description", content: "Dados da conta do professor e permissões concedidas pelo dono do dojo." },
      { property: "og:title", content: "Meu Perfil — Portal da Equipe" },
      { property: "og:description", content: "Conta, vínculo com o dojo e permissões do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffProfile,
});

function StaffProfile() {
  const staff = useStaff();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/dojo/staff/auth", replace: true });
  };

  const LABEL: Record<string, string> = { none: "Sem acesso", read: "Somente leitura", write: "Acesso total" };

  return (
    <div className="space-y-4">
      <StaffPageHeader title="Meu Perfil" subtitle="Conta da equipe e permissões" />

      <Card className="space-y-1 p-4 text-sm">
        <Row label="Nome" value={staff.full_name ?? "—"} />
        <Row label="E-mail" value={staff.email} />
        <Row label="Cargo" value={staff.role ?? "—"} />
        <Row label="Dojo" value={staff.academy?.trade_name ?? staff.academy?.legal_name ?? "—"} />
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold">Permissões concedidas</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Somente o dono do dojo pode alterar estes níveis de acesso.
        </p>
        <ul className="space-y-1">
          {STAFF_MODULES.filter((m) => m.key !== "dashboard").map((m) => {
            const lvl = staff.permissions[m.key] ?? "none";
            return (
              <li key={m.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{m.label}</span>
                <Badge variant={lvl === "write" ? "default" : lvl === "read" ? "secondary" : "outline"}>
                  {LABEL[lvl]}
                </Badge>
              </li>
            );
          })}
        </ul>
      </Card>

      <Button variant="outline" onClick={signOut} className="w-full sm:w-auto">
        <LogOut className="mr-2 h-4 w-4" /> Sair do portal
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
