import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileDown, FileText, Loader2, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePdfStore } from "@/store/pdfStore";
import { useExtractionStore } from "@/store/extractionStore";
import { pdfService } from "@/services/pdfService";
import { paperDetectionService } from "@/services/paperDetectionService";
import { aiExtractionService } from "@/services/aiExtractionService";
import { exportService } from "@/services/exportService";
import { formatBytes, validatePdfFile } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export function UploadDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { metadata, setStatus, setProgress: setPdfProgress, setMetadata, reset: resetPdf } =
    usePdfStore();
  const {
    stage,
    note,
    progress,
    error,
    document: doc,
    papers,
    selectedPaperId,
    setStage,
    setProgress,
    setError,
    setDocument,
    setPapers,
    selectPaper,
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

      resetPdf();
      resetExtraction();
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

        setStage("detecting");
        setProgress(80);
        const detected = paperDetectionService.detect(content);
        setPapers(detected);
        selectPaper(detected[0]?.id ?? null);
        setProgress(100);
        setStage("awaiting-selection");
        toast.success(
          `Found ${detected.length} paper${detected.length === 1 ? "" : "s"} across ${content.metadata.pageCount} pages`,
        );
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
      selectPaper,
      setDocument,
      setError,
      setMetadata,
      setPapers,
      setPdfProgress,
      setProgress,
      setStage,
      setStatus,
    ],
  );

  const busy = stage === "reading" || stage === "extracting-text" || stage === "detecting";
  const extracting = stage === "ai" || stage === "validating";

  const runExtraction = useCallback(async () => {
    const paper = papers.find((p) => p.id === selectedPaperId);
    if (!doc || !paper) return;
    setError(null);
    setStage("ai");
    setProgress(20);
    try {
      const text = paperDetectionService.getPaperText(doc, paper);
      if (!text.trim()) {
        throw new Error(
          "This paper has no readable text — it may be a scanned PDF. OCR support is coming later.",
        );
      }
      const exam = await aiExtractionService.extract(paper.title, text, (s) => {
        setStage(s === "Validating..." ? "validating" : "ai", s);
        setProgress(s === "Validating..." ? 85 : 45);
      });
      setExam(exam);
      setProgress(100);
      setStage("ready");
      toast.success(`Extracted ${exam.questions.length} questions`);
      void navigate({ to: "/review" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Extraction failed.";
      setError(message);
      toast.error("Extraction failed", { description: message });
    }
  }, [doc, navigate, papers, selectedPaperId, setError, setExam, setProgress, setStage]);

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
          {busy ? <Loader2 className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
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

      {papers.length > 0 ? (
        <section className="surface-card p-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Detected papers
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Only the selected paper is sent to AI — never the whole book.
          </p>
          <ul className="mt-4 space-y-2">
            {papers.map((paper) => (
              <li key={paper.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    selectedPaperId === paper.id
                      ? "border-primary bg-secondary/60"
                      : "border-border hover:bg-secondary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="paper"
                    className="mt-1"
                    checked={selectedPaperId === paper.id}
                    onChange={() => selectPaper(paper.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{paper.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      Pages {paper.startPage}–{paper.endPage} · {paper.pageCount} pages ·{" "}
                      {paper.charCount.toLocaleString()} characters
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4"
            disabled={!selectedPaperId || extracting}
            onClick={() => void runExtraction()}
          >
            {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {extracting ? note : "Extract questions with AI"}
          </Button>
        </section>
      ) : null}
      </div>

      <aside className="surface-card p-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Document details
        </h2>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
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
            Upload a paper to see its page count, metadata and the individual papers we detect inside
            it.
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
