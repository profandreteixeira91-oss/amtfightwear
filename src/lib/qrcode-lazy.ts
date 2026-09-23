// A biblioteca "qrcode" depende de pngjs, que quebra na inicialização do runtime
// serverless (util.inherits -> "superCtor.prototype must be of type object").
// Qualquer import estático dela entra no bundle de SSR e derruba TODAS as
// requisições do site publicado. Por isso o carregamento é sob demanda e só
// acontece no navegador, no momento em que o QR é realmente gerado.
import type { QRCodeToDataURLOptions, QRCodeRenderersOptions } from "qrcode";

async function loadQRCode() {
  const mod = await import("qrcode");
  return mod.default ?? mod;
}

export async function qrToDataURL(
  text: string,
  options?: QRCodeToDataURLOptions,
): Promise<string> {
  const QRCode = await loadQRCode();
  return QRCode.toDataURL(text, options);
}

export async function qrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options?: QRCodeRenderersOptions,
): Promise<void> {
  const QRCode = await loadQRCode();
  await QRCode.toCanvas(canvas, text, options);
}
