import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPrimaryBankAccount, saveBankAccount } from "@/lib/dojo/amtpay.functions";

const BANKS: { code: string; name: string }[] = [
  { code: "001", name: "Banco do Brasil" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú" },
  { code: "033", name: "Santander" },
  { code: "260", name: "Nubank" },
  { code: "077", name: "Inter" },
  { code: "336", name: "C6 Bank" },
  { code: "212", name: "Banco Original" },
  { code: "290", name: "PagBank" },
  { code: "323", name: "Mercado Pago" },
  { code: "380", name: "PicPay" },
  { code: "637", name: "Sofisa" },
  { code: "756", name: "Sicoob" },
  { code: "748", name: "Sicredi" },
];

export function BankAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const getPrimary = useServerFn(getPrimaryBankAccount);
  const save = useServerFn(saveBankAccount);
  const bankQ = useQuery({ queryKey: ["amtpay-bank"], queryFn: () => getPrimary(), enabled: open });

  const account = bankQ.data;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bank_code: "",
    bank_name: "",
    account_type: "checking" as "checking" | "savings" | "payment",
    branch: "",
    branch_digit: "",
    account_number: "",
    account_digit: "",
    holder_name: "",
    holder_document: "",
    pix_key: "",
    pix_key_type: "cpf" as "cpf" | "cnpj" | "email" | "phone" | "random",
  });

  // Carrega valores existentes ao abrir.
  useEffect(() => {
    if (account) {
      setForm({
        bank_code: account.bank_code ?? "",
        bank_name: account.bank_name ?? "",
        account_type: account.account_type ?? "checking",
        branch: account.branch ?? "",
        branch_digit: account.branch_digit ?? "",
        account_number: account.account_number ?? "",
        account_digit: account.account_digit ?? "",
        holder_name: account.holder_name ?? "",
        holder_document: account.holder_document ?? "",
        pix_key: account.pix_key ?? "",
        pix_key_type: account.pix_key_type ?? "cpf",
      });
    }
  }, [account]);

  async function submit() {
    if (!form.holder_name || !form.holder_document) {
      toast.error("Informe o titular e o CPF/CNPJ.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { id: account?.id, account: form } });
      toast.success("Conta bancária salva.");
      qc.invalidateQueries({ queryKey: ["amtpay-bank"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function onBankChange(code: string) {
    const b = BANKS.find((x) => x.code === code);
    setForm((f) => ({ ...f, bank_code: code, bank_name: b?.name ?? f.bank_name }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta bancária" : "Cadastrar conta bancária"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Banco</Label>
            <Select value={form.bank_code} onValueChange={onBankChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de conta</Label>
            <Select value={form.account_type} onValueChange={(v: any) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
                <SelectItem value="payment">Conta pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Agência</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
            </div>
            <div>
              <Label>Dígito</Label>
              <Input value={form.branch_digit} onChange={(e) => setForm({ ...form, branch_digit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <div className="col-span-2">
              <Label>Conta</Label>
              <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
            </div>
            <div>
              <Label>Dígito</Label>
              <Input value={form.account_digit} onChange={(e) => setForm({ ...form, account_digit: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Nome do titular</Label>
            <Input value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>CPF ou CNPJ do titular</Label>
            <Input value={form.holder_document} onChange={(e) => setForm({ ...form, holder_document: e.target.value })} />
          </div>
          <div>
            <Label>Tipo da chave PIX</Label>
            <Select value={form.pix_key_type} onValueChange={(v: any) => setForm({ ...form, pix_key_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Celular</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chave PIX</Label>
            <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar conta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
