import { describe, expect, test } from "bun:test";
import { calculateAttemptResult } from "../src/lib/result-scoring";
import type { AttemptExam, ExamAttempt, Question } from "../src/types";

function question(
  id: string,
  index: number,
  answer: string[],
  marks?: number,
  negativeMarks?: number,
): Question {
  return {
    id,
    sectionId: "section-a",
    index,
    type: "mcq",
    text: `Question ${id}`,
    options: [
      { id: "A", label: "A", text: "Alpha", media: [] },
      { id: "B", label: "B", text: "Beta", media: [] },
    ],
    correctOptionIds: answer,
    ...(marks === undefined ? {} : { marks }),
    ...(negativeMarks === undefined ? {} : { negativeMarks }),
    media: [],
    contextIds: [],
  };
}

function attempt(
  answers: Record<string, string | null>,
  questionOrder: string[] = ["q1", "q2", "q3"],
): ExamAttempt {
  return {
    attemptId: "attempt-1",
    examId: "exam-1",
    startedAt: 1_000,
    completedAt: 61_000,
    status: "completed",
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    answers,
    questionStatuses: {},
    markedForReview: [],
    completedSections: ["section-a"],
    sectionTiming: { "section-a": { startedAt: 1_000, endsAt: 61_000, completedAt: 61_000 } },
    settings: {
      strictSectionMode: true,
      autoStartNextSection: false,
      enableFullscreen: false,
      warnBeforeExit: false,
      allowReviewMode: true,
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    mode: "mock",
    questionOrder: { "section-a": questionOrder },
    optionOrder: {},
  };
}

function exam(questions: Question[]): AttemptExam {
  return {
    id: "exam-1",
    name: "Fixture",
    totalMarks: 7,
    marksPerQuestion: 2,
    negativeMarks: 0.5,
    enableNegativeMarking: true,
    sections: [
      {
        id: "section-a",
        name: "Reasoning",
        durationMinutes: 20,
        questionIds: questions.map((item) => item.id),
      },
    ],
    questions: Object.fromEntries(questions.map((item) => [item.id, item])),
    contexts: {},
  };
}

describe("calculateAttemptResult", () => {
  test("scores correct, incorrect, unanswered and ungraded questions using their marking scheme", () => {
    const source = exam([
      question("q1", 0, ["A"], 3),
      question("q2", 1, ["B"], 2, 1.25),
      question("q3", 2, []),
      question("q4", 3, ["B"]),
    ]);
    const result = calculateAttemptResult(source, attempt({ q1: "A", q2: "A", q3: "B" }));

    expect(result.totalQuestions).toBe(4);
    expect(result.correct).toBe(1);
    expect(result.incorrect).toBe(1);
    expect(result.unattempted).toBe(1);
    expect(result.ungraded).toBe(1);
    expect(result.attempted).toBe(3);
    expect(result.score).toBe(1.75);
    expect(result.maximumMarks).toBe(9);
    expect(result.questions.map((item) => item.status)).toEqual([
      "correct",
      "incorrect",
      "ungraded",
      "unattempted",
    ]);
    expect(result.correct + result.incorrect + result.ungraded + result.unattempted).toBe(
      result.totalQuestions,
    );
    expect(result.sections[0]?.incorrect).toBe(1);
  });

  test("does not apply negative marking when disabled and keeps unavailable keys out of wrong answers", () => {
    const source = exam([question("q1", 0, ["A"]), question("q2", 1, [])]);
    source.enableNegativeMarking = false;
    const result = calculateAttemptResult(source, attempt({ q1: "B", q2: "A" }));

    expect(result.score).toBe(0);
    expect(result.incorrect).toBe(1);
    expect(result.ungraded).toBe(1);
  });

  test("uses source order instead of a shuffled question order", () => {
    const source = exam([
      question("q1", 0, ["A"]),
      question("q2", 1, ["B"]),
      question("q3", 2, ["A"]),
    ]);
    const result = calculateAttemptResult(source, attempt({}, ["q3", "q1", "q2"]));

    expect(result.questions.map((item) => item.questionId)).toEqual(["q1", "q2", "q3"]);
    expect(result.questions.map((item) => item.questionNumber)).toEqual([1, 2, 3]);
  });
});
