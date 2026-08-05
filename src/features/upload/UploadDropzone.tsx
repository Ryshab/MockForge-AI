import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePdfStore } from "@/store/pdfStore";
import { pdfParser } from "@/services/pdfParser";
import { formatBytes, validatePdfFile } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export function UploadDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { metadata, status, progress, error, setStatus, setProgress, setMetadata, setError, reset } =
    usePdfStore();

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validatePdfFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }

      reset();
      setStatus("reading");
      setProgress(5);
      try {
        const { metadata: meta } = await pdfParser.parse(file, setProgress);
        setMetadata(meta);
        toast.success(`Read ${meta.pageCount} page${meta.pageCount === 1 ? "" : "s"} from ${meta.fileName}`);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "We couldn't read that PDF. Please try another file.";
        setError(message);
        toast.error("Couldn't read that PDF", { description: message });
      }
    },
    [reset, setError, setMetadata, setProgress, setStatus],
  );

  const busy = status === "reading";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
            {busy ? "Reading your PDF…" : "Drop your MCQ PDF here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse — PDF only, up to 100 MB
          </p>
        </div>
        {busy ? (
          <div className="w-full max-w-sm">
            <Progress value={progress} aria-label="PDF reading progress" />
            <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
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
              <Button onClick={() => navigate({ to: "/configure" })}>Configure exam</Button>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="size-4" /> Replace
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Upload a paper to see its page count and metadata. Question extraction with AI arrives in
            a later release.
          </p>
        )}
      </aside>
    </div>
  );
}
