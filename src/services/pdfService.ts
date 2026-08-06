import type { PDFMetadata } from "@/types";

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface PdfDocumentContent {
  metadata: PDFMetadata;
  pages: PdfPage[];
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