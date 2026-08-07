import { useEffect, useMemo, useState } from "react";
import { FileStack, FileText, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { paperDetectionService, type DetectedPaper } from "@/services/paperDetectionService";
import type { PdfDocumentContent } from "@/services/pdfService";
import { cn } from "@/lib/utils";

export type ProcessingMode = "entire" | "detect" | "range";

export type ProcessingSelection =
  | { kind: "entire"; title: string; startPage: number; endPage: number }
  | { kind: "paper"; title: string; startPage: number; endPage: number }
  | { kind: "range"; title: string; startPage: number; endPage: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: PdfDocumentContent | null;
  onConfirm: (selection: ProcessingSelection) => void;
}

const MODES: { value: ProcessingMode; label: string; hint: string; icon: typeof FileText }[] = [
  {
    value: "entire",
    label: "Entire PDF",
    hint: "Best for a normal question paper. Every page is sent for extraction.",
    icon: FileText,
  },
  {
    value: "detect",
    label: "Detect individual papers",
    hint: "For large books with many exams. We scan for shift/paper headings.",
    icon: Layers,
  },
  {
    value: "range",
    label: "Custom page range",
    hint: "Process only the pages you choose.",
    icon: FileStack,
  },
];

export function ProcessingModeDialog({ open, onOpenChange, doc, onConfirm }: Props) {
  const pageCount = doc?.metadata.pageCount ?? 1;
  const baseTitle = useMemo(
    () => doc?.metadata.title?.trim() || doc?.metadata.fileName.replace(/\.pdf$/i, "") || "Paper",
    [doc],
  );

  const [mode, setMode] = useState<ProcessingMode>("entire");
  const [papers, setPapers] = useState<DetectedPaper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState(String(pageCount));

  useEffect(() => {
    if (!open) return;
    setMode("entire");
    setPapers([]);
    setSelectedPaperId(null);
    setStart("1");
    setEnd(String(pageCount));
  }, [open, pageCount]);

  useEffect(() => {
    if (mode !== "detect" || !doc || papers.length) return;
    const detected = paperDetectionService.detect(doc);
    setPapers(detected);
    setSelectedPaperId(detected[0]?.id ?? null);
  }, [doc, mode, papers.length]);

  const startNum = Number.parseInt(start, 10);
  const endNum = Number.parseInt(end, 10);
  const rangeValid =
    Number.isFinite(startNum) &&
    Number.isFinite(endNum) &&
    startNum >= 1 &&
    endNum >= startNum &&
    endNum <= pageCount;

  const canConfirm =
    mode === "entire" || (mode === "detect" ? Boolean(selectedPaperId) : rangeValid);

  const confirm = () => {
    if (!doc) return;
    if (mode === "entire") {
      onConfirm({ kind: "entire", title: baseTitle, startPage: 1, endPage: pageCount });
      return;
    }
    if (mode === "detect") {
      const paper = papers.find((p) => p.id === selectedPaperId);
      if (!paper) return;
      onConfirm({
        kind: "paper",
        title: paper.title,
        startPage: paper.startPage,
        endPage: paper.endPage,
      });
      return;
    }
    onConfirm({
      kind: "range",
      title: `${baseTitle} (pages ${startNum}–${endNum})`,
      startPage: startNum,
      endPage: endNum,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Processing mode</DialogTitle>
          <DialogDescription>
            {doc?.metadata.fileName} · {pageCount} pages. Choose what we send for extraction.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as ProcessingMode)}
          className="gap-3"
        >
          {MODES.map(({ value, label, hint, icon: Icon }) => (
            <div key={value}>
              <Label
                htmlFor={`mode-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  mode === value ? "border-primary bg-secondary/60" : "hover:bg-secondary/40",
                )}
              >
                <RadioGroupItem id={`mode-${value}`} value={value} className="mt-1" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4 text-primary" />
                    {label}
                    {value === "entire" ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {hint}
                  </span>
                </span>
              </Label>

              {value === "detect" && mode === "detect" ? (
                <ul className="mt-2 space-y-2 pl-8">
                  {papers.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      No separate papers found — use Entire PDF instead.
                    </li>
                  ) : (
                    papers.map((paper) => (
                      <li key={paper.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-colors",
                            selectedPaperId === paper.id
                              ? "border-primary bg-secondary/60"
                              : "border-border hover:bg-secondary/40",
                          )}
                        >
                          <input
                            type="radio"
                            name="detected-paper"
                            className="mt-1"
                            checked={selectedPaperId === paper.id}
                            onChange={() => setSelectedPaperId(paper.id)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {paper.title}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Pages {paper.startPage}–{paper.endPage} · {paper.pageCount} pages ·{" "}
                              {paper.charCount.toLocaleString()} characters
                            </span>
                          </span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

              {value === "range" && mode === "range" ? (
                <div className="mt-2 flex items-end gap-3 pl-8">
                  <div className="w-28">
                    <Label htmlFor="range-start" className="text-xs text-muted-foreground">
                      Start page
                    </Label>
                    <Input
                      id="range-start"
                      inputMode="numeric"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <Label htmlFor="range-end" className="text-xs text-muted-foreground">
                      End page
                    </Label>
                    <Input
                      id="range-end"
                      inputMode="numeric"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                  <p
                    className={cn(
                      "pb-2 text-xs",
                      rangeValid ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {rangeValid ? `of ${pageCount} pages` : `Enter 1–${pageCount}`}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canConfirm} onClick={confirm}>
            Extract questions with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
