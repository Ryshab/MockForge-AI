import {
  extractedExamSchema,
  UNCATEGORIZED,
  type ExtractedExam,
  type ExtractedQuestion,
} from "@/lib/extraction-schema";

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

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Accepts both the current shape and older exports (examName, string options). */
function coerceLegacy(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const exam = { ...(input as Record<string, unknown>) };
  if (typeof exam["title"] !== "string" && typeof exam["examName"] === "string") {
    exam["title"] = exam["examName"];
  }
  for (const key of ["duration", "marksPerQuestion", "negativeMarking"]) {
    if (exam[key] === undefined) exam[key] = null;
  }
  if (Array.isArray(exam["questions"])) {
    exam["questions"] = exam["questions"].map((raw) => {
      if (!raw || typeof raw !== "object") return raw;
      const q = { ...(raw as Record<string, unknown>) };
      const options = Array.isArray(q["options"]) ? q["options"] : [];
      const normalizedOptions = options.map((o, i) =>
        typeof o === "string"
          ? { id: LETTERS[i] ?? String(i + 1), text: o }
          : { ...(o as Record<string, unknown>) },
      );
      const answer = q["correctAnswer"];
      if (typeof answer === "string" && !normalizedOptions.some((o) => o["id"] === answer)) {
        const match = normalizedOptions.find((o) => o["text"] === answer);
        q["correctAnswer"] = match ? match["id"] : null;
      }
      if (q["correctAnswer"] === undefined) q["correctAnswer"] = null;
      if (typeof q["answerSource"] !== "string") {
        q["answerSource"] = q["correctAnswer"] ? "inferred" : "unavailable";
      }
      if (q["sourcePage"] === undefined) q["sourcePage"] = null;
      if (typeof q["explanation"] !== "string") q["explanation"] = "";
      if (typeof q["section"] !== "string") q["section"] = UNCATEGORIZED;
      q["options"] = normalizedOptions;
      return q;
    });
  }
  if (!Array.isArray(exam["sections"])) exam["sections"] = [];
  return exam;
}

function normalize(exam: ExtractedExam): ExtractedExam {
  const seen = new Set<string>();
  const questions: ExtractedQuestion[] = exam.questions.map((q, i) => {
    let id = q.id?.trim() || `q${i + 1}`;
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);

    const options = q.options
      .map((o, oi) => ({ id: o.id?.trim() || (LETTERS[oi] ?? String(oi + 1)), text: o.text.trim() }))
      .filter((o) => o.text.length > 0);

    const answer = q.correctAnswer?.trim() ?? null;
    const correctAnswer = answer && options.some((o) => o.id === answer) ? answer : null;
    const answerSource = correctAnswer ? q.answerSource : "unavailable";

    // Some models answer on a 0-100 scale; normalize everything to 0-1.
    const rawScore = Number.isFinite(q.confidenceScore) ? q.confidenceScore : 0;
    const confidenceScore = Math.max(0, Math.min(1, rawScore > 1 ? rawScore / 100 : rawScore));

    return {
      ...q,
      id,
      options,
      correctAnswer,
      answerSource,
      section: q.section?.trim() || UNCATEGORIZED,
      confidenceScore,
      sourcePage: q.sourcePage && q.sourcePage > 0 ? q.sourcePage : null,
    };
  });

  const sections = Array.from(
    new Set([
      ...exam.sections.map((s) => s.trim()).filter(Boolean),
      ...questions.map((q) => q.section),
    ]),
  );

  return { ...exam, title: exam.title.trim() || "Untitled paper", sections, questions };
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
    const result = extractedExamSchema.safeParse(coerceLegacy(exam));
    if (!result.success) {
      const issue = result.error.issues[0];
      return {
        ok: false,
        error: issue ? `${issue.path.join(".") || "root"}: ${issue.message}` : "Invalid exam JSON.",
      };
    }
    if (result.data.questions.length === 0) {
      return { ok: false, error: "No multiple-choice questions were found in the selected pages." };
    }
    return { ok: true, exam: normalize(result.data) };
  },
};
