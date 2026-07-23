import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, KeyRound, Unlink, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACCESS_LEVELS,
  PERMISSION_MODULES,
  defaultPermissionsForRole,
  type AccessLevel,
  type PermissionMap,
} from "@/lib/dojo/permissions";
import {
  updateTeamMemberPermissions,
  setTeamMemberLogin,
  unlinkTeamMemberUser,
} from "@/lib/dojo/team.functions";

export function PermissionsTab({
  memberId,
  role,
  email,
  initialPermissions,
  linkedUserId,
}: {
  memberId: string;
  role?: string | null;
  email?: string | null;
  initialPermissions?: PermissionMap | null;
  linkedUserId?: string | null;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(updateTeamMemberPermissions);
  const setLoginFn = useServerFn(setTeamMemberLogin);
  const unlinkFn = useServerFn(unlinkTeamMemberUser);

  const [perms, setPerms] = useState<PermissionMap>(() => {
    if (initialPermissions && Object.keys(initialPermissions).length > 0) return { ...initialPermissions };
    return defaultPermissionsForRole(role);
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialPermissions && Object.keys(initialPermissions).length > 0) setPerms({ ...initialPermissions });
  }, [initialPermissions]);

  const setLevel = (key: string, lvl: AccessLevel) => setPerms((p) => ({ ...p, [key]: lvl }));
  const applyPreset = () => setPerms(defaultPermissionsForRole(role));
  const setAll = (lvl: AccessLevel) =>
    setPerms(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, lvl])) as PermissionMap);

  const save = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { id: memberId, permissions: perms } });
      toast.success("Permissões salvas");
      qc.invalidateQueries({ queryKey: ["team-member", memberId] });
      qc.invalidateQueries({ queryKey: ["dojo-my-permissions"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const createOrUpdateLogin = async () => {
    if (!email) {
      toast.error("Cadastre um e-mail no perfil do colaborador antes de criar o login");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await setLoginFn({ data: { id: memberId, password } });
      toast.success(linkedUserId ? "Senha atualizada" : "Conta criada e vinculada");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["team-member", memberId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Desvincular esta conta de login? O colaborador perderá acesso ao painel.")) return;
    setBusy(true);
    try {
      await unlinkFn({ data: { id: memberId } });
      toast.success("Conta desvinculada");
      qc.invalidateQueries({ queryKey: ["team-member", memberId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Vinculo com conta de login */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4" /> Conta de login
          </div>
          <p className="text-xs text-muted-foreground">
            Vincule uma conta de usuário existente (o colaborador precisa se cadastrar primeiro em <b>/dojo/auth</b> com o e-mail informado).
          </p>
          {linkedUserId ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div>
                <div className="text-xs text-emerald-700">Conta vinculada</div>
                <div className="font-mono text-xs break-all">{linkedUserId}</div>
              </div>
              <Button variant="outline" size="sm" onClick={unlink} disabled={busy}>
                <Unlink className="mr-2 h-4 w-4" /> Desvincular
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="text-xs">E-mail da conta de login</Label>
                <Input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="colaborador@exemplo.com" />
              </div>
              <Button onClick={link} disabled={busy}>
                <Link2 className="mr-2 h-4 w-4" /> Vincular
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de permissões */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" /> Módulos e níveis de acesso
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={applyPreset}>Preset do cargo</Button>
              <Button variant="outline" size="sm" onClick={() => setAll("read")}>Tudo: leitura</Button>
              <Button variant="outline" size="sm" onClick={() => setAll("write")}>Tudo: total</Button>
              <Button variant="outline" size="sm" onClick={() => setAll("none")}>Bloquear tudo</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {PERMISSION_MODULES.map((mod) => {
              const lvl = perms[mod.key] ?? "none";
              return (
                <div key={mod.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{mod.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{mod.description}</div>
                  </div>
                  <Select value={lvl} onValueChange={(v) => setLevel(mod.key, v as AccessLevel)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={busy}>
              <Save className="mr-2 h-4 w-4" /> Salvar permissões
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
