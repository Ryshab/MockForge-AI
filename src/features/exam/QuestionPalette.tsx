import { cn } from "@/lib/utils";
import type { AnswerStatus } from "@/types";

const statusStyles: Record<AnswerStatus, string> = {
  unanswered: "bg-secondary text-foreground border-border",
  visited: "bg-destructive/85 text-white border-transparent",
  answered: "bg-emerald-600 text-white border-transparent",
  marked: "bg-violet-600 text-white border-transparent",
  "answered-marked": "bg-violet-600 text-white border-transparent ring-2 ring-emerald-400",
};

const legend: { status: AnswerStatus; label: string }[] = [
  { status: "unanswered", label: "Not visited" },
  { status: "answered", label: "Answered" },
  { status: "visited", label: "Not answered" },
  { status: "marked", label: "Marked for review" },
  { status: "answered-marked", label: "Answered & marked" },
];

export function QuestionPalette({
  questionIds,
  statuses,
  currentIndex,
  onSelect,
}: {
  questionIds: string[];
  statuses: Record<string, AnswerStatus>;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-5">
        {questionIds.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === currentIndex}
            aria-label={`Question ${i + 1}`}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition",
              statusStyles[statuses[id] ?? "unanswered"],
              i === currentIndex && "outline-2 outline-offset-2 outline-primary",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {legend.map((l) => (
          <li key={l.status} className="flex items-center gap-2">
            <span className={cn("size-3.5 rounded border", statusStyles[l.status])} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
