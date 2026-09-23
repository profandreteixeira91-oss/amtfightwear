// Validação + prévia do QR PIX na configuração do dono do dojo.
// Garante que a chave cadastrada gera um BR Code válido para qualquer conta.
import { useEffect, useState } from "react";
import { qrToDataURL } from "@/lib/qrcode-lazy";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { buildPixBrCode, normalizePixKey, validatePixKey, type PixKeyType } from "@/lib/pix/brcode";

export function PixKeyCheck({
  pixKey,
  keyType,
  holder,
}: {
  pixKey: string;
  keyType: PixKeyType;
  holder?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = (pixKey ?? "").trim();
    if (!raw) {
      setQr(null);
      setError(null);
      return;
    }
    const problem = validatePixKey(raw, keyType);
    if (problem) {
      setError(problem);
      setQr(null);
      return;
    }
    setError(null);
    try {
      const payload = buildPixBrCode({
        pixKey: raw,
        pixKeyType: keyType,
        merchantName: holder || "RECEBEDOR",
        merchantCity: "BRASIL",
        amount: 100,
        txid: "TESTE",
      });
      qrToDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: "M" })
        .then(setQr)
        .catch(() => setQr(null));
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível gerar o QR");
      setQr(null);
    }
  }, [pixKey, keyType, holder]);

  if (!pixKey?.trim()) return null;

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error} — o QR Code não será exibido ao aluno até a correção.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-background/60 p-3 sm:flex-row sm:items-center">
      {qr && <img src={qr} alt="Prévia do QR Code PIX" className="h-24 w-24 rounded ring-1 ring-border" />}
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Chave válida — QR funcionando
        </div>
        <p className="text-muted-foreground">
          Chave usada no QR: <b className="text-foreground">{normalizePixKey(pixKey, keyType)}</b>
        </p>
        <p className="text-muted-foreground">Prévia gerada com valor fictício de R$ 100,00.</p>
      </div>
    </div>
  );
}
