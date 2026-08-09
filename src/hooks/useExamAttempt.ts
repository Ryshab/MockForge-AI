import { useAttemptStore, isAttemptValid } from "@/store/attemptStore";

export function useExamAttempt() {
  const exam = useAttemptStore((s) => s.exam);
  const attempt = useAttemptStore((s) => s.attempt);
  const valid = isAttemptValid(exam, attempt);

  const section = valid ? exam!.sections[attempt!.currentSectionIndex]! : null;
  const questionIds = section
    ? (attempt!.questionOrder[section.id] ?? section.questionIds)
    : [];
  const currentQuestionId = section ? questionIds[attempt!.currentQuestionIndex] : undefined;
  const question = currentQuestionId ? (exam!.questions[currentQuestionId] ?? null) : null;

  return {
    exam,
    attempt,
    valid,
    section,
    questionIds,
    question,
    timing: section && attempt ? (attempt.sectionTiming[section.id] ?? null) : null,
  };
}
