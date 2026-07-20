import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyAsaasConfig,
  createMyAsaasSubaccount,
  refreshMyAsaasSubaccount,
  setDojoPixKey,
} from "@/lib/asaas/asaas.functions";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    APPROVED: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-500" },
    approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-500" },
    PENDING: { label: "Em análise", className: "bg-amber-500/15 text-amber-500" },
    pending: { label: "Em análise", className: "bg-amber-500/15 text-amber-500" },
    REJECTED: { label: "Recusado", className: "bg-red-500/15 text-red-500" },
    rejected: { label: "Recusado", className: "bg-red-500/15 text-red-500" },
    not_started: { label: "Não iniciado", className: "bg-slate-500/15 text-slate-500" },
  };
  const s = map[status] || { label: status, className: "bg-slate-500/15 text-slate-500" };
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function AsaasOnboardingCard() {
  const qc = useQueryClient();
  const fetchConfig = useServerFn(getMyAsaasConfig);
  const createFn = useServerFn(createMyAsaasSubaccount);
  const refreshFn = useServerFn(refreshMyAsaasSubaccount);
  const savePixFn = useServerFn(setDojoPixKey);

  const cfg = useQuery({
    queryKey: ["asaas-config"],
    queryFn: () => fetchConfig(),
  });

  const create = useMutation({
    mutationFn: (input: {
      birthDate?: string;
      companyType?: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
      incomeValue?: number;
      addressNumber: string;
      province: string;
      complement?: string;
      mobilePhone?: string;
    }) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("Subconta Asaas criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["asaas-config"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const refresh = useMutation({
    mutationFn: () => refreshFn({}),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["asaas-config"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const savePix = useMutation({
    mutationFn: (input: { pixKey: string }) => savePixFn({ data: input }),
    onSuccess: () => {
      toast.success("Chave PIX salva");
      qc.invalidateQueries({ queryKey: ["asaas-config"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    birthDate: string;
    companyType: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
    incomeValue: number;
    addressNumber: string;
    province: string;
    complement: string;
    mobilePhone: string;
  }>({
    birthDate: "",
    companyType: "MEI",
    incomeValue: 5000,
    addressNumber: "",
    province: "",
    complement: "",
    mobilePhone: "",
  });
  const [pixKey, setPixKey] = useState("");

  if (cfg.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração…
        </CardContent>
      </Card>
    );
  }

  const data = cfg.data;
  const hasSubaccount = !!data?.subaccountId;
  const isApproved =
    data?.onboardingStatus === "APPROVED" || data?.onboardingStatus === "approved";
  const profile = data?.profile;
  const missingProfile: string[] = [];
  if (profile) {
    if (!profile.legalName && !profile.tradeName) missingProfile.push("Nome");
    if (!profile.cnpj) missingProfile.push("CPF/CNPJ");
    if (!profile.email) missingProfile.push("E-mail");
    if (!profile.address) missingProfile.push("Endereço");
    if (!profile.city) missingProfile.push("Cidade");
    if (!profile.state) missingProfile.push("UF");
    if (!profile.zip) missingProfile.push("CEP");
  }

  return (
    <div className="space-y-6">
      {/* Card principal - Status */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Recebimento automático (Asaas)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ative o recebimento das mensalidades via PIX, boleto e cartão. O
                dinheiro cai direto na conta do seu dojo — a AMT recebe apenas a
                taxa de intermediação combinada.
              </p>
            </div>
            {hasSubaccount && <StatusBadge status={data.onboardingStatus} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSubaccount ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Wallet ID</div>
                  <div className="font-mono text-sm break-all">{data.walletId}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Subconta</div>
                  <div className="font-mono text-sm break-all">{data.subaccountId}</div>
                </div>
              </div>

              {!isApproved && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Subconta em análise</AlertTitle>
                  <AlertDescription>
                    O Asaas está verificando seus dados. Assim que aprovada, o split de
                    pagamento e os saques automáticos serão liberados.
                  </AlertDescription>
                </Alert>
              )}

              {isApproved && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertTitle>Tudo pronto!</AlertTitle>
                  <AlertDescription>
                    Sua subconta está aprovada. Novas cobranças serão emitidas
                    automaticamente com split ativo.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refresh.mutate()}
                  disabled={refresh.isPending}
                >
                  {refresh.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar status
                </Button>
                {data.onboardingUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.onboardingUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Completar cadastro Asaas
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : missingProfile.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Complete os dados do dojo</AlertTitle>
              <AlertDescription>
                Antes de ativar o recebimento, preencha em <b>Configurações → Dados do dojo</b>:{" "}
                {missingProfile.join(", ")}.
              </AlertDescription>
            </Alert>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.addressNumber || !form.province) {
                  toast.error("Informe o número e o bairro");
                  return;
                }
                create.mutate({
                  birthDate: form.birthDate || undefined,
                  companyType: form.companyType,
                  incomeValue: form.incomeValue,
                  addressNumber: form.addressNumber,
                  province: form.province,
                  complement: form.complement || undefined,
                  mobilePhone: form.mobilePhone || undefined,
                });
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="province">Bairro *</Label>
                  <Input
                    id="province"
                    value={form.province}
                    onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="addressNumber">Número *</Label>
                  <Input
                    id="addressNumber"
                    value={form.addressNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, addressNumber: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={form.complement}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, complement: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mobilePhone">Celular</Label>
                  <Input
                    id="mobilePhone"
                    value={form.mobilePhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mobilePhone: e.target.value }))
                    }
                    placeholder="(11) 9xxxx-xxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="companyType">Tipo de empresa</Label>
                  <Select
                    value={form.companyType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, companyType: v as typeof f.companyType }))
                    }
                  >
                    <SelectTrigger id="companyType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="LIMITED">LTDA</SelectItem>
                      <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
                      <SelectItem value="ASSOCIATION">Associação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="incomeValue">Faturamento mensal estimado (R$)</Label>
                  <Input
                    id="incomeValue"
                    type="number"
                    min={1000}
                    value={form.incomeValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, incomeValue: Number(e.target.value) }))
                    }
                  />
                </div>
                {form.companyType === "INDIVIDUAL" && (
                  <div>
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birthDate: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Ao ativar você confirma que o CNPJ/CPF, e-mail e endereço no perfil do
                dojo são reais e serão usados pelo Asaas para KYC.
              </div>

              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ativar recebimento
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Card de chave PIX para saques */}
      {hasSubaccount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chave PIX para saques</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cadastre uma chave PIX de mesma titularidade do CNPJ/CPF do dojo. Ela
              será usada para os saques automáticos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={pixKey || data?.pixKey || ""}
                onChange={(e) => setPixKey(e.target.value)}
                className="flex-1 min-w-[240px]"
              />
              <Button
                onClick={() =>
                  savePix.mutate({ pixKey: pixKey || data?.pixKey || "" })
                }
                disabled={savePix.isPending || !(pixKey || data?.pixKey)}
              >
                {savePix.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
            {data?.pixKeyType && (
              <div className="text-xs text-muted-foreground">
                Tipo detectado: <b>{data.pixKeyType.toUpperCase()}</b>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
