import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildAttemptExam, seededShuffle } from "@/lib/exam-build";
import type { ExtractedExam } from "@/lib/extraction-schema";
import type { AnswerStatus, AttemptExam, ExamAttempt, ExamConfiguration, Section } from "@/types";

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface AttemptState {
  exam: AttemptExam | null;
  attempt: ExamAttempt | null;
  createAttempt: (
    extracted: ExtractedExam,
    configuration: ExamConfiguration,
    sections: Section[],
  ) => void;
  startSection: (index?: number) => void;
  selectOption: (questionId: string, optionId: string) => void;
  clearResponse: (questionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  completeSection: () => void;
  discardAttempt: () => void;
}

function statusFor(answered: boolean, marked: boolean, visited: boolean): AnswerStatus {
  if (answered && marked) return "answered-marked";
  if (marked) return "marked";
  if (answered) return "answered";
  return visited ? "visited" : "unanswered";
}

export const useAttemptStore = create<AttemptState>()(
  persist(
    (set, get) => ({
      exam: null,
      attempt: null,

      createAttempt: (extracted, configuration, sections) => {
        const exam = buildAttemptExam(extracted, configuration, sections);
        const attemptId = rid();
        const questionOrder: Record<string, string[]> = {};
        const optionOrder: Record<string, string[]> = {};
        for (const section of exam.sections) {
          questionOrder[section.id] = configuration.shuffleQuestions
            ? seededShuffle(section.questionIds, `${attemptId}:${section.id}`)
            : [...section.questionIds];
          for (const qid of section.questionIds) {
            const ids = exam.questions[qid]!.options.map((o) => o.id);
            optionOrder[qid] = configuration.shuffleOptions
              ? seededShuffle(ids, `${attemptId}:${qid}`)
              : ids;
          }
        }
        const attempt: ExamAttempt = {
          attemptId,
          examId: exam.id,
          startedAt: Date.now(),
          completedAt: null,
          status: "not-started",
          currentSectionIndex: 0,
          currentQuestionIndex: 0,
          answers: {},
          questionStatuses: {},
          markedForReview: [],
          completedSections: [],
          sectionTiming: Object.fromEntries(
            exam.sections.map((s) => [s.id, { startedAt: null, endsAt: null, completedAt: null }]),
          ),
          settings: {
            strictSectionMode: configuration.strictSectionMode,
            autoStartNextSection: configuration.autoStartNextSection,
            enableFullscreen: configuration.enableFullscreen,
            warnBeforeExit: configuration.warnBeforeExit,
            allowReviewMode: configuration.allowReviewMode,
            shuffleQuestions: configuration.shuffleQuestions,
            shuffleOptions: configuration.shuffleOptions,
          },
          questionOrder,
          optionOrder,
        };
        set({ exam, attempt });
      },

      startSection: (index) => {
        const { exam, attempt } = get();
        if (!exam || !attempt) return;
        const i = index ?? attempt.currentSectionIndex;
        const section = exam.sections[i];
        if (!section) return;
        const now = Date.now();
        set({
          attempt: {
            ...attempt,
            status: "in-progress",
            currentSectionIndex: i,
            currentQuestionIndex: 0,
            sectionTiming: {
              ...attempt.sectionTiming,
              [section.id]: {
                startedAt: now,
                endsAt: now + section.durationMinutes * 60_000,
                completedAt: null,
              },
            },
          },
        });
      },

      selectOption: (questionId, optionId) => {
        const attempt = get().attempt;
        if (!attempt) return;
        const marked = attempt.markedForReview.includes(questionId);
        set({
          attempt: {
            ...attempt,
            answers: { ...attempt.answers, [questionId]: optionId },
            questionStatuses: {
              ...attempt.questionStatuses,
              [questionId]: statusFor(true, marked, true),
            },
          },
        });
      },

      clearResponse: (questionId) => {
        const attempt = get().attempt;
        if (!attempt) return;
        const answers = { ...attempt.answers };
        delete answers[questionId];
        const marked = attempt.markedForReview.includes(questionId);
        set({
          attempt: {
            ...attempt,
            answers,
            questionStatuses: {
              ...attempt.questionStatuses,
              [questionId]: statusFor(false, marked, true),
            },
          },
        });
      },

      toggleMarkForReview: (questionId) => {
        const attempt = get().attempt;
        if (!attempt) return;
        const marked = attempt.markedForReview.includes(questionId);
        const markedForReview = marked
          ? attempt.markedForReview.filter((id) => id !== questionId)
          : [...attempt.markedForReview, questionId];
        set({
          attempt: {
            ...attempt,
            markedForReview,
            questionStatuses: {
              ...attempt.questionStatuses,
              [questionId]: statusFor(Boolean(attempt.answers[questionId]), !marked, true),
            },
          },
        });
      },

      goToQuestion: (index) => {
        const { exam, attempt } = get();
        if (!exam || !attempt) return;
        const section = exam.sections[attempt.currentSectionIndex];
        if (!section) return;
        const ids = attempt.questionOrder[section.id] ?? section.questionIds;
        if (index < 0 || index >= ids.length) return;
        const qid = ids[index]!;
        const existing = attempt.questionStatuses[qid];
        set({
          attempt: {
            ...attempt,
            currentQuestionIndex: index,
            questionStatuses: existing
              ? attempt.questionStatuses
              : { ...attempt.questionStatuses, [qid]: "visited" },
          },
        });
      },

      nextQuestion: () => get().goToQuestion(get().attempt!.currentQuestionIndex + 1),
      previousQuestion: () => get().goToQuestion(get().attempt!.currentQuestionIndex - 1),

      completeSection: () => {
        const { exam, attempt } = get();
        if (!exam || !attempt) return;
        const section = exam.sections[attempt.currentSectionIndex];
        if (!section) return;
        const now = Date.now();
        const completedSections = attempt.completedSections.includes(section.id)
          ? attempt.completedSections
          : [...attempt.completedSections, section.id];
        const isLast = attempt.currentSectionIndex >= exam.sections.length - 1;
        const timing = attempt.sectionTiming[section.id];
        set({
          attempt: {
            ...attempt,
            completedSections,
            sectionTiming: {
              ...attempt.sectionTiming,
              [section.id]: {
                startedAt: timing?.startedAt ?? now,
                endsAt: timing?.endsAt ?? now,
                completedAt: now,
              },
            },
            status: isLast ? "completed" : "in-progress",
            completedAt: isLast ? now : null,
            currentSectionIndex: isLast
              ? attempt.currentSectionIndex
              : attempt.currentSectionIndex + 1,
            currentQuestionIndex: 0,
          },
        });
      },

      discardAttempt: () => set({ exam: null, attempt: null }),
    }),
    { name: "amtg-attempt", version: 1 },
  ),
);

/** Guards against a corrupted or partially written persisted attempt. */
export function isAttemptValid(exam: AttemptExam | null, attempt: ExamAttempt | null): boolean {
  if (!exam || !attempt) return false;
  if (attempt.examId !== exam.id) return false;
  if (!Array.isArray(exam.sections) || exam.sections.length === 0) return false;
  if (!exam.sections.every((s) => s.questionIds.every((id) => exam.questions[id]))) return false;
  const index = attempt.currentSectionIndex;
  return index >= 0 && index < exam.sections.length;
}
