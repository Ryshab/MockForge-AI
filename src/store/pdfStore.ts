import { create } from "zustand";
import type { PDFMetadata } from "@/types";

export type PdfStatus = "idle" | "reading" | "ready" | "error";

interface PdfState {
  metadata: PDFMetadata | null;
  status: PdfStatus;
  progress: number;
  error: string | null;
  setStatus: (status: PdfStatus) => void;
  setProgress: (progress: number) => void;
  setMetadata: (metadata: PDFMetadata) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePdfStore = create<PdfState>()((set) => ({
  metadata: null,
  status: "idle",
  progress: 0,
  error: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setMetadata: (metadata) => set({ metadata, status: "ready", progress: 100, error: null }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  reset: () => set({ metadata: null, status: "idle", progress: 0, error: null }),
}));
