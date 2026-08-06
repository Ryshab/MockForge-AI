import { validationService } from "./validationService";
import type { ExtractedExam } from "@/lib/extraction-schema";

export interface IExportService {
  fileName(exam: ExtractedExam): string;
  download(exam: ExtractedExam): void;
  importFile(file: File): Promise<ExtractedExam>;
}

export const exportService: IExportService = {
  fileName(exam) {
    const slug =
      exam.examName
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 60) || "mock-exam";
    return `${slug}.json`;
  },

  download(exam) {
    const blob = new Blob([JSON.stringify(exam, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportService.fileName(exam);
    a.click();
    URL.revokeObjectURL(url);
  },

  async importFile(file) {
    const text = await file.text();
    const result = validationService.parse(text);
    if (!result.ok) throw new Error(`That file isn't a valid exam JSON (${result.error}).`);
    return result.exam;
  },
};