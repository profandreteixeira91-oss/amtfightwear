import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  UploadCloud,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyOnboardingState,
  recordOnboardingDocument,
  removeOnboardingDocument,
  DOC_TYPES,
  type DocType,
} from "@/lib/dojo/onboarding.functions";
import { AsaasDocumentsCard } from "@/components/dojo/amtpay/AsaasDocumentsCard";
import { BankAccountDialog } from "@/components/dojo/amtpay/BankAccountDialog";
import { getPrimaryBankAccount } from "@/lib/dojo/amtpay.functions";

const DOC_LABELS: Record<DocType, string> = {
  identity_front: "RG/CNH (frente)",
  identity_back: "RG/CNH (verso)",
  cnpj_card: "Cartão CNPJ",
  address_proof: "Comprovante de endereço",
  social_contract: "Contrato social",
};

const ACCEPT = "application/pdf,image/png,image/jpeg";
const MAX_SIZE = 10 * 1024 * 1024;

export function DocumentsTab() {
  const qc = useQueryClient();
  const getState = useServerFn(getMyOnboardingState);
  const recordDoc = useServerFn(recordOnboardingDocument);
  const removeDoc = useServerFn(removeOnboardingDocument);
  const getBank = useServerFn(getPrimaryBankAccount);

  const [uid, setUid] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<DocType | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUid(data.user?.id ?? null);
    })();
  }, []);

  const state = useQuery({
    queryKey: ["account-docs-state"],
    queryFn: () => getState(),
  });

  const bank = useQuery({
    queryKey: ["amtpay-bank"],
    queryFn: () => getBank(),
  });

  const profile = state.data?.profile as Record<string, unknown> | null | undefined;
  const cnpj = String(profile?.cnpj ?? "").replace(/\D/g, "");
  const isCnpj = cnpj.length === 14;
  const requiredDocs: DocType[] = isCnpj
    ? ["identity_front", "identity_back", "cnpj_card"]
    : ["identity_front", "identity_back"];
  const optionalDocs: DocType[] = DOC_TYPES.filter((d) => !requiredDocs.includes(d));

  const docMap: Record<string, { file_path: string; mime_type: string | null }> = {};
  for (const d of state.data?.documents ?? []) {
    docMap[d.doc_type] = { file_path: d.file_path, mime_type: d.mime_type };
  }

  async function handleUpload(docType: DocType, file: File) {
    if (!uid) return;
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo maior que 10 MB.");
      return;
    }
    setUploadingType(docType);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${uid}/${docType}.${ext}`;
      const previous = docMap[docType]?.file_path;
      if (previous && previous !== path) {
        await supabase.storage.from("dojo-documents").remove([previous]);
      }
      const { error } = await supabase.storage
        .from("dojo-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await recordDoc({
        data: {
          docType,
          filePath: path,
          mimeType: file.type || null,
          sizeBytes: file.size,
        },
      });
      toast.success(`${DOC_LABELS[docType]} atualizado.`);
      qc.invalidateQueries({ queryKey: ["account-docs-state"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingType(null);
    }
  }

  async function handleRemove(docType: DocType) {
    try {
      await removeDoc({ data: { docType } });
      toast.success("Documento removido.");
      qc.invalidateQueries({ queryKey: ["account-docs-state"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const bankMissing = !bank.data;

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Homologação da subconta Asaas</AlertTitle>
        <AlertDescription className="text-sm">
          Para liberar a operação do AMT Pay, o Asaas exige três blocos
          obrigatórios: <b>documentos pessoais / da empresa</b>,{" "}
          <b>documento(s) exigido(s) pela análise da subconta</b> (CNPJ costuma
          pedir mais itens) e <b>dados bancários do titular</b>. Todos os
          arquivos ficam guardados em bucket privado, criptografados em trânsito
          (TLS) e enviados via API oficial de KYC do Asaas.
        </AlertDescription>
      </Alert>

      {/* --- Bloco 1: Documentos locais (também usados no onboarding) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Meus documentos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envie, substitua ou remova os arquivos. Os arquivos daqui são
            reutilizados na análise da subconta Asaas — se algum for rejeitado,
            basta substituir por uma nova versão.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <DocList
                title="Obrigatórios"
                types={requiredDocs}
                docMap={docMap}
                uploadingType={uploadingType}
                onUpload={handleUpload}
                onRemove={handleRemove}
                required
              />
              {optionalDocs.length > 0 && (
                <DocList
                  title="Complementares"
                  types={optionalDocs}
                  docMap={docMap}
                  uploadingType={uploadingType}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* KYC Asaas descontinuado: AMT Pay opera em conta central única, sem subcontas. */}

      {/* --- Bloco 3: Dados bancários (obrigatórios para ativação) --- */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-5 w-5 text-primary" />
                Dados bancários do titular
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Conta usada para saques do AMT Pay. Precisa estar no mesmo
                CPF/CNPJ do responsável pelo dojo — o Asaas bloqueia
                transferências para contas de terceiros.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {bank.isLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Carregando
                </Badge>
              ) : bankMissing ? (
                <Badge className="bg-amber-500/15 text-amber-500">
                  <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Cadastrado
                </Badge>
              )}
              <Button
                variant={bankMissing ? "default" : "outline"}
                size="sm"
                onClick={() => setBankOpen(true)}
              >
                {bankMissing ? "Cadastrar conta" : "Editar conta"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!bank.isLoading && bank.data && (
          <CardContent className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Banco: </span>
              <b>
                {bank.data.bank_code} — {bank.data.bank_name}
              </b>
            </div>
            <div>
              <span className="text-muted-foreground">Agência / Conta: </span>
              <b>
                {bank.data.branch}
                {bank.data.branch_digit ? `-${bank.data.branch_digit}` : ""} /{" "}
                {bank.data.account_number}
                {bank.data.account_digit ? `-${bank.data.account_digit}` : ""}
              </b>
            </div>
            <div>
              <span className="text-muted-foreground">Titular: </span>
              <b>{bank.data.holder_name}</b>{" "}
              <span className="text-muted-foreground">
                ({bank.data.holder_document})
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
        <p>
          <b className="text-foreground">Segurança:</b> os arquivos são
          armazenados em bucket privado com acesso restrito ao seu usuário e
          transmitidos ao Asaas por HTTPS/TLS 1.2+. Nada é publicado nem
          compartilhado com outros dojos. Você pode substituir ou remover
          qualquer documento a qualquer momento.
        </p>
      </div>

      <BankAccountDialog open={bankOpen} onOpenChange={setBankOpen} />
    </div>
  );
}

function DocList({
  title,
  types,
  docMap,
  uploadingType,
  onUpload,
  onRemove,
  required,
}: {
  title: string;
  types: DocType[];
  docMap: Record<string, { file_path: string; mime_type: string | null }>;
  uploadingType: DocType | null;
  onUpload: (t: DocType, f: File) => void;
  onRemove: (t: DocType) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="grid gap-2">
        {types.map((t) => (
          <DocRow
            key={t}
            docType={t}
            file={docMap[t]}
            uploading={uploadingType === t}
            onUpload={(f) => onUpload(t, f)}
            onRemove={() => onRemove(t)}
            required={required}
          />
        ))}
      </div>
    </div>
  );
}

function DocRow({
  docType,
  file,
  uploading,
  onUpload,
  onRemove,
  required,
}: {
  docType: DocType;
  file?: { file_path: string; mime_type: string | null };
  uploading: boolean;
  onUpload: (f: File) => void;
  onRemove: () => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const has = !!file;
  const fileName = file?.file_path.split("/").pop();
  return (
    <div className="rounded-md border p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{DOC_LABELS[docType]}</span>
          {required && !has && (
            <Badge className="bg-amber-500/15 text-amber-500 text-[10px]">
              Obrigatório
            </Badge>
          )}
          {has && (
            <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px]">
              Enviado
            </Badge>
          )}
        </div>
        {has && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {fileName}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
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
          variant={has ? "outline" : "default"}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4 mr-1" />
          )}
          {has ? "Substituir" : "Enviar"}
        </Button>
        {has && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
