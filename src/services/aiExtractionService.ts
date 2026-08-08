import { extractQuestionsFromPaper } from "@/lib/ai-extraction.functions";
import { validationService } from "./validationService";
import type { ExtractedExam } from "@/lib/extraction-schema";

export type ExtractionStage =
  | "preparing"
  | "extracting"
  | "matching"
  | "validating"
  | "repairing"
  | "ready";

export interface IAIExtractionService {
  /** Extracts + validates one paper. Attempts a structured repair once on failure. */
  extract(
    paperTitle: string,
    paperText: string,
    onStage?: (stage: ExtractionStage) => void,
  ): Promise<ExtractedExam>;
}

function friendly(error: unknown) {
  return error instanceof Error ? error.message : "The AI request failed unexpectedly.";
}

export const aiExtractionService: IAIExtractionService = {
  async extract(paperTitle, paperText, onStage) {
    onStage?.("extracting");
    let raw: string;
    try {
      ({ raw } = await extractQuestionsFromPaper({ data: { paperTitle, paperText } }));
    } catch (error) {
      throw new Error(friendly(error));
    }

    onStage?.("matching");
    onStage?.("validating");
    let result = validationService.parse(raw);
    if (result.ok) {
      onStage?.("ready");
      return result.exam;
    }

    // One structured repair attempt with the validation error fed back to the model.
    onStage?.("repairing");
    const firstError = result.error;
    try {
      ({ raw } = await extractQuestionsFromPaper({
        data: { paperTitle, paperText, repair: { previous: raw, error: firstError } },
      }));
    } catch (error) {
      throw new Error(friendly(error));
    }

    onStage?.("validating");
    result = validationService.parse(raw);
    if (result.ok) {
      onStage?.("ready");
      return result.exam;
    }

    throw new Error(
      `We couldn't read a valid question set from these pages (${result.error}). Try a different page range, or check that the PDF has selectable text.`,
    );
  },
};
