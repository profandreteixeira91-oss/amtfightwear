import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  FileCheck2,
  AlertCircle,
  Upload,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  listMyAsaasDocuments,
  sendMyAsaasDocuments,
  uploadAsaasDocumentForPending,
} from "@/lib/asaas/asaas.functions";

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

const ACCEPT = "application/pdf,image/png,image/jpeg";
const MAX_SIZE = 10 * 1024 * 1024;

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, { label: string; className: string }> = {
    APPROVED: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-500" },
    PENDING: { label: "Pendente de envio", className: "bg-amber-500/15 text-amber-500" },
    NOT_SENT: { label: "Não enviado", className: "bg-amber-500/15 text-amber-500" },
    AWAITING_APPROVAL: { label: "Em análise", className: "bg-sky-500/15 text-sky-500" },
    REJECTED: { label: "Rejeitado — reenvie", className: "bg-red-500/15 text-red-500" },
  };
  const m = map[s] || { label: status, className: "bg-slate-500/15 text-slate-500" };
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function AsaasDocumentsCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAsaasDocuments);
  const sendFn = useServerFn(sendMyAsaasDocuments);
  const uploadFn = useServerFn(uploadAsaasDocumentForPending);

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

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  async function uploadForPending(
    pendingId: string,
    asaasType: string,
    file: File,
  ) {
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo maior que 10 MB.");
      return;
    }
    setUploadingId(pendingId);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sessão expirada.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${uid}/asaas-kyc/${pendingId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dojo-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await uploadFn({
        data: {
          pendingId,
          asaasType,
          filePath: path,
          mimeType: file.type || null,
        },
      });
      toast.success("Documento enviado ao Asaas — aguardando análise.");
      qc.invalidateQueries({ queryKey: ["asaas-documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingId(null);
    }
  }

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
  if (!data?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Documentos da subconta Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subconta ainda não ativada</AlertTitle>
            <AlertDescription>
              Ative sua subconta em <b>AMT Pay → Recebimento</b> para começar o
              envio de documentos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

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
              conseguimos enviar os documentos por aqui. Redefina o AMT Pay em{" "}
              <b>Recebimento</b> e refaça a ativação.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const pending = data.pending ?? [];
  const nothingPending = pending.length === 0;
  const allApproved =
    !nothingPending && pending.every((p) => p.status.toUpperCase() === "APPROVED");
  const hasBulkSendable = pending.some(
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
              Atualizar status
            </Button>
            {hasBulkSendable && (
              <Button size="sm" onClick={() => send.mutate()} disabled={send.isPending}>
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar arquivos do onboarding
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Fluxo homologado pelo Asaas: (1) listamos os documentos exigidos, (2)
          você envia cada arquivo, (3) o Asaas analisa e o status muda para{" "}
          <b>APROVADO</b> ou <b>REJEITADO</b>. Documentos rejeitados podem ser
          reenviados aqui mesmo.
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

        {allApproved && (
          <Alert>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
            <AlertTitle>Todos os documentos aprovados</AlertTitle>
            <AlertDescription>
              A subconta possui documentos aprovados. Nenhuma ação necessária.
            </AlertDescription>
          </Alert>
        )}

        {pending.map((item) => (
          <PendingItem
            key={item.id}
            item={item}
            uploading={uploadingId === item.id}
            onUpload={(file) => uploadForPending(item.id, item.type, file)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PendingItem({
  item,
  uploading,
  onUpload,
}: {
  item: {
    id: string;
    status: string;
    type: string;
    title?: string | null;
    description?: string | null;
    expectedLocalTypes: string[];
    availableLocalTypes: string[];
  };
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = ASAAS_TYPE_LABELS[item.type.toUpperCase()] || item.title || item.type;
  const status = item.status.toUpperCase();
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";
  const canUpload = !isApproved;
  const missing = item.expectedLocalTypes.filter(
    (t) => !item.availableLocalTypes.includes(t),
  );

  return (
    <div
      className={`rounded-md border p-3 space-y-2 ${
        isRejected ? "border-red-500/40 bg-red-500/5" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-medium text-sm">{label}</div>
          {item.description && (
            <div className="text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {isRejected && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            O Asaas rejeitou o arquivo anterior. Envie um novo — a análise
            recomeça automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {item.expectedLocalTypes.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Recomendado:{" "}
          <b>
            {item.expectedLocalTypes.map((t) => LOCAL_LABELS[t] || t).join(" + ")}
          </b>
          {missing.length > 0 && !isApproved && (
            <span className="text-amber-500">
              {" "}
              — pendente no onboarding: {missing.map((t) => LOCAL_LABELS[t] || t).join(", ")}
            </span>
          )}
        </div>
      )}

      {canUpload && (
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <Button
            size="sm"
            variant={isRejected ? "default" : "outline"}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            {isRejected ? "Reenviar documento" : "Enviar arquivo"}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            PDF, JPG ou PNG (máx. 10 MB)
          </span>
        </div>
      )}
    </div>
  );
}
