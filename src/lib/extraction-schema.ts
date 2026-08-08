import { z } from "zod";

/** How the correct answer was obtained — never claim certainty we don't have. */
export const answerSourceSchema = z.enum(["answer-key", "inferred", "unavailable"]);
export type AnswerSource = z.infer<typeof answerSourceSchema>;

export const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const extractedQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(optionSchema),
  /** Option id (e.g. "B"), or null when no answer could be reliably determined. */
  correctAnswer: z.string().nullable(),
  answerSource: answerSourceSchema,
  explanation: z.string(),
  section: z.string(),
  /** 0–1 extraction reliability. Never proof that the answer is correct. */
  confidenceScore: z.number(),
  sourcePage: z.number().nullable(),
});

export const extractedExamSchema = z.object({
  title: z.string(),
  sections: z.array(z.string()),
  duration: z.number().nullable(),
  marksPerQuestion: z.number().nullable(),
  negativeMarking: z.number().nullable(),
  questions: z.array(extractedQuestionSchema),
});

export type ExtractedOption = z.infer<typeof optionSchema>;
export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type ExtractedExam = z.infer<typeof extractedExamSchema>;

export const UNCATEGORIZED = "Uncategorized";

/** The exact JSON contract handed to any AI provider. */
export const EXTRACTION_JSON_CONTRACT = `{
  "title": string,
  "sections": string[],
  "duration": number | null (minutes, only if stated in the paper),
  "marksPerQuestion": number | null (only if stated),
  "negativeMarking": number | null (only if stated),
  "questions": [
    {
      "id": string (e.g. "q1"),
      "question": string,
      "options": [{ "id": "A", "text": string }, { "id": "B", "text": string }],
      "correctAnswer": string | null (must be one of the option ids, or null),
      "answerSource": "answer-key" | "inferred" | "unavailable",
      "explanation": string ("" when none),
      "section": string (use "${UNCATEGORIZED}" if not stated),
      "confidenceScore": number between 0 and 1,
      "sourcePage": number | null (the "--- Page N ---" marker the question came from)
    }
  ]
}`;

export function confidenceTone(score: number): "high" | "medium" | "low" {
  if (score >= 0.9) return "high";
  if (score >= 0.75) return "medium";
  return "low";
}

export function confidencePercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}
