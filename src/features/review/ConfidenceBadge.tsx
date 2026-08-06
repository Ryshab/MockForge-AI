import { confidenceTone } from "@/lib/extraction-schema";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ score }: { score: number }) {
  const tone = confidenceTone(score);
  return (
    <span
      title={`Extraction confidence: ${score}%`}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone === "high" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        tone === "medium" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        tone === "low" && "bg-destructive/15 text-destructive",
      )}
    >
      {score}%
    </span>
  );
}