import type { PdfDocumentContent } from "./pdfService";

export interface DetectedPaper {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  charCount: number;
}

export interface IPaperDetectionService {
  detect(doc: PdfDocumentContent): DetectedPaper[];
  getPaperText(doc: PdfDocumentContent, paper: DetectedPaper): string;
}

/** Patterns that usually mark the first page of an individual paper inside a book. */
const HEADING_PATTERNS: RegExp[] = [
  /\b(shift|sitting)\s*[-–:]?\s*(i{1,3}|iv|\d{1,2})\b/i,
  /\bpaper\s*[-–:]?\s*(i{1,3}|iv|\d{1,2})\b/i,
  /\b(set|slot)\s*[-–:]?\s*(\d{1,2}|[a-d])\b/i,
  /\b(tier|phase)\s*[-–:]?\s*(i{1,3}|\d{1,2})\b/i,
  /\b(practice|mock|model|solved)\s+(test|paper|set)\s*[-–:]?\s*\d{0,2}\b/i,
  /\bprevious\s+year\s+paper\b/i,
  /\b(ssc|upsc|ibps|sbi|rrb|railway|neet|jee|cat|cds|nda)\b.{0,60}\b(exam|paper|shift|\d{4})\b/i,
];

function cleanTitle(line: string) {
  return line
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z0-9]+/, "")
    .trim()
    .slice(0, 90);
}

function findHeading(text: string): string | null {
  const head = text.split("\n").join(" ").slice(0, 400);
  const candidates = head
    .split(/(?<=[.:])\s+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pool = candidates.length ? candidates : [head];
  for (const line of pool) {
    if (line.length < 4 || line.length > 140) continue;
    if (HEADING_PATTERNS.some((p) => p.test(line))) return cleanTitle(line);
  }
  return null;
}

export const paperDetectionService: IPaperDetectionService = {
  detect(doc) {
    const starts: { page: number; title: string }[] = [];
    for (const page of doc.pages) {
      if (!page.text) continue;
      const heading = findHeading(page.text);
      const previous = starts[starts.length - 1];
      if (heading && (!previous || page.pageNumber - previous.page >= 2)) {
        starts.push({ page: page.pageNumber, title: heading });
      }
    }

    if (starts.length === 0) {
      starts.push({
        page: 1,
        title: doc.metadata.title?.trim() || doc.metadata.fileName.replace(/\.pdf$/i, ""),
      });
    } else if (starts[0]!.page > 1) {
      starts.unshift({ page: 1, title: "Front matter / Paper 1" });
    }

    return starts.map((start, index) => {
      const endPage = (starts[index + 1]?.page ?? doc.metadata.pageCount + 1) - 1;
      const pages = doc.pages.filter((p) => p.pageNumber >= start.page && p.pageNumber <= endPage);
      return {
        id: `paper-${index + 1}-${start.page}`,
        title: start.title || `Paper ${index + 1}`,
        startPage: start.page,
        endPage,
        pageCount: endPage - start.page + 1,
        charCount: pages.reduce((sum, p) => sum + p.text.length, 0),
      };
    });
  },

  getPaperText(doc, paper) {
    return doc.pages
      .filter((p) => p.pageNumber >= paper.startPage && p.pageNumber <= paper.endPage)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join("\n\n");
  },
};
