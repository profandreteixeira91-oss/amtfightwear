import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  KeyRound,
  ShieldCheck,
  UserCircle,
  Save,
  Mail,
  Lock,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  listTeamMembers,
  setTeamMemberLogin,
  updateTeamMemberPermissions,
  unlinkTeamMemberUser,
} from "@/lib/dojo/team.functions";
import { PERMISSION_MODULES, type PermissionMap } from "@/lib/dojo/permissions";
import { useDojoPermissions } from "@/components/dojo/DojoPermissionsProvider";

export const Route = createFileRoute("/dojo/app/system-users")({
  head: () => ({ meta: [{ title: "Usuários do Sistema — AMT Dojo Manager" }] }),
  component: SystemUsersPage,
});

function SystemUsersPage() {
  const { isOwner, loading } = useDojoPermissions();
  const qc = useQueryClient();
  const listFn = useServerFn(listTeamMembers);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["dojo", "team", "system-users"],
    queryFn: () => listFn(),
    enabled: isOwner,
  });

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Apenas o dono do dojo pode gerenciar os usuários do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserCircle className="h-4 w-4" />
          Estrutura · Usuários do Sistema
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Logins e permissões da equipe</h1>
        <p className="text-sm text-muted-foreground">
          Crie logins de acesso ao painel para cada colaborador e escolha quais módulos
          da barra lateral ficarão visíveis para ele.
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando colaboradores…</div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum colaborador cadastrado ainda. Cadastre em <b>Pessoas › Equipe</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m: any) => (
            <MemberRow key={m.id} member={m} qc={qc} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, qc }: { member: any; qc: ReturnType<typeof useQueryClient> }) {
  const saveLoginFn = useServerFn(setTeamMemberLogin);
  const savePermsFn = useServerFn(updateTeamMemberPermissions);
  const unlinkFn = useServerFn(unlinkTeamMemberUser);

  const [passOpen, setPassOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  const initialPerms: PermissionMap = useMemo(() => {
    const p = (member.permissions ?? {}) as PermissionMap;
    return { ...p };
  }, [member.permissions]);
  const [perms, setPerms] = useState<PermissionMap>(initialPerms);
  const [dirty, setDirty] = useState(false);

  const toggle = (key: string, checked: boolean) => {
    setPerms((prev) => ({ ...prev, [key]: checked ? "write" : "none" }));
    setDirty(true);
  };
  const setAll = (checked: boolean) => {
    setPerms(
      Object.fromEntries(
        PERMISSION_MODULES.map((m) => [m.key, checked ? "write" : "none"]),
      ) as PermissionMap,
    );
    setDirty(true);
  };

  const hasLogin = !!member.user_id;
  const emailMissing = !member.email;

  const saveLogin = async () => {
    if (!password || password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== password2) {
      toast.error("As senhas não conferem");
      return;
    }
    setBusy(true);
    try {
      await saveLoginFn({ data: { id: member.id, password } });
      toast.success(hasLogin ? "Senha atualizada" : "Login criado com sucesso");
      setPassOpen(false);
      setPassword("");
      setPassword2("");
      qc.invalidateQueries({ queryKey: ["dojo", "team", "system-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar login");
    } finally {
      setBusy(false);
    }
  };

  const savePerms = async () => {
    setBusy(true);
    try {
      await savePermsFn({ data: { id: member.id, permissions: perms } });
      toast.success("Permissões atualizadas");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["dojo", "team", "system-users"] });
      qc.invalidateQueries({ queryKey: ["dojo-my-permissions"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar permissões");
    } finally {
      setBusy(false);
    }
  };

  const revokeLogin = async () => {
    if (!confirm("Revogar o acesso deste colaborador ao painel?")) return;
    setBusy(true);
    try {
      await unlinkFn({ data: { id: member.id } });
      toast.success("Acesso revogado");
      qc.invalidateQueries({ queryKey: ["dojo", "team", "system-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao revogar acesso");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{member.full_name}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {member.email || <em className="text-red-600">e-mail não cadastrado</em>}
                </span>
                {member.role && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {member.role}
                  </Badge>
                )}
                {hasLogin ? (
                  <Badge className="gap-1 bg-emerald-600 text-white">
                    <CheckCircle2 className="h-3 w-3" /> Login ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <XCircle className="h-3 w-3" /> Sem login
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={emailMissing || busy}
              onClick={() => setPassOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {hasLogin ? "Trocar senha" : "Criar login"}
            </Button>
            {hasLogin && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={revokeLogin}>
                Revogar acesso
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Módulos visíveis para {member.full_name?.split(" ")[0] ?? "o usuário"}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAll(true)}>
                Marcar todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAll(false)}>
                Desmarcar todos
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Só os módulos marcados aparecerão na barra lateral quando este colaborador
            entrar no sistema.
          </p>
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            {PERMISSION_MODULES.map((mod) => {
              const checked = (perms[mod.key] ?? "none") !== "none";
              const id = `${member.id}-${mod.key}`;
              return (
                <label
                  key={mod.key}
                  htmlFor={id}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 hover:bg-accent/40"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(v) => toggle(mod.key, v === true)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{mod.label}</div>
                    <div className="text-[11px] text-muted-foreground">{mod.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" disabled={!dirty || busy} onClick={savePerms}>
              <Save className="mr-2 h-4 w-4" /> Salvar permissões
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasLogin ? "Trocar senha do colaborador" : "Criar login de acesso"}
            </DialogTitle>
            <DialogDescription>
              O login usará o e-mail cadastrado: <b>{member.email}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nova senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8"
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Confirmar senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="pl-8"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPassOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveLogin} disabled={busy}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
