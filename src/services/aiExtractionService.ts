import { extractQuestionsFromPaper } from "@/lib/ai-extraction.functions";
import { validationService } from "./validationService";
import type { ExtractedExam } from "@/lib/extraction-schema";

export interface IAIExtractionService {
  /** Extracts + validates a single paper. Retries once on validation failure. */
  extract(
    paperTitle: string,
    paperText: string,
    onStage?: (stage: string) => void,
  ): Promise<ExtractedExam>;
}

export const aiExtractionService: IAIExtractionService = {
  async extract(paperTitle, paperText, onStage) {
    let lastError = "Extraction failed.";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      onStage?.(attempt === 1 ? "Sending to AI..." : "Retrying extraction...");
      const { raw } = await extractQuestionsFromPaper({ data: { paperTitle, paperText } });
      onStage?.("Validating...");
      const result = validationService.parse(raw);
      if (result.ok) return result.exam;
      lastError = result.error;
    }
    throw new Error(
      `We couldn't read a valid question set from this paper (${lastError}). Try selecting a different paper.`,
    );
  },
};
