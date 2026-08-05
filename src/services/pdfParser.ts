import type { ParsedPdfDocument, PDFParser } from "./types";
import { readPdfMetadata } from "@/lib/pdf";

/** Metadata-only parser. Text extraction for AI is intentionally deferred. */
export const pdfParser: PDFParser = {
  async parse(file: File, onProgress?: (percent: number) => void): Promise<ParsedPdfDocument> {
    const metadata = await readPdfMetadata(file, onProgress);
    return { metadata };
  },
};
