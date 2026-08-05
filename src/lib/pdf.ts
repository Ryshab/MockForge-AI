import type { PDFMetadata } from "@/types";

export const MAX_PDF_BYTES = 100 * 1024 * 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function validatePdfFile(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "That file isn't a PDF. Please upload a .pdf question paper.";
  if (file.size > MAX_PDF_BYTES) return "That PDF is larger than 100 MB. Try a smaller file.";
  if (file.size === 0) return "That file looks empty. Please pick another PDF.";
  return null;
}

export async function readPdfMetadata(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PDFMetadata> {
  onProgress?.(10);
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  onProgress?.(45);

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  onProgress?.(80);

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
    title,
    author,
    uploadedAt: new Date().toISOString(),
  };

  await doc.destroy();
  onProgress?.(100);
  return metadata;
}
