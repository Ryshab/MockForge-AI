import { z } from "zod";

export const extractedQuestionSchema = z.object({
  id: z.string(),
  section: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
  confidenceScore: z.number(),
});

export const extractedExamSchema = z.object({
  examName: z.string(),
  sections: z.array(z.string()),
  duration: z.number(),
  marksPerQuestion: z.number(),
  negativeMarking: z.number(),
  questions: z.array(extractedQuestionSchema),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type ExtractedExam = z.infer<typeof extractedExamSchema>;

/** The exact JSON contract handed to any AI provider. */
export const EXTRACTION_JSON_CONTRACT = `{
  "examName": string,
  "sections": string[],
  "duration": number (minutes),
  "marksPerQuestion": number,
  "negativeMarking": number,
  "questions": [
    {
      "id": string,
      "section": string,
      "question": string,
      "options": string[],
      "correctAnswer": string (must exactly match one entry of options),
      "explanation": string,
      "confidenceScore": number (0-100)
    }
  ]
}`;

export function confidenceTone(score: number): "high" | "medium" | "low" {
  if (score >= 95) return "high";
  if (score >= 80) return "medium";
  return "low";
}