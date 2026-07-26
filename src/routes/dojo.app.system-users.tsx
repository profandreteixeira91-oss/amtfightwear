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

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gestor",
  teacher: "Professor",
  instructor: "Instrutor",
  assistant: "Assistente",
  receptionist: "Recepcionista",
  reception: "Recepção",
  staff: "Colaborador",
  student: "Aluno",
  financial: "Financeiro",
  coach: "Treinador",
};

function translateRole(role: string): string {
  const key = role.trim().toLowerCase();
  return ROLE_LABELS[key] ?? role;
}

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 min-w-0 overflow-x-hidden p-4 sm:p-6 md:gap-7">
      {/* ============ HERO — RUBY NOIR ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-red-300/80">
              <UserCircle className="h-3.5 w-3.5" />
              Estrutura · Usuários do Sistema
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">Logins e permissões da equipe</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Crie logins de acesso ao painel para cada colaborador e escolha quais módulos ficarão visíveis para ele.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-red-500/10 bg-neutral-950/60 p-6 text-sm text-neutral-400">Carregando colaboradores…</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-red-500/10 bg-neutral-950/60 p-6 text-sm text-neutral-400">
          Nenhum colaborador cadastrado ainda. Cadastre em <b className="text-neutral-200">Pessoas › Equipe</b>.
        </div>
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
  const [expanded, setExpanded] = useState(false);


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
    <Card className="overflow-hidden border-red-500/15 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white shadow-[0_16px_40px_-30px_rgba(220,38,38,0.6)]">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/5"
          aria-expanded={expanded}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)]">
            <UserCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{member.full_name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {member.email || <em className="text-red-400">e-mail não cadastrado</em>}
              </span>
              {member.role && (
                <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-[10px] uppercase text-red-200">
                  {translateRole(member.role)}
                </Badge>
              )}
              {hasLogin ? (
                <Badge className="gap-1 border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                  <CheckCircle2 className="h-3 w-3" /> Login ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-neutral-700 bg-neutral-900 text-neutral-400">
                  <XCircle className="h-3 w-3" /> Sem login
                </Badge>
              )}
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>


        {expanded && (
          <div className="space-y-4 border-t p-4">
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
          </div>
        )}
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
