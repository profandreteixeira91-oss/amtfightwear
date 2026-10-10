import { useEffect, useState } from "react";
import type { EditorSchema } from "@/components/dojo/certificate-editor/types";
import { CertificateRenderer } from "./CertificateRenderer";

type Viewport = { w: number; h: number };

/** Espaço reservado (px) para título, paddings e bordas da janela de pré-visualização. */
const CHROME_X = 64;
const CHROME_Y = 140;

function readViewport(): Viewport {
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Certificado escalado para caber inteiro na janela, centralizado.
 * A caixa externa tem o tamanho JÁ escalado, então o layout nunca enxerga a largura original
 * (o que antes alargava a janela e deslocava o certificado para fora do centro).
 */
export function PreviewStage({ doc }: { doc: EditorSchema }) {
  const [vp, setVp] = useState<Viewport | null>(null);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!vp) return null;
  const maxW = Math.max(200, vp.w * 0.95 - CHROME_X);
  const maxH = Math.max(150, vp.h * 0.9 - CHROME_Y);
  const scale = Math.min(1, maxW / doc.page.width, maxH / doc.page.height);
  const w = Math.floor(doc.page.width * scale);
  const h = Math.floor(doc.page.height * scale);

  return (
    <div className="flex items-center justify-center rounded-lg bg-muted p-3">
      <div className="relative overflow-hidden shadow-lg ring-1 ring-border" style={{ width: w, height: h }}>
        <div className="absolute left-0 top-0" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <CertificateRenderer doc={doc} />
        </div>
      </div>
    </div>
  );
}
