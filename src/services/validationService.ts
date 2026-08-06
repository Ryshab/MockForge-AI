import { extractedExamSchema, type ExtractedExam } from "@/lib/extraction-schema";

export type ValidationResult = { ok: true; exam: ExtractedExam } | { ok: false; error: string };

export interface IValidationService {
  parse(raw: string): ValidationResult;
  validateExam(exam: unknown): ValidationResult;
}

function stripFences(raw: string) {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function normalize(exam: ExtractedExam): ExtractedExam {
  const seen = new Set<string>();
  const questions = exam.questions.map((q, i) => {
    let id = q.id?.trim() || `q-${i + 1}`;
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    const options = q.options.map((o) => o.trim()).filter(Boolean);
    const correctAnswer = options.includes(q.correctAnswer.trim())
      ? q.correctAnswer.trim()
      : (options[0] ?? "");
    const confidenceScore = Math.max(0, Math.min(100, Math.round(q.confidenceScore)));
    return {
      ...q,
      id,
      options,
      correctAnswer,
      section: q.section?.trim() || "General",
      confidenceScore,
    };
  });

  const sections = Array.from(
    new Set([
      ...exam.sections.map((s) => s.trim()).filter(Boolean),
      ...questions.map((q) => q.section),
    ]),
  );

  return { ...exam, sections, questions };
}

export const validationService: IValidationService = {
  parse(raw) {
    let json: unknown;
    try {
      json = JSON.parse(stripFences(raw));
    } catch {
      return { ok: false, error: "The AI response wasn't valid JSON." };
    }
    return validationService.validateExam(json);
  },

  validateExam(exam) {
    const result = extractedExamSchema.safeParse(exam);
    if (!result.success) {
      const issue = result.error.issues[0];
      return {
        ok: false,
        error: issue ? `${issue.path.join(".") || "root"}: ${issue.message}` : "Invalid exam JSON.",
      };
    }
    if (result.data.questions.length === 0) {
      return { ok: false, error: "No questions were found in the selected paper." };
    }
    return { ok: true, exam: normalize(result.data) };
  },
};
