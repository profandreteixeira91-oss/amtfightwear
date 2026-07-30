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

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Detecta o tipo da chave a partir do próprio valor (mais confiável que o
 * seletor preenchido pelo dono do dojo, que costuma divergir).
 */
export function detectPixKeyType(raw: string): PixKeyType | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (EMAIL_RE.test(v)) return "email";
  if (UUID_RE.test(v.replace(/^urn:uuid:/i, ""))) return "random";
  const digits = v.replace(/\D/g, "");
  if (v.startsWith("+") || digits.length === 11 || digits.length === 10) {
    // 11 dígitos é ambíguo (CPF x celular): "+" ou DDI 55 indica telefone.
    if (v.startsWith("+") || digits.startsWith("55") === false ? v.startsWith("+") : true) {
      // resolvido abaixo por heurística explícita
    }
  }
  if (digits.length === 14) return "cnpj";
  if (digits.length === 11 && !v.startsWith("+")) return "cpf";
  if (v.startsWith("+") && digits.length >= 12) return "phone";
  if (digits.length === 13 && digits.startsWith("55")) return "phone";
  if (digits.length === 10) return "phone";
  return null;
}

/**
 * Normaliza a chave PIX para o formato EXIGIDO pelo BR Code. É aqui que a
 * maioria dos QRs "inválidos" nasce: chaves salvas com máscara
 * (000.000.000-00, (73) 99999-9999) não são aceitas pelos bancos.
 */
export function normalizePixKey(raw: string, type?: PixKeyType | null): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const kind = (type && type !== "random" ? type : null) ?? detectPixKeyType(v) ?? type ?? null;
  const digits = v.replace(/\D/g, "");

  switch (kind) {
    case "email":
      return v.toLowerCase();
    case "cpf":
      return digits.slice(-11);
    case "cnpj":
      return digits.slice(-14);
    case "phone": {
      let d = digits;
      if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
      d = d.slice(-11);
      return `+55${d}`;
    }
    case "random":
      return v.replace(/^urn:uuid:/i, "").toLowerCase();
    default:
      // Sem tipo identificável: se for só dígitos, remove máscara.
      return /^[\d.\-/()\s+]+$/.test(v) ? digits : v;
  }
}

/** Valida a chave já normalizada. Retorna null quando válida. */
export function validatePixKey(raw: string, type?: PixKeyType | null): string | null {
  const key = normalizePixKey(raw, type);
  if (!key) return "Informe a chave PIX";
  if (key.length > 77) return "Chave PIX muito longa";
  const kind = (type && type !== "random" ? type : null) ?? detectPixKeyType(key) ?? type ?? null;
  switch (kind) {
    case "email":
      return EMAIL_RE.test(key) ? null : "E-mail inválido para chave PIX";
    case "cpf":
      return key.length === 11 ? null : "CPF deve ter 11 dígitos";
    case "cnpj":
      return key.length === 14 ? null : "CNPJ deve ter 14 dígitos";
    case "phone":
      return /^\+55\d{10,11}$/.test(key) ? null : "Telefone deve ter DDD + número";
    case "random":
      return UUID_RE.test(key) ? null : "Chave aleatória deve ser um UUID";
    default:
      return "Não foi possível identificar o tipo da chave PIX";
  }
}

export type PixBrCodeInput = {
  pixKey: string;
  pixKeyType?: PixKeyType | null;
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
  const key = normalizePixKey(input.pixKey, input.pixKeyType ?? null);
  if (!key) throw new Error("Chave PIX vazia");
  const invalid = validatePixKey(key, input.pixKeyType ?? null);
  if (invalid) throw new Error(invalid);

  // Merchant Account Information (26): GUI + chave (+ descrição, se couber).
  // O campo 26 inteiro não pode passar de 99 caracteres — descrição longa
  // junto de chaves grandes (e-mail/UUID) gerava QR recusado pelos bancos.
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyTlv = tlv("01", key);
  let mai = tlv("26", `${gui}${keyTlv}`);
  const desc = input.description ? sanitize(input.description, 40) : "";
  if (desc) {
    const withDesc = `${gui}${keyTlv}${tlv("02", desc)}`;
    if (withDesc.length <= 99) mai = tlv("26", withDesc);
  }

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
