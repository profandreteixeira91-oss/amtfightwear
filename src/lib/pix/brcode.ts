// Gerador de PIX BR Code (EMV) — "Copia e Cola" compatível com apps bancários.
// Especificação: Manual BR Code do Banco Central (EMVCo QRCPS-MPM).

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sanitize(s: string, max: number, allowed: RegExp = /[^A-Za-z0-9 .,\-]/g): string {
  return stripDiacritics(s ?? "")
    .replace(allowed, "")
    .trim()
    .slice(0, max);
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — padrão do BR Code.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type PixBrCodeInput = {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount?: number | null;
  txid?: string | null;
  description?: string | null;
};

/**
 * Constrói o payload BR Code (Copia e Cola) para pagamento PIX estático.
 * Retorna a string EMV pronta para ser usada como conteúdo do QR e/ou copia-cola.
 */
export function buildPixBrCode(input: PixBrCodeInput): string {
  const key = (input.pixKey ?? "").trim();
  if (!key) throw new Error("Chave PIX vazia");

  // Merchant Account Information (26): GUI + chave + descrição opcional
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyTlv = tlv("01", key.slice(0, 77));
  const desc = input.description ? sanitize(input.description, 40) : "";
  const descTlv = desc ? tlv("02", desc) : "";
  const mai = tlv("26", `${gui}${keyTlv}${descTlv}`);

  const merchantName = sanitize(input.merchantName || "RECEBEDOR", 25) || "RECEBEDOR";
  const merchantCity = sanitize(input.merchantCity || "BRASIL", 15) || "BRASIL";

  const txidRaw = (input.txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const addData = tlv("62", tlv("05", txidRaw));

  const amount =
    input.amount != null && Number.isFinite(input.amount) && input.amount > 0
      ? Number(input.amount).toFixed(2)
      : "";

  const parts = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("01", "11"), // Point of Initiation Method: 11 = estático (reutilizável)
    mai,
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "986"), // Moeda: BRL
    amount ? tlv("54", amount) : "",
    tlv("58", "BR"), // País
    tlv("59", merchantName),
    tlv("60", merchantCity),
    addData,
  ].join("");

  const toCrc = `${parts}6304`;
  return `${toCrc}${crc16(toCrc)}`;
}
