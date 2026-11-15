import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formatById, type ExamFormat, type FormatSection } from "@/lib/exam-formats";

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface FormatState {
  custom: ExamFormat[];
  add: (format: ExamFormat) => void;
  update: (format: ExamFormat) => void;
  remove: (id: string) => void;
  duplicate: (id: string, custom: readonly ExamFormat[]) => ExamFormat | null;
}

export const useFormatStore = create<FormatState>()(
  persist(
    (set, get) => ({
      custom: [],
      add: (format) => set({ custom: [...get().custom, format] }),
      update: (format) =>
        set({ custom: get().custom.map((f) => (f.id === format.id ? format : f)) }),
      remove: (id) => set({ custom: get().custom.filter((f) => f.id !== id) }),
      duplicate: (id, custom) => {
        const source =
          OFFICIAL_BY_LOOKUP(id, custom);
        if (!source) return null;
        const copy: ExamFormat = {
          ...structuredClone(source),
          id: `custom-${rid().slice(0, 8)}`,
          official: false,
          name: `${source.name} (copy)`,
        };
        get().add(copy);
        return copy;
      },
    }),
    { name: "amtg-formats", version: 1 },
  ),
);

function OFFICIAL_BY_LOOKUP(id: string, custom: readonly ExamFormat[]): ExamFormat | null {
  return custom.find((f) => f.id === id) ?? null;
}

export function newEmptyFormat(name: string, year: number): ExamFormat {
  return {
    id: `custom-${rid().slice(0, 8)}`,
    name,
    tier: "Custom",
    year,
    official: false,
    marksPerQuestion: 1,
    negativeMarks: 0,
    enableNegativeMarking: false,
    sections: [],
  };
}

export function newEmptySection(): FormatSection {
  return {
    name: "New section",
    questionCount: 0,
    durationMinutes: 20,
    subjects: [],
    qualifying: false,
    sharedTimer: true,
    locksOnExpiry: true,
  };
}

export type { ExamFormat, FormatSection };
