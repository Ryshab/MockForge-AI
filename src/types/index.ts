import type { ExtractedContext, ExtractedMedia } from "@/lib/extraction-schema";

export type QuestionType = "mcq" | "multiple" | "numeric";

export interface QuestionOption {
  id: string;
  label: string;
  /** null for image-only options. */
  text: string | null;
  media: ExtractedMedia[];
}

export interface Question {
  id: string;
  sectionId: string;
  index: number;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation?: string;
  marks?: number;
  negativeMarks?: number;
  sourcePage?: number;
  media: ExtractedMedia[];
  /** Ids into AttemptExam.contexts — shared passages / data the question needs. */
  contextIds: string[];
  mediaWarning?: string | null;
}

export interface Section {
  id: string;
  name: string;
  questionCount: number;
  durationMinutes: number;
  order: number;
}

export interface ExamConfiguration {
  examName: string;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarks: number;
  enableNegativeMarking: boolean;
  enableSectionTimers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReviewMode: boolean;
  enableFullscreen: boolean;
  warnBeforeExit: boolean;
  strictSectionMode: boolean;
  autoStartNextSection: boolean;
}

export interface Exam {
  id: string;
  configuration: ExamConfiguration;
  sections: Section[];
  questions: Question[];
  createdAt: string;
}

export type AnswerStatus = "unanswered" | "answered" | "marked" | "answered-marked" | "visited";

export interface Answer {
  questionId: string;
  selectedOptionIds: string[];
  status: AnswerStatus;
  timeSpentSeconds: number;
}

export interface SectionResult {
  sectionId: string;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
}

export interface Result {
  examId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  sections: SectionResult[];
  submittedAt: string;
}

export interface Timer {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  scope: "exam" | "section";
  scopeId?: string;
}

export interface PDFMetadata {
  fileName: string;
  fileSize: number;
  pageCount: number;
  title?: string;
  author?: string;
  uploadedAt: string;
}

export interface AppSettings {
  defaultMarksPerQuestion: number;
  defaultNegativeMarks: number;
  autoSaveProgress: boolean;
  compactMode: boolean;
  soundAlerts: boolean;
}

/* ---------------------------------------------------------------
 * CBT engine — an ExamAttempt is one user's attempt at an Exam.
 * The Exam (question paper) is never mutated by the attempt.
 * ------------------------------------------------------------- */

export interface AttemptSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
}

export interface AttemptExam {
  id: string;
  name: string;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarks: number;
  enableNegativeMarking: boolean;
  sections: AttemptSection[];
  questions: Record<string, Question>;
  /** Shared passages, case studies and instruction blocks, stored once. */
  contexts: Record<string, ExtractedContext>;
}

export interface SectionTiming {
  startedAt: number | null;
  endsAt: number | null;
  completedAt: number | null;
}

export interface AttemptSettings {
  strictSectionMode: boolean;
  autoStartNextSection: boolean;
  enableFullscreen: boolean;
  warnBeforeExit: boolean;
  allowReviewMode: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export type AttemptStatus = "not-started" | "in-progress" | "completed";

export interface ExamAttempt {
  attemptId: string;
  examId: string;
  startedAt: number;
  completedAt: number | null;
  status: AttemptStatus;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  /** questionId -> selected option id */
  answers: Record<string, string | null>;
  /** questionId -> status */
  questionStatuses: Record<string, AnswerStatus>;
  markedForReview: string[];
  completedSections: string[];
  sectionTiming: Record<string, SectionTiming>;
  settings: AttemptSettings;
  /** sectionId -> ordered question ids for this attempt */
  questionOrder: Record<string, string[]>;
  /** questionId -> ordered option ids for this attempt */
  optionOrder: Record<string, string[]>;
}
