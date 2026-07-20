import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Ticket, RefreshCw, Save } from "lucide-react";
import {
  getStudentCorporateBenefits,
  upsertStudentCorporateBenefit,
  syncCorporateBeneficiary,
  providerLabel,
  type CorporateProvider,
} from "@/lib/dojo/corporate-benefits.functions";

const PROVIDERS: { id: CorporateProvider; icon: typeof Building2 }[] = [
  { id: "gympass", icon: Building2 },
  { id: "totalpass", icon: Ticket },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
  blocked: "Bloqueado",
  expired: "Expirado",
};

export function StudentCorporateBenefitsSection({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(getStudentCorporateBenefits);
  const saveFn = useServerFn(upsertStudentCorporateBenefit);
  const syncFn = useServerFn(syncCorporateBeneficiary);

  const q = useQuery({
    queryKey: ["student-corp", studentId],
    queryFn: () => listFn({ data: { studentId } }),
  });

  const byProvider = useMemo(() => {
    const map: Record<string, any> = {};
    for (const b of (q.data ?? []) as any[]) map[b.provider] = b;
    return map;
  }, [q.data]);

  return (
    <div className="space-y-3">
      {PROVIDERS.map(({ id, icon: Icon }) => (
        <ProviderCard
          key={id}
          provider={id}
          icon={Icon}
          record={byProvider[id]}
          onSave={async (payload) => {
            await saveFn({ data: { studentId, provider: id, ...payload } });
            await qc.invalidateQueries({ queryKey: ["student-corp", studentId] });
            toast.success("Benefício atualizado.");
          }}
          onSync={async () => {
            await syncFn({ data: { studentId, provider: id } });
            await qc.invalidateQueries({ queryKey: ["student-corp", studentId] });
            toast.success("Beneficiário sincronizado.");
          }}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  icon: Icon,
  record,
  onSave,
  onSync,
}: {
  provider: CorporateProvider;
  icon: typeof Building2;
  record?: any;
  onSave: (p: {
    enabled: boolean;
    beneficiaryCode?: string | null;
    status?: "active" | "inactive" | "pending" | "blocked" | "expired";
    planName?: string | null;
  }) => Promise<void>;
  onSync: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<boolean>(!!record);
  const [code, setCode] = useState<string>(record?.beneficiary_code ?? "");
  const [status, setStatus] = useState<string>(record?.status ?? "pending");
  const [planName, setPlanName] = useState<string>(record?.plan_name ?? "");

  const saveMut = useMutation({
    mutationFn: () =>
      onSave({
        enabled,
        beneficiaryCode: code || null,
        status: status as any,
        planName: planName || null,
      }),
  });
  const syncMut = useMutation({ mutationFn: onSync });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {providerLabel[provider]}
          </CardTitle>
          <div className="flex items-center gap-2">
            {record?.last_sync_at && (
              <span className="text-[11px] text-muted-foreground">
                Sync {new Date(record.last_sync_at).toLocaleString("pt-BR")}
              </span>
            )}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-xs">{enabled ? "Sim" : "Não"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {enabled ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código do beneficiário</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ID interno da plataforma" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plano</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Plano contratado" />
              </div>
            </div>
            {record && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{STATUS_LABEL[record.status] ?? record.status}</Badge>
                {record.last_check_at && (
                  <span>Última validação: {new Date(record.last_check_at).toLocaleString("pt-BR")} · {record.last_check_result === "authorized" ? "autorizado" : "negado"}</span>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              {record && (
                <Button size="sm" variant="outline" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMut.isPending ? "animate-spin" : ""}`} /> Sincronizar
                </Button>
              )}
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground py-1">
            Aluno não é beneficiário desta plataforma.
            {record && (
              <Button variant="link" className="ml-2 h-auto p-0 text-xs" onClick={() => saveMut.mutate()}>
                Remover vínculo
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
