import { qrToDataURL } from "@/lib/qrcode-lazy";

const cache = new Map<string, string>();

export async function qrDataUrl(value: string, opts: { color?: string; bg?: string; size?: number } = {}): Promise<string> {
  const key = `${value}|${opts.color ?? "#000"}|${opts.bg ?? "#fff"}|${opts.size ?? 256}`;
  if (cache.has(key)) return cache.get(key)!;
  const url = await qrToDataURL(value || " ", {
    width: opts.size ?? 256,
    margin: 1,
    color: { dark: opts.color ?? "#000000", light: opts.bg ?? "#ffffff" },
  });
  cache.set(key, url);
  return url;
}

/** Substitute {{var}} tokens with values from a lookup. */
export function substitute(text: string, values: Record<string, string>): string {
  return (text ?? "").replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => values[k] ?? "");
}

export function systemValues(): Record<string, string> {
  const now = new Date();
  return {
    data_atual: now.toLocaleDateString("pt-BR"),
    hora_atual: now.toLocaleTimeString("pt-BR"),
    ano_atual: String(now.getFullYear()),
  };
}
