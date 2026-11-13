import type { AttemptExam, ExamAttempt, Question } from "@/types";

export type ReviewStatus = "correct" | "incorrect" | "unattempted" | "ungraded";

export interface ScoredQuestion {
  questionId: string;
  sectionId: string;
  sectionName: string;
  question: Question;
  questionNumber: number;
  selectedAnswer: string | null;
  correctAnswers: string[];
  status: ReviewStatus;
  marksAwarded: number;
  maximumMarks: number;
}

export interface ScoredSection {
  id: string;
  name: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  ungraded: number;
  score: number;
  maximumMarks: number;
}

export interface AttemptResult {
  questions: ScoredQuestion[];
  sections: ScoredSection[];
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  ungraded: number;
  score: number;
  maximumMarks: number;
  accuracy: number;
}

function questionMarks(question: Question, exam: AttemptExam) {
  return Math.max(0, question.marks ?? exam.marksPerQuestion);
}

/** Scores the immutable exam against the saved answers without mutating either. */
export function calculateAttemptResult(exam: AttemptExam, attempt: ExamAttempt): AttemptResult {
  const questions: ScoredQuestion[] = [];
  const sections: ScoredSection[] = [];

  for (const section of exam.sections) {
    // Results are presented in the source exam's order, not the attempt's optional shuffle order.
    const orderedIds = [...section.questionIds].sort((left, right) => {
      const leftIndex = exam.questions[left]?.index ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = exam.questions[right]?.index ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
    const sectionStart = questions.length;
    let sectionScore = 0;
    let sectionMaximum = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let ungraded = 0;

    for (const questionId of orderedIds) {
      const question = exam.questions[questionId];
      if (!question) continue;
      const selectedAnswer = attempt.answers[questionId] ?? null;
      const correctAnswers = question.correctOptionIds;
      const maximumMarks = questionMarks(question, exam);
      const hasAnswerKey = correctAnswers.length > 0;
      let status: ReviewStatus;
      let marksAwarded = 0;

      if (selectedAnswer === null) {
        status = "unattempted";
        unattempted += 1;
      } else if (!hasAnswerKey) {
        // A missing answer key is not evidence that the user's response is wrong.
        status = "ungraded";
        ungraded += 1;
      } else if (correctAnswers.includes(selectedAnswer)) {
        status = "correct";
        correct += 1;
        marksAwarded = maximumMarks;
      } else {
        status = "incorrect";
        incorrect += 1;
        const penalty = exam.enableNegativeMarking
          ? Math.max(0, question.negativeMarks ?? exam.negativeMarks)
          : 0;
        marksAwarded = -penalty;
      }

      sectionMaximum += maximumMarks;
      sectionScore += marksAwarded;
      questions.push({
        questionId,
        sectionId: section.id,
        sectionName: section.name,
        question,
        questionNumber: questions.length + 1,
        selectedAnswer,
        correctAnswers,
        status,
        marksAwarded,
        maximumMarks,
      });
    }

    sections.push({
      id: section.id,
      name: section.name,
      questionCount: questions.length - sectionStart,
      correct,
      incorrect,
      unattempted,
      ungraded,
      score: sectionScore,
      maximumMarks: sectionMaximum,
    });
  }

  const correct = sections.reduce((sum, section) => sum + section.correct, 0);
  const incorrect = sections.reduce((sum, section) => sum + section.incorrect, 0);
  const unattempted = sections.reduce((sum, section) => sum + section.unattempted, 0);
  const ungraded = sections.reduce((sum, section) => sum + section.ungraded, 0);
  const score = sections.reduce((sum, section) => sum + section.score, 0);
  const maximumMarks = sections.reduce((sum, section) => sum + section.maximumMarks, 0);

  return {
    questions,
    sections,
    totalQuestions: questions.length,
    attempted: correct + incorrect + ungraded,
    correct,
    incorrect,
    unattempted,
    ungraded,
    score,
    maximumMarks,
    accuracy: correct + incorrect > 0 ? (correct / (correct + incorrect)) * 100 : 0,
  };
}
