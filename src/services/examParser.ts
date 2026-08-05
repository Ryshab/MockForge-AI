import type { ExamParser, ParsedPdfDocument } from "./types";
import type { ExamConfiguration, Section } from "@/types";

/** Placeholder implementation - wired up in a future iteration. */
export const examParser: ExamParser = {
  async parse(
    _doc: ParsedPdfDocument,
    _config: ExamConfiguration,
  ): Promise<{ sections: Section[] }> {
    throw new Error("Exam parsing is not implemented yet.");
  },
};
