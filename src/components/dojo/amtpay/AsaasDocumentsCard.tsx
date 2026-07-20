import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileCheck2, AlertCircle, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { listMyAsaasDocuments, sendMyAsaasDocuments } from "@/lib/asaas/asaas.functions";

const LOCAL_LABELS: Record<string, string> = {
  identity_front: "RG/CNH (frente)",
  identity_back: "RG/CNH (verso)",
  address_proof: "Comprovante de endereço",
  cnpj_card: "Cartão CNPJ",
  social_contract: "Contrato social",
};

const ASAAS_TYPE_LABELS: Record<string, string> = {
  IDENTIFICATION: "Documento de identidade do responsável",
  RESIDENCE_PROOF: "Comprovante de residência",
  RESIDENCIAL_PROOF: "Comprovante de residência",
  ADDRESS_PROOF: "Comprovante de endereço",
  SOCIAL_CONTRACT: "Contrato social",
  ENTREPRENEUR_REQUIREMENT: "Certificado MEI",
  MINUTES_OF_ELECTION: "Ata de eleição",
  CNPJ: "Cartão CNPJ",
  CUSTOM: "Documento complementar",
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, { label: string; className: string }> = {
    APPROVED: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-500" },
    PENDING: { label: "Pendente de envio", className: "bg-amber-500/15 text-amber-500" },
    NOT_SENT: { label: "Não enviado", className: "bg-amber-500/15 text-amber-500" },
    AWAITING_APPROVAL: { label: "Em análise", className: "bg-sky-500/15 text-sky-500" },
    REJECTED: { label: "Rejeitado", className: "bg-red-500/15 text-red-500" },
  };
  const m = map[s] || { label: status, className: "bg-slate-500/15 text-slate-500" };
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function AsaasDocumentsCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAsaasDocuments);
  const sendFn = useServerFn(sendMyAsaasDocuments);

  const q = useQuery({
    queryKey: ["asaas-documents"],
    queryFn: () => listFn(),
    retry: false,
  });

  const send = useMutation({
    mutationFn: () => sendFn({}),
    onSuccess: (res) => {
      const sent = res.results.filter((r) => r.sent).length;
      const failed = res.results.length - sent;
      if (sent > 0) toast.success(`${sent} documento(s) enviado(s) ao Asaas.`);
      if (failed > 0) {
        const first = res.results.find((r) => !r.sent);
        toast.error(`${failed} não enviado(s). ${first?.reason ?? ""}`);
      }
      qc.invalidateQueries({ queryKey: ["asaas-documents"] });
      qc.invalidateQueries({ queryKey: ["asaas-config"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (q.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando documentos no Asaas…
        </CardContent>
      </Card>
    );
  }

  if (q.isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível consultar</AlertTitle>
            <AlertDescription>{(q.error as Error).message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const data = q.data;
  if (!data?.configured) return null;

  if (data.apiKeyMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Documentos da subconta Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chave da subconta indisponível</AlertTitle>
            <AlertDescription>
              A chave privada da sua subconta não está salva localmente, então não
              conseguimos enviar os documentos por aqui. Redefina o AMT Pay e refaça
              a ativação, ou envie os documentos direto pelo painel do Asaas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const pending = data.pending ?? [];
  const nothingPending = pending.length === 0;
  const allApproved = pending.every((p) => p.status.toUpperCase() === "APPROVED");
  const hasSendable = pending.some(
    (p) => p.status.toUpperCase() !== "APPROVED" && p.availableLocalTypes.length > 0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Documentos da subconta Asaas
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => q.refetch()}
              disabled={q.isFetching}
            >
              {q.isFetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
            {hasSendable && (
              <Button size="sm" onClick={() => send.mutate()} disabled={send.isPending}>
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar ao Asaas
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastros PJ (CNPJ) exigem documentos oficiais para o Asaas aprovar a
          subconta. Aqui você envia os arquivos que já carregou no onboarding
          direto para a API de KYC do Asaas.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {nothingPending && (
          <Alert>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
            <AlertTitle>Nenhum documento pendente</AlertTitle>
            <AlertDescription>
              O Asaas não solicitou documentos adicionais no momento.
            </AlertDescription>
          </Alert>
        )}

        {!nothingPending && allApproved && (
          <Alert>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
            <AlertTitle>Todos os documentos aprovados</AlertTitle>
            <AlertDescription>
              A subconta possui documentos aprovados. Nenhuma ação necessária.
            </AlertDescription>
          </Alert>
        )}

        {pending.map((item) => {
          const label = ASAAS_TYPE_LABELS[item.type.toUpperCase()] || item.title || item.type;
          const missing = item.expectedLocalTypes.filter(
            (t) => !item.availableLocalTypes.includes(t),
          );
          return (
            <div key={item.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.expectedLocalTypes.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Arquivos locais usados:{" "}
                  <b>
                    {item.expectedLocalTypes
                      .map((t) => LOCAL_LABELS[t] || t)
                      .join(" + ")}
                  </b>
                  {missing.length > 0 && (
                    <span className="text-amber-500">
                      {" "}
                      — falta enviar no onboarding:{" "}
                      {missing.map((t) => LOCAL_LABELS[t] || t).join(", ")}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-amber-500">
                  Tipo sem correspondência local — envie manualmente pelo painel Asaas.
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
