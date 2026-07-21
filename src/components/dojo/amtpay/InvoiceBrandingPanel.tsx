import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Save, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  getInvoiceBranding,
  updateInvoiceBranding,
} from "@/lib/dojo/invoice-branding.functions";

type Form = {
  invoice_business_name: string;
  invoice_document: string;
  invoice_logo_url: string;
  invoice_phone: string;
  invoice_email: string;
  invoice_address: string;
  invoice_footer_note: string;
};

const EMPTY: Form = {
  invoice_business_name: "",
  invoice_document: "",
  invoice_logo_url: "",
  invoice_phone: "",
  invoice_email: "",
  invoice_address: "",
  invoice_footer_note: "",
};

export function InvoiceBrandingPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getInvoiceBranding);
  const saveFn = useServerFn(updateInvoiceBranding);

  const { data, isLoading } = useQuery({
    queryKey: ["amtpay", "invoice-branding"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<Form>(EMPTY);
  useEffect(() => {
    if (data?.settings) {
      setForm({
        invoice_business_name: data.settings.invoice_business_name ?? "",
        invoice_document: data.settings.invoice_document ?? "",
        invoice_logo_url: data.settings.invoice_logo_url ?? "",
        invoice_phone: data.settings.invoice_phone ?? "",
        invoice_email: data.settings.invoice_email ?? "",
        invoice_address: data.settings.invoice_address ?? "",
        invoice_footer_note: data.settings.invoice_footer_note ?? "",
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (payload: Form) => saveFn({ data: payload as any }),
    onSuccess: () => {
      toast.success("Identidade da cobrança atualizada.");
      qc.invalidateQueries({ queryKey: ["amtpay", "invoice-branding"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const set = (k: keyof Form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const d = data?.defaults;

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const displayName = form.invoice_business_name || d?.name || "Sua academia";
  const displayLogo = form.invoice_logo_url || d?.logo_url || "";

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Todas as cobranças geradas no sistema — planos recorrentes, mensalidades e
          faturas avulsas — são emitidas em nome do seu dojo. Preencha os dados abaixo
          para que o aluno veja o <b>seu nome, logotipo e contato</b> no link de
          pagamento, no e-mail de lembrete e no recibo. Campos em branco usam o que
          está cadastrado em <b>Configurações → Dados do dojo</b>.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identidade da cobrança</CardTitle>
            <CardDescription>
              Aparece na descrição da cobrança, no e-mail e no recibo entregue ao aluno.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nome exibido na cobrança"
              hint={d?.name ? `Padrão: ${d.name}` : undefined}
              value={form.invoice_business_name}
              onChange={(v) => set("invoice_business_name", v)}
              placeholder="Ex.: Dojo Sensei Teixeira"
            />
            <Field
              label="Documento (CPF/CNPJ)"
              hint={d?.document ? `Padrão: ${d.document}` : undefined}
              value={form.invoice_document}
              onChange={(v) => set("invoice_document", v)}
              placeholder="00.000.000/0000-00"
            />
            <Field
              label="Telefone / WhatsApp"
              hint={d?.phone ? `Padrão: ${d.phone}` : undefined}
              value={form.invoice_phone}
              onChange={(v) => set("invoice_phone", v)}
              placeholder="(11) 90000-0000"
            />
            <Field
              label="E-mail de contato"
              hint={d?.email ? `Padrão: ${d.email}` : undefined}
              value={form.invoice_email}
              onChange={(v) => set("invoice_email", v)}
              placeholder="contato@seudojo.com.br"
            />
            <div className="md:col-span-2">
              <Field
                label="Endereço"
                hint={d?.address ? `Padrão: ${d.address}` : undefined}
                value={form.invoice_address}
                onChange={(v) => set("invoice_address", v)}
                placeholder="Rua, número, bairro, cidade/UF"
              />
            </div>
            <div className="md:col-span-2">
              <Field
                label="URL do logotipo"
                hint={d?.logo_url ? "Padrão: logo do perfil da academia" : "Cole o link público da imagem (PNG/JPG)."}
                value={form.invoice_logo_url}
                onChange={(v) => set("invoice_logo_url", v)}
                placeholder="https://…"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Mensagem no rodapé (opcional)</Label>
              <Textarea
                value={form.invoice_footer_note}
                onChange={(e) => set("invoice_footer_note", e.target.value)}
                placeholder="Ex.: Obrigado por treinar conosco! Dúvidas? Fale com a recepção."
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>
                <Save className="h-4 w-4 mr-2" /> Salvar identidade
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prévia</CardTitle>
            <CardDescription>Como o aluno vê no link e no e-mail.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {displayLogo ? (
                  <img
                    src={displayLogo}
                    alt="Logo"
                    className="h-12 w-12 rounded-md object-contain bg-background border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md border bg-background flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{displayName}</div>
                  {(form.invoice_document || d?.document) && (
                    <div className="text-xs text-muted-foreground">
                      {form.invoice_document || d?.document}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm">Mensalidade — Aluno Exemplo</div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {(form.invoice_phone || d?.phone) && <div>{form.invoice_phone || d?.phone}</div>}
                {(form.invoice_email || d?.email) && <div>{form.invoice_email || d?.email}</div>}
                {(form.invoice_address || d?.address) && (
                  <div>{form.invoice_address || d?.address}</div>
                )}
              </div>
              {form.invoice_footer_note && (
                <div className="text-xs italic text-muted-foreground border-t pt-2">
                  {form.invoice_footer_note}
                </div>
              )}
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground border-t pt-2">
                Cobrança emitida por {displayName}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
