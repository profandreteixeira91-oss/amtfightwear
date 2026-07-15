// Snapshots an SVG element to a PNG data URL. Data-URL image hrefs render fine
// on canvas because they're same-origin. Returns null if capture fails.
export async function captureSvgToPng(svg: SVGSVGElement, size = 900): Promise<string | null> {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const vb = svg.viewBox.baseVal;
    const vbW = vb && vb.width ? vb.width : svg.clientWidth || 100;
    const vbH = vb && vb.height ? vb.height : svg.clientHeight || 100;
    const ratio = vbH / vbW || 1;
    const w = size;
    const h = Math.round(size * ratio);
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load"));
      img.src = svg64;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function capturePreview(container: HTMLElement | null, size = 900): Promise<string | null> {
  if (!container) return null;
  const svg = container.querySelector("svg");
  if (!svg) return null;
  return captureSvgToPng(svg as SVGSVGElement, size);
}
