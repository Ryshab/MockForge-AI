export type QuestionType = "mcq" | "multiple" | "numeric";

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
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
}

export interface Exam {
  id: string;
  configuration: ExamConfiguration;
  sections: Section[];
  questions: Question[];
  createdAt: string;
}

export type AnswerStatus =
  | "unanswered"
  | "answered"
  | "marked"
  | "answered-marked"
  | "visited";

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