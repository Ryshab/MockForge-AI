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
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim();
      pages.push({ pageNumber: i, text });
      page.cleanup();
      // Progressive: 15% -> 70% across the document, yielding to the UI thread.
      onProgress?.(15 + Math.round((i / doc.numPages) * 55), "Extracting text...");
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    await doc.cleanup();
    return { metadata, pages };
  },
};
