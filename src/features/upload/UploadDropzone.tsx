import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileDown, FileText, Loader2, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePdfStore } from "@/store/pdfStore";
import { useExtractionStore } from "@/store/extractionStore";
import { pdfService } from "@/services/pdfService";
import { textPreparationService } from "@/services/textPreparationService";
import { aiExtractionService, type ExtractionStage } from "@/services/aiExtractionService";
import { mediaAttachmentService } from "@/services/mediaAttachmentService";
import { exportService } from "@/services/exportService";
import { formatBytes, validatePdfFile } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { ProcessingModeDialog, type ProcessingSelection } from "./ProcessingModeDialog";

export function UploadDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  /** Kept so referenced visuals can be cropped from the original file later. */
  const sourceFileRef = useRef<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [selection, setSelection] = useState<ProcessingSelection | null>(null);
  const {
    metadata,
    setStatus,
    setProgress: setPdfProgress,
    setMetadata,
    reset: resetPdf,
  } = usePdfStore();
  const {
    stage,
    note,
    progress,
    error,
    document: doc,
    setStage,
    setProgress,
    setError,
    setDocument,
    setExam,
    reset: resetExtraction,
  } = useExtractionStore();

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validatePdfFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }

      sourceFileRef.current = file;
      resetPdf();
      resetExtraction();
      setSelection(null);
      setStatus("reading");
      setStage("reading");
      setProgress(4);
      try {
        const content = await pdfService.read(file, (percent, stageNote) => {
          setProgress(percent, stageNote);
          setPdfProgress(percent);
          if (stageNote === "Extracting text...") setStage("extracting-text", stageNote);
        });
        setDocument(content);
        setMetadata(content.metadata);

        setProgress(100);
        setStage("awaiting-mode");
        setModeOpen(true);
        toast.success(`Read ${content.metadata.pageCount} pages — choose a processing mode`);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "We couldn't read that PDF. Please try another file.";
        setError(message);
        toast.error("Couldn't read that PDF", { description: message });
      }
    },
    [
      resetPdf,
      resetExtraction,
      setDocument,
      setError,
      setMetadata,
      setPdfProgress,
      setProgress,
      setStage,
      setStatus,
    ],
  );

  const busy = stage === "reading" || stage === "extracting-text" || stage === "detecting";
  const extracting =
    stage === "preparing" || stage === "ai" || stage === "matching" || stage === "validating";

  const runExtraction = useCallback(
    async (target: ProcessingSelection) => {
      if (!doc) return;
      setError(null);
      setStage("preparing");
      setProgress(15);
      try {
        // Only the selected pages are ever prepared and sent to the AI.
        const prepared = textPreparationService.prepareRange(doc, target.startPage, target.endPage);
        if (!prepared.text.trim()) {
          throw new Error(
            "These pages have no readable text — the PDF is likely scanned. OCR support is coming later.",
          );
        }
        const stageMap: Record<
          ExtractionStage,
          { stage: "ai" | "matching" | "validating" | "ready"; progress: number }
        > = {
          extracting: { stage: "ai", progress: 40 },
          matching: { stage: "matching", progress: 70 },
          validating: { stage: "validating", progress: 85 },
          repairing: { stage: "ai", progress: 60 },
          preparing: { stage: "ai", progress: 20 },
          ready: { stage: "ready", progress: 100 },
        };
        const extracted = await aiExtractionService.extract(target.title, prepared.text, (s) => {
          const mapped = stageMap[s];
          setStage(mapped.stage, s === "repairing" ? "Repairing AI response..." : undefined);
          setProgress(mapped.progress);
        });

        // Crop the referenced regions out of the ORIGINAL PDF — nothing is redrawn.
        setStage("validating", "Preserving diagrams and tables...");
        setProgress(92);
        const exam = await mediaAttachmentService.attach(
          extracted,
          doc,
          sourceFileRef.current,
          (mediaNote: string) => setProgress(95, mediaNote),
        );
        setExam(exam);
        setProgress(100);
        setStage("ready");
        const unverified = exam.questions.filter((q) => !q.correctAnswer).length;
        toast.success(`Extracted ${exam.questions.length} questions`, {
          description: unverified
            ? `${unverified} have no verified answer — review them.`
            : undefined,
        });
        void navigate({ to: "/review" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Extraction failed.";
        setError(message);
        toast.error("Extraction failed", { description: message });
      }
    },
    [doc, navigate, setError, setExam, setProgress, setStage],
  );

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const exam = await exportService.importFile(file);
        resetExtraction();
        setExam(exam);
        setStage("ready");
        toast.success(`Imported ${exam.questions.length} questions`);
        void navigate({ to: "/review" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Import failed.";
        toast.error("Couldn't import that file", { description: message });
      }
    },
    [navigate, resetExtraction, setExam, setStage],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF question paper"
          aria-busy={busy}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "surface-card flex cursor-pointer flex-col items-center justify-center gap-4 border-dashed px-6 py-16 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            dragging ? "border-primary bg-secondary/60 scale-[1.01]" : "hover:border-primary/60",
          )}
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-hero text-primary-foreground">
            {busy ? (
              <Loader2 className="size-7 animate-spin" />
            ) : (
              <UploadCloud className="size-7" />
            )}
          </span>
          <div>
            <p className="font-display text-lg font-semibold">
              {busy ? note : "Drop your MCQ PDF here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse — PDF only, up to 100 MB
            </p>
          </div>
          {busy || extracting ? (
            <div className="w-full max-w-sm">
              <Progress value={progress} aria-label="PDF reading progress" />
              <p className="mt-2 text-xs text-muted-foreground">
                {note} {progress}%
              </p>
            </div>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {doc ? (
          <section className="surface-card p-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Processing mode
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You choose what gets sent to AI — nothing is split automatically.
            </p>
            <div className="mt-4 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">
                {selection
                  ? selection.kind === "entire"
                    ? "Entire PDF"
                    : selection.kind === "paper"
                      ? `Detected paper — ${selection.title}`
                      : "Custom page range"
                  : "Not chosen yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selection
                  ? `Pages ${selection.startPage}–${selection.endPage} of ${doc.metadata.pageCount}`
                  : `${doc.metadata.pageCount} pages read and ready`}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" disabled={extracting} onClick={() => setModeOpen(true)}>
                {selection ? "Change mode" : "Choose processing mode"}
              </Button>
              {selection ? (
                <Button disabled={extracting} onClick={() => void runExtraction(selection)}>
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {extracting ? note : "Extract questions with AI"}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <ProcessingModeDialog
          open={modeOpen}
          onOpenChange={setModeOpen}
          doc={doc}
          onConfirm={(next) => {
            setSelection(next);
            setModeOpen(false);
            void runExtraction(next);
          }}
        />
      </div>

      <aside className="surface-card p-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Document details
        </h2>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {metadata ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{metadata.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(metadata.fileSize)}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Pages</dt>
                <dd className="font-medium">{metadata.pageCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="min-w-0 truncate font-medium">{metadata.title ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Author</dt>
                <dd className="min-w-0 truncate font-medium">{metadata.author ?? "—"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/configure" })}>
                Configure exam
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  resetPdf();
                  resetExtraction();
                }}
              >
                <RotateCcw className="size-4" /> Replace
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Upload a paper to see its page count, metadata and the individual papers we detect
            inside it.
          </p>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-sm font-semibold">Already have a JSON?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Import a previously exported exam to skip AI and jump straight to review.
          </p>
          <Button variant="outline" className="mt-3" onClick={() => jsonInputRef.current?.click()}>
            <FileDown className="size-4" /> Import exam JSON
          </Button>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </aside>
    </div>
  );
}
