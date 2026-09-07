import { extractQuestionsFromPaper } from "@/lib/ai-extraction.functions";
import { validationService } from "./validationService";
import type { ExtractedExam } from "@/lib/extraction-schema";

export type ExtractionStage =
  "preparing" | "extracting" | "matching" | "validating" | "repairing" | "ready";

export interface IAIExtractionService {
  /** Extracts + validates one paper. Attempts a structured repair once on failure. */
  extract(
    paperTitle: string,
    paperText: string,
    onStage?: (stage: ExtractionStage) => void,
  ): Promise<ExtractedExam>;
}

function friendly(error: unknown) {
  return error instanceof Error ? error.message : "The AI request failed unexpectedly.";
}

const CHUNK_LIMIT = 60_000;

function pageBlocks(paperText: string): string[] {
  const starts = [...paperText.matchAll(/(?=^--- Page \d+ ---)/gm)].map(
    (match) => match.index ?? 0,
  );
  if (starts.length === 0) return [paperText];
  return starts.map((start, index) =>
    paperText.slice(start, starts[index + 1] ?? paperText.length).trim(),
  );
}

function buildChunks(paperText: string): string[] {
  const blocks = pageBlocks(paperText);
  if (blocks.length === 1 && (blocks[0]?.length ?? 0) <= CHUNK_LIMIT) return blocks;

  const chunks: string[] = [];
  let start = 0;
  while (start < blocks.length) {
    let end = start;
    let size = 0;
    while (
      end < blocks.length &&
      (end === start || size + (blocks[end]?.length ?? 0) + 2 <= CHUNK_LIMIT)
    ) {
      size += blocks[end]!.length + 2;
      end += 1;
    }
    if (end === start) end += 1;
    chunks.push(blocks.slice(start, end).join("\n\n"));
    if (end >= blocks.length) break;
    // Repeat one boundary page so a question split over two pages is present
    // in at least one complete request.
    start = Math.max(start + 1, end - 1);
  }
  return chunks;
}

function answerKeyReference(paperText: string): string {
  const keyBlocks = pageBlocks(paperText).filter((block) =>
    /answer\s*(key|:)|correct\s*answers?|solutions?\s*:/i.test(block),
  );
  return keyBlocks.length > 0
    ? `\n\n--- Answer-key reference pages ---\n${keyBlocks.join("\n\n")}`
    : "";
}

function questionKey(question: ExtractedExam["questions"][number]): string {
  return question.question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function richness(question: ExtractedExam["questions"][number]): number {
  return (
    question.question.length +
    question.options.length * 120 +
    question.options.filter((option) => option.text || option.media.length > 0).length * 60 +
    question.media.length * 80
  );
}

function mergeExams(exams: ExtractedExam[]): ExtractedExam {
  const first = exams[0];
  if (!first) throw new Error("No extraction results were returned.");

  const questions: ExtractedExam["questions"] = [];
  const byText = new Map<string, number>();
  for (const exam of exams) {
    for (const question of exam.questions) {
      const key = questionKey(question);
      if (!key) {
        questions.push(question);
        continue;
      }
      const existingIndex = byText.get(key);
      if (existingIndex === undefined) {
        byText.set(key, questions.length);
        questions.push(question);
      } else {
        const existing = questions[existingIndex];
        if (existing && richness(question) > richness(existing)) {
          questions[existingIndex] = question;
        }
      }
    }
  }

  const contexts = new Map<string, ExtractedExam["contexts"][number]>();
  for (const exam of exams) {
    for (const context of exam.contexts) {
      const existing = contexts.get(context.id);
      if (!existing || context.content.length > existing.content.length) {
        contexts.set(context.id, context);
      }
    }
  }

  return {
    ...first,
    sections: Array.from(new Set(exams.flatMap((exam) => exam.sections))),
    contexts: Array.from(contexts.values()),
    questions,
  };
}

export const aiExtractionService: IAIExtractionService = {
  async extract(paperTitle, paperText, onStage) {
    const chunks = buildChunks(paperText);
    const answerKey = answerKeyReference(paperText);
    const exams: ExtractedExam[] = [];

    for (const chunk of chunks) {
      onStage?.("extracting");
      const chunkText = `${chunk}${answerKey}`;
      let raw = "";
      try {
        ({ raw } = await extractQuestionsFromPaper({
          data: { paperTitle, paperText: chunkText },
        }));
      } catch (error) {
        throw new Error(friendly(error));
      }

      onStage?.("matching");
      onStage?.("validating");
      let result = validationService.parse(raw, { allowEmptyQuestions: true });
      if (!result.ok) {
        onStage?.("repairing");
        try {
          ({ raw } = await extractQuestionsFromPaper({
            data: {
              paperTitle,
              paperText: chunkText,
              repair: { previous: raw, error: result.error },
            },
          }));
        } catch (error) {
          throw new Error(friendly(error));
        }
        onStage?.("validating");
        result = validationService.parse(raw, { allowEmptyQuestions: true });
      }
      if (!result.ok) {
        throw new Error(`We couldn't read this page group (${result.error}). Try a different page range.`);
      }
      exams.push(result.exam);
    }

    const merged = mergeExams(exams);
    if (merged.questions.length === 0) {
      throw new Error("No multiple-choice questions were found in the selected pages.");
    }
    onStage?.("ready");
    return merged;
  },
};
