import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Building2, Ticket, Loader2, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startCorporateConnection,
  completeCorporateConnection,
  providerLabel,
  type CorporateProvider,
} from "@/lib/dojo/corporate-benefits.functions";
import { getMyAcademyBranding } from "@/lib/dojo/academy-public.functions";

interface Props {
  open: boolean;
  provider: CorporateProvider | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

const providerIcon: Record<CorporateProvider, typeof Building2> = {
  gympass: Building2,
  totalpass: Ticket,
};

export function CorporateBenefitsWizard({ open, provider, onOpenChange, onCompleted }: Props) {
  const qc = useQueryClient();
  const brandingFn = useServerFn(getMyAcademyBranding);
  const startFn = useServerFn(startCorporateConnection);
  const completeFn = useServerFn(completeCorporateConnection);

  const brandingQ = useQuery({
    queryKey: ["academy-branding"],
    queryFn: () => brandingFn({}),
    enabled: open,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
  });
  const [gymCode, setGymCode] = useState("");
  const [authorizing, setAuthorizing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setGymCode("");
  }, [open, provider]);

  useEffect(() => {
    const b = brandingQ.data as any;
    if (!b) return;
    setForm((f) => ({
      name: f.name || b.trade_name || b.legal_name || "",
      cnpj: f.cnpj || b.cnpj || "",
      phone: f.phone || b.phone || "",
      email: f.email || b.email || "",
      address: f.address || b.address || "",
      city: f.city || b.city || "",
      state: f.state || b.state || "",
    }));
  }, [brandingQ.data]);

  const startMut = useMutation({
    mutationFn: async () => {
      if (!provider) throw new Error("Plataforma não selecionada.");
      return startFn({
        data: {
          provider,
          academySnapshot: {
            name: form.name,
            cnpj: form.cnpj || null,
            phone: form.phone || null,
            email: form.email || null,
            address: form.address || null,
            city: form.city || null,
            state: form.state || null,
          },
        },
      });
    },
    onSuccess: () => setStep(2),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao iniciar."),
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      if (!provider) throw new Error("Plataforma não selecionada.");
      setAuthorizing(true);
      // Simula o handshake OAuth: em produção, aqui abrimos a URL de autorização
      // e aguardamos o callback. V1: janela curta para transmitir "conectando".
      await new Promise((r) => setTimeout(r, 900));
      const res = await completeFn({
        data: { provider, gymCode: gymCode.trim() || null },
      });
      setAuthorizing(false);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corporate-benefits"] });
      setStep(3);
    },
    onError: (e: any) => {
      setAuthorizing(false);
      toast.error(e?.message ?? "Falha na autorização.");
    },
  });

  const Icon = provider ? providerIcon[provider] : Building2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Conectar {provider ? providerLabel[provider] : ""}</DialogTitle>
              <div className="text-xs text-muted-foreground">
                Assistente guiado · sem chaves técnicas
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
                  step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {step > n ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              </div>
              {n < 3 && (
                <div className={cn("h-0.5 flex-1", step > n ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme os dados da sua academia. Eles serão enviados à plataforma para vincular sua unidade.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FieldCol span={2} label="Nome da academia" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <FieldCol label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} />
              <FieldCol label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FieldCol span={2} label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <FieldCol span={2} label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <FieldCol label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <FieldCol label="Estado" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Autorização segura</div>
                <div className="text-muted-foreground">
                  Você será conectado à {provider ? providerLabel[provider] : ""} de forma segura pelo AMT Dojo Manager.
                  Não é preciso informar chaves de API, tokens ou webhooks — cuidamos disso automaticamente.
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Código de identificação (opcional)</Label>
              <Input
                placeholder="Código fornecido pela plataforma (se houver)"
                value={gymCode}
                onChange={(e) => setGymCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Somente informe se a plataforma pediu para você usar um identificador da academia.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 py-2 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-lg font-semibold">Conexão concluída!</div>
            <p className="text-sm text-muted-foreground">
              {provider ? providerLabel[provider] : ""} está conectada à sua academia. Você já pode sincronizar beneficiários.
            </p>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              🟢 Conectada
            </Badge>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={() => startMut.mutate()}
                disabled={!form.name || startMut.isPending}
              >
                {startMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continuar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button
                onClick={() => completeMut.mutate()}
                disabled={authorizing || completeMut.isPending}
              >
                {(authorizing || completeMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Autorizar conexão
              </Button>
            </>
          )}
          {step === 3 && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onCompleted?.();
              }}
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldCol({
  label,
  value,
  onChange,
  span = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
