import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PdfDocumentContent } from "@/services/pdfService";
import type { DetectedPaper } from "@/services/paperDetectionService";
import { UNCATEGORIZED, type ExtractedExam, type ExtractedQuestion } from "@/lib/extraction-schema";

export type PipelineStage =
  | "idle"
  | "reading"
  | "extracting-text"
  | "detecting"
  | "awaiting-mode"
  | "awaiting-selection"
  | "preparing"
  | "ai"
  | "matching"
  | "validating"
  | "ready"
  | "error";

export const stageLabel: Record<PipelineStage, string> = {
  idle: "Waiting for a PDF",
  reading: "Reading PDF...",
  "extracting-text": "Extracting text...",
  detecting: "Detecting papers...",
  "awaiting-mode": "Choose how to process this PDF",
  "awaiting-selection": "Select a paper",
  preparing: "Preparing selected pages...",
  ai: "Extracting questions...",
  matching: "Matching answer key...",
  validating: "Validating questions...",
  ready: "Ready for review.",
  error: "Something went wrong",
};

interface ExtractionState {
  stage: PipelineStage;
  note: string;
  progress: number;
  error: string | null;
  document: PdfDocumentContent | null;
  papers: DetectedPaper[];
  selectedPaperId: string | null;
  exam: ExtractedExam | null;
  setStage: (stage: PipelineStage, note?: string) => void;
  setProgress: (progress: number, note?: string) => void;
  setError: (error: string | null) => void;
  setDocument: (doc: PdfDocumentContent | null) => void;
  setPapers: (papers: DetectedPaper[]) => void;
  selectPaper: (id: string | null) => void;
  setExam: (exam: ExtractedExam | null) => void;
  updateExamMeta: (patch: Partial<Omit<ExtractedExam, "questions">>) => void;
  updateQuestion: (id: string, patch: Partial<ExtractedQuestion>) => void;
  deleteQuestion: (id: string) => void;
  addQuestion: (section?: string) => void;
  duplicateQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: "up" | "down") => void;
  mergeQuestions: (ids: string[]) => void;
  splitQuestion: (id: string) => void;
  renameSection: (from: string, to: string) => void;
  reset: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `q-${crypto.randomUUID().slice(0, 8)}`
    : `q-${Math.random().toString(36).slice(2, 10)}`;

export const useExtractionStore = create<ExtractionState>()(
  persist(
    (set, get) => ({
      stage: "idle",
      note: "",
      progress: 0,
      error: null,
      document: null,
      papers: [],
      selectedPaperId: null,
      exam: null,

      setStage: (stage, note) => set({ stage, note: note ?? stageLabel[stage] }),
      setProgress: (progress, note) => set(note ? { progress, note } : { progress }),
      setError: (error) => set({ error, stage: error ? "error" : get().stage }),
      setDocument: (document) => set({ document }),
      setPapers: (papers) => set({ papers }),
      selectPaper: (selectedPaperId) => set({ selectedPaperId }),
      setExam: (exam) => set({ exam }),

      updateExamMeta: (patch) => {
        const exam = get().exam;
        if (exam) set({ exam: { ...exam, ...patch } });
      },

      updateQuestion: (id, patch) => {
        const exam = get().exam;
        if (!exam) return;
        set({
          exam: {
            ...exam,
            sections:
              patch.section && !exam.sections.includes(patch.section)
                ? [...exam.sections, patch.section]
                : exam.sections,
            questions: exam.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
          },
        });
      },

      deleteQuestion: (id) => {
        const exam = get().exam;
        if (!exam) return;
        set({ exam: { ...exam, questions: exam.questions.filter((q) => q.id !== id) } });
      },

      addQuestion: (section) => {
        const exam = get().exam;
        if (!exam) return;
        const options = ["A", "B", "C", "D"].map((id) => ({ id, text: "" }));
        set({
          exam: {
            ...exam,
            questions: [
              ...exam.questions,
              {
                id: newId(),
                section: section ?? exam.sections[0] ?? UNCATEGORIZED,
                question: "",
                options,
                correctAnswer: null,
                answerSource: "unavailable",
                explanation: "",
                confidenceScore: 1,
                sourcePage: null,
              },
            ],
          },
        });
      },

      duplicateQuestion: (id) => {
        const exam = get().exam;
        if (!exam) return;
        const index = exam.questions.findIndex((q) => q.id === id);
        if (index < 0) return;
        const copy: ExtractedQuestion = { ...exam.questions[index]!, id: newId() };
        const questions = [...exam.questions];
        questions.splice(index + 1, 0, copy);
        set({ exam: { ...exam, questions } });
      },

      moveQuestion: (id, direction) => {
        const exam = get().exam;
        if (!exam) return;
        const questions = [...exam.questions];
        const index = questions.findIndex((q) => q.id === id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= questions.length) return;
        const a = questions[index]!;
        questions[index] = questions[target]!;
        questions[target] = a;
        set({ exam: { ...exam, questions } });
      },

      mergeQuestions: (ids) => {
        const exam = get().exam;
        if (!exam || ids.length < 2) return;
        const picked = exam.questions.filter((q) => ids.includes(q.id));
        if (picked.length < 2) return;
        const first = picked[0]!;
        const merged: ExtractedQuestion = {
          ...first,
          question: picked.map((q) => q.question).join("\n\n"),
          explanation: picked
            .map((q) => q.explanation)
            .filter(Boolean)
            .join("\n\n"),
          confidenceScore: Math.min(...picked.map((q) => q.confidenceScore)),
        };
        const questions = exam.questions
          .filter((q) => !ids.includes(q.id) || q.id === first.id)
          .map((q) => (q.id === first.id ? merged : q));
        set({ exam: { ...exam, questions } });
      },

      splitQuestion: (id) => {
        const exam = get().exam;
        if (!exam) return;
        const index = exam.questions.findIndex((q) => q.id === id);
        if (index < 0) return;
        const source = exam.questions[index]!;
        const parts = source.question
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length < 2) return;
        const split = parts.map((part, i) => ({
          ...source,
          id: i === 0 ? source.id : newId(),
          question: part,
        }));
        const questions = [...exam.questions];
        questions.splice(index, 1, ...split);
        set({ exam: { ...exam, questions } });
      },

      renameSection: (from, to) => {
        const exam = get().exam;
        const name = to.trim();
        if (!exam || !name) return;
        set({
          exam: {
            ...exam,
            sections: Array.from(new Set(exam.sections.map((s) => (s === from ? name : s)))),
            questions: exam.questions.map((q) =>
              q.section === from ? { ...q, section: name } : q,
            ),
          },
        });
      },

      reset: () =>
        set({
          stage: "idle",
          note: "",
          progress: 0,
          error: null,
          document: null,
          papers: [],
          selectedPaperId: null,
          exam: null,
        }),
    }),
    {
      name: "amtg-extraction",
      // Only the reviewable exam survives reloads; parsed page text stays in memory.
      partialize: (state) => ({ exam: state.exam }),
    },
  ),
);
