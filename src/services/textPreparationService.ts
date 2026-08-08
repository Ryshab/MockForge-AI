import type { PdfDocumentContent } from "./pdfService";

export interface PreparedContent {
  text: string;
  pageCount: number;
  charCount: number;
}

/** Strips boilerplate that wastes tokens without losing question content. */
function cleanPageText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/(https?:\/\/\S+|www\.\S+)/gi, "")
    .replace(/^\s*page\s+\d+\s*(of\s+\d+)?\s*$/gim, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ITextPreparationService {
  /** Only the selected pages are ever prepared — nothing else reaches the AI. */
  prepareRange(doc: PdfDocumentContent, startPage: number, endPage: number): PreparedContent;
}

export const textPreparationService: ITextPreparationService = {
  prepareRange(doc, startPage, endPage) {
    const pages = doc.pages
      .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
      .map((p) => ({ pageNumber: p.pageNumber, text: cleanPageText(p.text) }))
      .filter((p) => p.text.length > 0);

    const text = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join("\n\n");
    return {
      text,
      pageCount: pages.length,
      charCount: text.length,
    };
  },
};
