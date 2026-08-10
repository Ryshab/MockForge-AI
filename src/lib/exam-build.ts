import type { ExtractedExam } from "@/lib/extraction-schema";
import type { AttemptExam, AttemptSection, ExamConfiguration, Question, Section } from "@/types";

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const norm = (v: string) => v.trim().toLowerCase();

function toQuestion(
  q: ExtractedExam["questions"][number],
  sectionId: string,
  index: number,
): Question {
  const base: Question = {
    id: q.id,
    sectionId,
    index,
    type: "mcq",
    text: q.question,
    options: q.options.map((o) => ({ id: o.id, label: o.id, text: o.text, media: o.media })),
    correctOptionIds: q.correctAnswer ? [q.correctAnswer] : [],
    explanation: q.explanation,
    media: q.media,
    contextIds: q.contextIds,
    mediaWarning: q.mediaWarning,
  };
  return q.sourcePage === null ? base : { ...base, sourcePage: q.sourcePage };
}

/**
 * Turns the validated extraction output plus the user's exam configuration
 * into the immutable Exam definition the CBT engine consumes.
 */
export function buildAttemptExam(
  extracted: ExtractedExam,
  configuration: ExamConfiguration,
  configSections: Section[],
): AttemptExam {
  // An image-only question still has content, so visuals count as substance too.
  const pool = extracted.questions.filter(
    (q) => q.question.trim().length > 0 || q.media.length > 0,
  );
  if (pool.length === 0) throw new Error("This exam has no questions to attempt.");

  const used = new Set<string>();
  const ordered = [...configSections].sort((a, b) => a.order - b.order);
  const buckets: { name: string; durationMinutes: number; items: typeof pool }[] = [];

  if (ordered.length > 0) {
    for (const s of ordered) {
      const matched = pool.filter((q) => !used.has(q.id) && norm(q.section) === norm(s.name));
      matched.forEach((q) => used.add(q.id));
      buckets.push({ name: s.name, durationMinutes: s.durationMinutes, items: matched });
    }
    // Sections with no name match fall back to sequential slices of what's left.
    for (let i = 0; i < buckets.length; i += 1) {
      const bucket = buckets[i]!;
      if (bucket.items.length > 0) continue;
      const remaining = pool.filter((q) => !used.has(q.id));
      const take = remaining.slice(0, Math.max(1, ordered[i]!.questionCount));
      take.forEach((q) => used.add(q.id));
      bucket.items = take;
    }
  }

  const leftovers = pool.filter((q) => !used.has(q.id));
  if (leftovers.length > 0) {
    const byName = new Map<string, typeof pool>();
    for (const q of leftovers) {
      const key = q.section.trim() || "Uncategorized";
      byName.set(key, [...(byName.get(key) ?? []), q]);
    }
    for (const [name, items] of byName) {
      const existing = buckets.find((b) => norm(b.name) === norm(name));
      if (existing) existing.items = [...existing.items, ...items];
      else buckets.push({ name, durationMinutes: 20, items });
    }
  }

  const live = buckets.filter((b) => b.items.length > 0);
  const questions: Record<string, Question> = {};
  const sections: AttemptSection[] = live.map((b) => {
    const id = `sec-${rid().slice(0, 8)}`;
    b.items.forEach((q, i) => {
      questions[q.id] = toQuestion(q, id, i);
    });
    return {
      id,
      name: b.name,
      durationMinutes: Math.max(1, Math.round(b.durationMinutes || 20)),
      questionIds: b.items.map((q) => q.id),
    };
  });

  const count = Object.keys(questions).length;
  const marksPerQuestion = configuration.marksPerQuestion || extracted.marksPerQuestion || 1;

  return {
    id: `exam-${rid().slice(0, 8)}`,
    name: configuration.examName?.trim() || extracted.title || "Mock Test",
    totalMarks: Math.round(count * marksPerQuestion),
    marksPerQuestion,
    negativeMarks: configuration.enableNegativeMarking ? configuration.negativeMarks : 0,
    enableNegativeMarking: configuration.enableNegativeMarking,
    sections,
    questions,
    contexts: Object.fromEntries(extracted.contexts.map((c) => [c.id, c])),
  };
}

/** Deterministic seeded shuffle so an attempt's order never changes on rerender. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return Math.abs(h % 100000) / 100000;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}
