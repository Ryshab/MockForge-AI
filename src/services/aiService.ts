import type { AIService, ParsedPdfDocument } from "./types";
import type { Exam, ExamConfiguration } from "@/types";

/** Placeholder. AI extraction is intentionally not implemented in this version. */
export const aiService: AIService = {
  isEnabled: () => false,
  async generateExam(_doc: ParsedPdfDocument, _config: ExamConfiguration): Promise<Exam> {
    throw new Error("AI exam generation is not implemented yet.");
  },
};
