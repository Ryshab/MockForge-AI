import type { PDFMetadata } from "@/types";

/** Normalized (0–1) box on the page, origin top-left. */
export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A visual region detected in the original PDF (embedded image / diagram bitmap). */
export interface PageVisual {
  /** Stable inventory id handed to the AI, e.g. "v3-1". */
  id: string;
  pageNumber: number;
  box: PageBox;
}

export interface PageTextItem {
  str: string;
  /** Normalized top-left origin coordinates. */
  x: number;
  y: number;
}

export interface PdfPage {
  pageNumber: number;
  text: string;
  /** Page size in PDF points at scale 1 (used to size crops). */
  width: number;
  height: number;
  visuals: PageVisual[];
  items: PageTextItem[];
}

export interface PdfDocumentContent {
  metadata: PDFMetadata;
  pages: PdfPage[];
}

function unionBox(a: PageBox, b: PageBox): PageBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function overlapsOrTouches(a: PageBox, b: PageBox, gap = 0.02) {
  return (
    a.x < b.x + b.width + gap &&
    b.x < a.x + a.width + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  );
}

/** PDFs often slice one diagram into many bitmaps — stitch neighbours back together. */
function mergeBoxes(boxes: PageBox[]): PageBox[] {
  const out: PageBox[] = [];
  for (const box of boxes) {
    const hit = out.findIndex((b) => overlapsOrTouches(b, box));
    if (hit >= 0) out[hit] = unionBox(out[hit]!, box);
    else out.push(box);
  }
  // A merge can make two groups adjacent; one more pass settles almost every case.
  if (out.length !== boxes.length) return mergeBoxes(out);
  return out;
}

/**
 * Reads a PDF progressively (page by page) in the browser.
 * Scanned PDFs yield empty page text today; an OCR step can be layered in later
 * without changing this interface.
 */
export interface IPDFService {
  read(
    file: File,
    onProgress?: (percent: number, note?: string) => void,
  ): Promise<PdfDocumentContent>;
}

export const pdfService: IPDFService = {
  async read(file, onProgress) {
    onProgress?.(4, "Reading PDF...");
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const buffer = await file.arrayBuffer();
    onProgress?.(12, "Reading PDF...");

    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

    let title: string | undefined;
    let author: string | undefined;
    try {
      const info = (await doc.getMetadata()).info as { Title?: string; Author?: string };
      title = info?.Title?.trim() || undefined;
      author = info?.Author?.trim() || undefined;
    } catch {
      // metadata is optional
    }

    const metadata: PDFMetadata = {
      fileName: file.name,
      fileSize: file.size,
      pageCount: doc.numPages,
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      uploadedAt: new Date().toISOString(),
    };

    const pages: PdfPage[] = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim();

      const items: PageTextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const tx = item.transform as number[];
        const [vx, vy] = viewport.convertToViewportPoint(tx[4] ?? 0, tx[5] ?? 0) as [
          number,
          number,
        ];
        items.push({
          str: item.str,
          x: vx / viewport.width,
          y: vy / viewport.height,
        });
      }

      // Visual inventory: embedded bitmaps, in reading order.
      let visuals: PageVisual[] = [];
      try {
        const opList = await page.getOperatorList();
        const OPS = pdfjs.OPS as unknown as Record<string, number>;
        const paintOps = new Set<number>(
          [
            OPS["paintImageXObject"],
            OPS["paintJpegXObject"],
            OPS["paintInlineImageXObject"],
            OPS["paintImageMaskXObject"],
          ].filter((op): op is number => typeof op === "number"),
        );
        const vpTransform = viewport.transform as number[];
        const toViewport = (x: number, y: number): [number, number] => [
          vpTransform[0]! * x + vpTransform[2]! * y + vpTransform[4]!,
          vpTransform[1]! * x + vpTransform[3]! * y + vpTransform[5]!,
        ];
        let ctm: number[] = [1, 0, 0, 1, 0, 0];
        const stack: number[][] = [];
        const boxes: PageBox[] = [];
        for (let k = 0; k < opList.fnArray.length; k += 1) {
          const fn = opList.fnArray[k]!;
          if (fn === OPS["save"]) stack.push([...ctm]);
          else if (fn === OPS["restore"]) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
          else if (fn === OPS["transform"])
            ctm = pdfjs.Util.transform(ctm, opList.argsArray[k] as number[]);
          else if (paintOps.has(fn)) {
            const corners: [number, number][] = [
              [0, 0],
              [1, 0],
              [0, 1],
              [1, 1],
            ];
            const pts = corners
              .map(([ux, uy]) => [
                ctm[0]! * ux + ctm[2]! * uy + ctm[4]!,
                ctm[1]! * ux + ctm[3]! * uy + ctm[5]!,
              ])
              .map(([px, py]) => toViewport(px!, py!));
            const xs = pts.map((p) => p[0]);
            const ys = pts.map((p) => p[1]);
            const x0 = Math.min(...xs);
            const x1 = Math.max(...xs);
            const y0 = Math.min(...ys);
            const y1 = Math.max(...ys);
            const box: PageBox = {
              x: x0 / viewport.width,
              y: y0 / viewport.height,
              width: (x1 - x0) / viewport.width,
              height: (y1 - y0) / viewport.height,
            };
            // Ignore hairlines, rules and watermark-sized specks.
            if (box.width > 0.03 && box.height > 0.015 && box.width * box.height > 0.002) {
              boxes.push(box);
            }
          }
        }
        visuals = mergeBoxes(boxes)
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .slice(0, 40)
          .map((box, index) => ({ id: `v${i}-${index + 1}`, pageNumber: i, box }));
      } catch {
        // Operator lists can fail on damaged PDFs — text extraction still stands.
      }

      pages.push({
        pageNumber: i,
        text,
        width: viewport.width,
        height: viewport.height,
        visuals,
        items,
      });
      page.cleanup();
      // Progressive: 15% -> 70% across the document, yielding to the UI thread.
      onProgress?.(15 + Math.round((i / doc.numPages) * 55), "Extracting text...");
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    await doc.cleanup();
    return { metadata, pages };
  },
};
