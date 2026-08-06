import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";

const defaults: AppSettings = {
  defaultMarksPerQuestion: 2,
  defaultNegativeMarks: 0.5,
  autoSaveProgress: true,
  compactMode: false,
  soundAlerts: false,
};

interface SettingsState extends AppSettings {
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: "amtg-settings" },
  ),
);
