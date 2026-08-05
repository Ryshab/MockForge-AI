import type { QuestionValidator, ValidationIssue } from "./types";
import type { Question } from "@/types";

/** Placeholder implementation - wired up in a future iteration. */
export const questionValidator: QuestionValidator = {
  async validate(_questions: Question[]): Promise<ValidationIssue[]> {
    return [];
  },
};
