import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExamConfiguration, Section } from "@/types";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const defaultConfiguration: ExamConfiguration = {
  examName: "Untitled Mock Test",
  totalMarks: 200,
  marksPerQuestion: 2,
  negativeMarks: 0.5,
  enableNegativeMarking: true,
  enableSectionTimers: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  allowReviewMode: true,
  enableFullscreen: true,
  warnBeforeExit: true,
};

const defaultSections: Section[] = [
  { id: createId(), name: "Reasoning", questionCount: 25, durationMinutes: 20, order: 0 },
  { id: createId(), name: "English", questionCount: 25, durationMinutes: 15, order: 1 },
  { id: createId(), name: "General Awareness", questionCount: 25, durationMinutes: 10, order: 2 },
  { id: createId(), name: "Quant", questionCount: 25, durationMinutes: 35, order: 3 },
];

interface ExamState {
  configuration: ExamConfiguration;
  sections: Section[];
  setConfiguration: (config: Partial<ExamConfiguration>) => void;
  addSection: (name?: string) => void;
  updateSection: (id: string, patch: Partial<Omit<Section, "id">>) => void;
  removeSection: (id: string) => void;
  moveSection: (id: string, direction: "up" | "down") => void;
  resetExam: () => void;
}

const reindex = (sections: Section[]) => sections.map((s, i) => ({ ...s, order: i }));

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      configuration: defaultConfiguration,
      sections: defaultSections,
      setConfiguration: (config) =>
        set({ configuration: { ...get().configuration, ...config } }),
      addSection: (name) =>
        set({
          sections: reindex([
            ...get().sections,
            {
              id: createId(),
              name: name?.trim() || `Section ${get().sections.length + 1}`,
              questionCount: 25,
              durationMinutes: 20,
              order: get().sections.length,
            },
          ]),
        }),
      updateSection: (id, patch) =>
        set({
          sections: get().sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }),
      removeSection: (id) =>
        set({ sections: reindex(get().sections.filter((s) => s.id !== id)) }),
      moveSection: (id, direction) => {
        const sections = [...get().sections];
        const index = sections.findIndex((s) => s.id === id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= sections.length) return;
        const a = sections[index]!;
        const b = sections[target]!;
        sections[index] = b;
        sections[target] = a;
        set({ sections: reindex(sections) });
      },
      resetExam: () =>
        set({ configuration: defaultConfiguration, sections: reindex(defaultSections) }),
    }),
    { name: "amtg-exam" },
  ),
);

export const selectTotals = (sections: Section[]) => ({
  totalQuestions: sections.reduce((sum, s) => sum + (s.questionCount || 0), 0),
  totalMinutes: sections.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
});