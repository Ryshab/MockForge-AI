import type { ParsedPdfDocument, QuestionExtractor } from "./types";
import type { Question, Section } from "@/types";

/** Placeholder implementation - wired up in a future iteration. */
export const questionExtractor: QuestionExtractor = {
  async extract(_doc: ParsedPdfDocument, _sections: Section[]): Promise<Question[]> {
    throw new Error("Question extraction is not implemented yet.");
  },
};
