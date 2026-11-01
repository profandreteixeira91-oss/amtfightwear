// Server-only: envio de e-mail pela API HTTP da Resend (funciona em Workers, sem SDK).
// Segredos: RESEND_API_KEY. Remetente: EMAIL_FROM (ex.: "AMT <noreply@notify.amtfightwear.com.br>").

const RESEND_URL = "https://api.resend.com/emails";
export const DEFAULT_FROM = "AMT Fight Wear <noreply@notify.amtfightwear.com.br>";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Evita envio duplicado em retentativas (Resend guarda por 24h). */
  idempotencyKey?: string;
  /** Rótulo para filtrar no painel da Resend (ex.: nome do template). */
  tag?: string;
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** 4xx (exceto 429) não adianta repetir. */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

export async function sendEmail(email: OutgoingEmail): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (email.idempotencyKey) headers["Idempotency-Key"] = email.idempotencyKey.slice(0, 256);

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: email.from || process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      ...(email.text ? { text: email.text } : {}),
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      ...(email.tag ? { tags: [{ name: "template", value: email.tag.replace(/[^\w-]/g, "_") }] } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailSendError(
      `Resend ${res.status}: ${body.slice(0, 300)}`,
      res.status,
      res.status >= 500 || res.status === 429,
    );
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: json.id ?? null };
}
