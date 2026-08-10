import { z } from "zod";

/** How the correct answer was obtained — never claim certainty we don't have. */
export const answerSourceSchema = z.enum(["answer-key", "inferred", "unavailable"]);
export type AnswerSource = z.infer<typeof answerSourceSchema>;

/* ------------------------------------------------------------------ *
 * Media — original visual regions preserved from the source PDF.
 * We never ask the model to redraw a diagram: it only tells us WHICH
 * detected visual belongs to a question / option, and the PDF layer
 * crops the real pixels.
 * ------------------------------------------------------------------ */

export const mediaTypeSchema = z.enum(["image", "diagram", "table", "equation"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

/** Normalized (0–1) rectangle relative to the page box, origin top-left. */
export const sourceRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type SourceRegion = z.infer<typeof sourceRegionSchema>;

export const tableDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
export type TableData = z.infer<typeof tableDataSchema>;

export const mediaSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  sourcePage: z.number().nullable().default(null),
  sourceRegion: sourceRegionSchema.nullable().default(null),
  /** "asset:<id>" (cached crop), a data: URL (exported file), or null when unresolved. */
  url: z.string().nullable().default(null),
  alt: z.string().default(""),
  /** Structured table when it could be reconstructed reliably. */
  table: tableDataSchema.nullable().default(null),
  /** The visual inventory id the model pointed at, e.g. "v3-1" or "page:3". */
  ref: z.string().nullable().default(null),
  /** False when the original visual could not be recovered from the PDF. */
  resolved: z.boolean().default(false),
});
export type ExtractedMedia = z.infer<typeof mediaSchema>;

export const contextTypeSchema = z.enum([
  "passage",
  "case-study",
  "data-table",
  "instructions",
  "diagram-context",
]);
export type ContextType = z.infer<typeof contextTypeSchema>;

export const contextSchema = z.object({
  id: z.string(),
  type: contextTypeSchema,
  content: z.string().default(""),
  media: z.array(mediaSchema).default([]),
  sourcePage: z.number().nullable().default(null),
});
export type ExtractedContext = z.infer<typeof contextSchema>;

export const optionSchema = z.object({
  id: z.string(),
  /** null for image-only options. */
  text: z.string().nullable().default(null),
  media: z.array(mediaSchema).default([]),
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
  /** Shared passages / instructions / data tables this question depends on. */
  contextIds: z.array(z.string()).default([]),
  media: z.array(mediaSchema).default([]),
  /** Set when visual content was expected but could not be preserved. */
  mediaWarning: z.string().nullable().default(null),
});

export const extractedExamSchema = z.object({
  title: z.string(),
  sections: z.array(z.string()),
  duration: z.number().nullable(),
  marksPerQuestion: z.number().nullable(),
  negativeMarking: z.number().nullable(),
  /** Stored once, referenced by many questions. */
  contexts: z.array(contextSchema).default([]),
  questions: z.array(extractedQuestionSchema),
});

export type ExtractedOption = z.infer<typeof optionSchema>;
export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type ExtractedExam = z.infer<typeof extractedExamSchema>;

export const UNCATEGORIZED = "Uncategorized";

/** Plain-text of an option, for search / export / accessibility. */
export function optionLabelText(option: ExtractedOption): string {
  if (option.text && option.text.trim()) return option.text;
  const alt = option.media.find((m) => m.alt)?.alt;
  return alt ? alt : option.media.length > 0 ? "(image option)" : "";
}

/** The exact JSON contract handed to any AI provider. */
export const EXTRACTION_JSON_CONTRACT = `{
  "title": string,
  "sections": string[],
  "duration": number | null (minutes, only if stated in the paper),
  "marksPerQuestion": number | null (only if stated),
  "negativeMarking": number | null (only if stated),
  "contexts": [
    {
      "id": string (e.g. "context-96-100"),
      "type": "passage" | "case-study" | "data-table" | "instructions" | "diagram-context",
      "content": string (the shared passage / instruction text, verbatim, stored ONCE),
      "media": [ MEDIA ],
      "sourcePage": number | null
    }
  ],
  "questions": [
    {
      "id": string (e.g. "q1"),
      "question": string,
      "options": [
        { "id": "A", "text": string | null, "media": [ MEDIA ] }
      ],
      "correctAnswer": string | null (must be one of the option ids, or null),
      "answerSource": "answer-key" | "inferred" | "unavailable",
      "explanation": string ("" when none),
      "section": string (use "${UNCATEGORIZED}" if not stated),
      "confidenceScore": number between 0 and 1,
      "sourcePage": number | null (the "--- Page N ---" marker the question came from),
      "contextIds": string[] (ids from "contexts"; [] when the question is self-contained),
      "media": [ MEDIA ]
    }
  ]
}

where MEDIA is:
{
  "type": "image" | "diagram" | "table" | "equation",
  "ref": string | null (an id from the VISUAL INVENTORY, e.g. "v3-1"; or "page:N" when you
          know a visual exists on page N but cannot match it to an inventory id; null for a
          fully structured table),
  "alt": string (short factual description of what the visual shows — never a substitute
          for the visual itself),
  "table": { "headers": string[], "rows": string[][] } | null
          (ONLY for "table" media, and ONLY when every row/column and value can be
           reconstructed exactly; otherwise set table to null and give a "ref" so the
           original table image is preserved)
}`;

export function confidenceTone(score: number): "high" | "medium" | "low" {
  if (score >= 0.9) return "high";
  if (score >= 0.75) return "medium";
  return "low";
}

export function confidencePercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}
