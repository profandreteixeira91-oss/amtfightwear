import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Send, ExternalLink, Copy, MessageCircle, Mail, Smartphone } from "lucide-react";
import type { InvoiceRow } from "./shared";

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D+/g, "");

function invoiceUrl(id: string) {
  if (typeof window === "undefined") return `/dojo/pay/${id}`;
  return `${window.location.origin}/dojo/pay/${id}`;
}

function buildMessage(r: InvoiceRow) {
  const name = r.student?.full_name?.split(" ")[0] ?? "";
  const due = new Date(r.due_date + "T00:00:00").toLocaleDateString("pt-BR");
  const url = invoiceUrl(r.id);
  return (
    `Olá${name ? ", " + name : ""}! Segue sua cobrança de ${brl(r.amount)}` +
    ` com vencimento em ${due}.\n\nPague de forma segura:\n${url}`
  );
}

export function ShareInvoiceMenu({ invoice }: { invoice: InvoiceRow }) {
  const url = invoiceUrl(invoice.id);
  const message = buildMessage(invoice);
  const encodedMsg = encodeURIComponent(message);
  const phone = onlyDigits(invoice.student?.phone) || onlyDigits(invoice.student?.guardian_phone);
  const email = (invoice.student?.email ?? "").trim();

  const openPage = () => window.open(url, "_blank", "noopener,noreferrer");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const sendWhats = () => {
    if (!phone) {
      toast.error("Aluno sem telefone cadastrado");
      return;
    }
    // wa.me exige DDI. Assume Brasil quando começar com 0 ou tiver 10/11 dígitos.
    const withCountry = phone.length <= 11 ? `55${phone.replace(/^0+/, "")}` : phone;
    window.open(`https://wa.me/${withCountry}?text=${encodedMsg}`, "_blank", "noopener,noreferrer");
  };

  const sendEmail = () => {
    if (!email) {
      toast.error("Aluno sem e-mail cadastrado");
      return;
    }
    const subject = encodeURIComponent(`Cobrança — ${brl(invoice.amount)}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${encodedMsg}`;
  };

  const sendSms = () => {
    if (!phone) {
      toast.error("Aluno sem telefone cadastrado");
      return;
    }
    // sms: aceita separador ? em iOS/Android
    window.location.href = `sms:${phone}?body=${encodedMsg}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          title="Enviar cobrança"
          className="shrink-0 h-8 w-8"
        >
          <Send className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Página de cobrança</DropdownMenuLabel>
        <DropdownMenuItem onClick={openPage}>
          <ExternalLink className="h-4 w-4 mr-2" /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <Copy className="h-4 w-4 mr-2" /> Copiar link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Enviar para o aluno</DropdownMenuLabel>
        <DropdownMenuItem onClick={sendWhats} disabled={!phone}>
          <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" /> WhatsApp
          {!phone && <span className="ml-auto text-[10px] text-muted-foreground">sem telefone</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={sendEmail} disabled={!email}>
          <Mail className="h-4 w-4 mr-2" /> E-mail
          {!email && <span className="ml-auto text-[10px] text-muted-foreground">sem e-mail</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={sendSms} disabled={!phone}>
          <Smartphone className="h-4 w-4 mr-2" /> SMS
          {!phone && <span className="ml-auto text-[10px] text-muted-foreground">sem telefone</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
