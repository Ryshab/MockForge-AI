import type { PageBox } from "./pdfService";

export interface CropRequest {
  key: string;
  pageNumber: number;
  box: PageBox;
}

/** Crops are stored slightly larger than the detected box so nothing is clipped. */
const PAD = 0.012;
/** Render scale — high enough that a small diagram stays legible when zoomed. */
const SCALE = 2.2;
const MAX_EDGE = 1600;

function padBox(box: PageBox): PageBox {
  const x = Math.max(0, box.x - PAD);
  const y = Math.max(0, box.y - PAD);
  return {
    x,
    y,
    width: Math.min(1 - x, box.width + PAD * 2),
    height: Math.min(1 - y, box.height + PAD * 2),
  };
}

export interface IPdfCropService {
  /**
   * Renders the requested regions of the ORIGINAL PDF to images.
   * Nothing is redrawn or regenerated — these are the source pixels.
   */
  crop(file: File, requests: CropRequest[]): Promise<Map<string, string>>;
}

export const pdfCropService: IPdfCropService = {
  async crop(file, requests) {
    const out = new Map<string, string>();
    if (requests.length === 0 || typeof document === "undefined") return out;

    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

    const byPage = new Map<number, CropRequest[]>();
    for (const request of requests) {
      byPage.set(request.pageNumber, [...(byPage.get(request.pageNumber) ?? []), request]);
    }

    for (const [pageNumber, pageRequests] of byPage) {
      if (pageNumber < 1 || pageNumber > doc.numPages) continue;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      for (const request of pageRequests) {
        const box = padBox(request.box);
        const sx = Math.round(box.x * canvas.width);
        const sy = Math.round(box.y * canvas.height);
        const sw = Math.max(1, Math.round(box.width * canvas.width));
        const sh = Math.max(1, Math.round(box.height * canvas.height));
        const shrink = Math.min(1, MAX_EDGE / Math.max(sw, sh));

        const crop = document.createElement("canvas");
        crop.width = Math.max(1, Math.round(sw * shrink));
        crop.height = Math.max(1, Math.round(sh * shrink));
        const cropContext = crop.getContext("2d");
        if (!cropContext) continue;
        cropContext.fillStyle = "#ffffff";
        cropContext.fillRect(0, 0, crop.width, crop.height);
        cropContext.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
        out.set(request.key, crop.toDataURL("image/webp", 0.9));
      }

      page.cleanup();
      await new Promise((r) => setTimeout(r, 0));
    }

    await doc.cleanup();
    return out;
  },
};
