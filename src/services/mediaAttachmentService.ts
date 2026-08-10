import { assetStore } from "./assetStore";
import { pdfCropService, type CropRequest } from "./pdfCropService";
import type { PageBox, PdfDocumentContent, PdfPage } from "./pdfService";
import type { ExtractedExam, ExtractedMedia, ExtractedQuestion } from "@/lib/extraction-schema";

/**
 * The AI never draws anything. It only points at visuals we detected in the
 * PDF ("v3-1") or at a page ("page:3"). This service turns those pointers into
 * crops of the ORIGINAL pages, and flags anything it could not recover.
 */

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Vertical band a question occupies on its page — the fallback for vector diagrams. */
function questionBand(page: PdfPage, question: string, nextQuestion?: string): PageBox | null {
  const needle = normalize(question).slice(0, 24);
  if (needle.length < 8 || page.items.length === 0) return null;

  const sorted = [...page.items].sort((a, b) => a.y - b.y);
  const joinFrom = (index: number) =>
    normalize(
      sorted
        .slice(index, index + 12)
        .map((i) => i.str)
        .join(" "),
    );

  let startIndex = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (joinFrom(i).startsWith(needle) || joinFrom(i).includes(needle)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex < 0) return null;

  const startY = Math.max(0, sorted[startIndex]!.y - 0.005);
  let endY = 0.98;
  const nextNeedle = nextQuestion ? normalize(nextQuestion).slice(0, 24) : "";
  if (nextNeedle.length >= 8) {
    for (let i = startIndex + 1; i < sorted.length; i += 1) {
      if (joinFrom(i).includes(nextNeedle)) {
        endY = Math.max(startY + 0.05, sorted[i]!.y - 0.005);
        break;
      }
    }
  }
  const height = Math.min(1 - startY, endY - startY);
  if (height < 0.04) return null;
  return { x: 0.03, y: startY, width: 0.94, height };
}

function findVisualBox(doc: PdfDocumentContent, ref: string): { page: number; box: PageBox } | null {
  const match = /^v(\d+)-(\d+)$/i.exec(ref.trim());
  if (!match) return null;
  const pageNumber = Number(match[1]);
  const page = doc.pages.find((p) => p.pageNumber === pageNumber);
  const visual = page?.visuals.find((v) => v.id.toLowerCase() === ref.trim().toLowerCase());
  return visual ? { page: pageNumber, box: visual.box } : null;
}

function refPage(ref: string | null): number | null {
  if (!ref) return null;
  const direct = /^page:(\d+)$/i.exec(ref.trim());
  if (direct) return Number(direct[1]);
  const inventory = /^v(\d+)-\d+$/i.exec(ref.trim());
  return inventory ? Number(inventory[1]) : null;
}

interface Slot {
  media: ExtractedMedia;
  question: ExtractedQuestion | null;
}

export interface IMediaAttachmentService {
  attach(
    exam: ExtractedExam,
    doc: PdfDocumentContent,
    file: File | null,
    onProgress?: (note: string) => void,
  ): Promise<ExtractedExam>;
}

export const mediaAttachmentService: IMediaAttachmentService = {
  async attach(exam, doc, file, onProgress) {
    const slots: Slot[] = [];
    for (const context of exam.contexts) {
      for (const media of context.media) slots.push({ media, question: null });
    }
    for (const question of exam.questions) {
      for (const media of question.media) slots.push({ media, question });
      for (const option of question.options) {
        for (const media of option.media) slots.push({ media, question });
      }
    }
    if (slots.length === 0) return exam;

    onProgress?.("Preserving diagrams and tables...");

    const requests: CropRequest[] = [];
    const unresolved: Slot[] = [];

    slots.forEach((slot, index) => {
      const { media, question } = slot;
      // A fully reconstructed table needs no picture of itself.
      if (media.type === "table" && media.table && media.table.rows.length > 0) {
        media.resolved = true;
        return;
      }

      const key = `m${index}`;
      const located = media.ref ? findVisualBox(doc, media.ref) : null;
      const pageNumber =
        located?.page ??
        refPage(media.ref) ??
        media.sourcePage ??
        question?.sourcePage ??
        null;

      let box = located?.box ?? null;
      if (!box && pageNumber) {
        const page = doc.pages.find((p) => p.pageNumber === pageNumber);
        if (page) {
          // Prefer a detected bitmap on that page that nothing else claimed.
          const claimed = new Set(
            slots.map((s) => s.media.ref?.toLowerCase()).filter(Boolean) as string[],
          );
          const free = page.visuals.find((v) => !claimed.has(v.id.toLowerCase()));
          if (free) box = free.box;
          else if (question) {
            const siblings = exam.questions.filter((q) => q.sourcePage === pageNumber);
            const at = siblings.findIndex((q) => q.id === question.id);
            box = questionBand(page, question.question, siblings[at + 1]?.question);
          }
        }
      }

      if (box && pageNumber) {
        media.sourcePage = pageNumber;
        media.sourceRegion = box;
        requests.push({ key, pageNumber, box });
      } else {
        unresolved.push(slot);
      }
    });

    let crops = new Map<string, string>();
    if (file && requests.length > 0) {
      try {
        crops = await pdfCropService.crop(file, requests);
      } catch {
        crops = new Map();
      }
    }

    let cropIndex = 0;
    for (const [index, slot] of slots.entries()) {
      const key = `m${index}`;
      const dataUrl = crops.get(key);
      if (!dataUrl) continue;
      slot.media.url = await assetStore.put(dataUrl);
      slot.media.resolved = true;
      cropIndex += 1;
      if (cropIndex % 8 === 0) onProgress?.(`Preserving visuals (${cropIndex}/${requests.length})…`);
    }

    for (const slot of [...unresolved, ...slots.filter((s) => !s.media.resolved)]) {
      if (slot.media.resolved) continue;
      const page = slot.media.sourcePage ?? slot.question?.sourcePage ?? null;
      const where = page ? ` on page ${page}` : "";
      if (slot.question && !slot.question.mediaWarning) {
        slot.question.mediaWarning = `A visual${where} could not be extracted from the PDF. Open the original page to check this question.`;
      }
    }

    return exam;
  },
};