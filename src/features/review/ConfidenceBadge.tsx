import { confidencePercent, confidenceTone } from "@/lib/extraction-schema";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ score }: { score: number }) {
  const tone = confidenceTone(score);
  const percent = confidencePercent(score);
  return (
    <span
      title={`Extraction confidence: ${percent}% (reliability of the extraction, not proof the answer is correct)`}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone === "high" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        tone === "medium" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        tone === "low" && "bg-destructive/15 text-destructive",
      )}
    >
      {percent}%
    </span>
  );
}

export function AnswerSourceBadge({
  source,
}: {
  source: "answer-key" | "inferred" | "unavailable";
}) {
  const label =
    source === "answer-key"
      ? "Answer key"
      : source === "inferred"
        ? "Inferred"
        : "No verified answer";
  return (
    <span
      title={
        source === "answer-key"
          ? "Taken from the paper's answer key"
          : source === "inferred"
            ? "Derived from the question — not from an answer key"
            : "The correct answer could not be determined from the PDF"
      }
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        source === "answer-key" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        source === "inferred" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        source === "unavailable" && "bg-destructive/15 text-destructive",
      )}
    >
      {label}
    </span>
  );
}
