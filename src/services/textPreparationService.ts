import type { PageVisual, PdfDocumentContent } from "./pdfService";

export interface PreparedContent {
  text: string;
  pageCount: number;
  charCount: number;
  /** Every visual the AI is allowed to reference. */
  visualCount: number;
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

function describe(visual: PageVisual) {
  const { box } = visual;
  const vertical = box.y < 0.33 ? "top" : box.y < 0.66 ? "middle" : "bottom";
  const horizontal =
    box.width > 0.7 ? "full width" : box.x + box.width / 2 < 0.5 ? "left" : "right";
  const size = Math.round(box.width * 100);
  return `${visual.id} (${vertical}, ${horizontal}, ~${size}% page width)`;
}

export const textPreparationService: ITextPreparationService = {
  prepareRange(doc, startPage, endPage) {
    const pages = doc.pages
      .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
      .map((p) => ({
        pageNumber: p.pageNumber,
        text: cleanPageText(p.text),
        visuals: p.visuals,
      }))
      .filter((p) => p.text.length > 0 || p.visuals.length > 0);

    const text = pages
      .map((p) => {
        const inventory =
          p.visuals.length > 0
            ? `\n[VISUALS on this page: ${p.visuals.map(describe).join("; ")}]`
            : "";
        return `--- Page ${p.pageNumber} ---${inventory}\n${p.text}`;
      })
      .join("\n\n");

    return {
      text,
      pageCount: pages.length,
      charCount: text.length,
      visualCount: pages.reduce((sum, p) => sum + p.visuals.length, 0),
    };
  },
};
