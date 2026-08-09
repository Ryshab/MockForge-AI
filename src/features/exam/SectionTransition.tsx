import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttemptSection } from "@/types";

export function SectionTransition({
  previous,
  next,
  onStart,
}: {
  previous: AttemptSection | null;
  next: AttemptSection;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg surface-card p-8 text-center">
      {previous ? (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" /> {previous.name} completed
        </p>
      ) : null}
      <h2 className="mt-3 font-display text-2xl font-semibold">Next section: {next.name}</h2>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-4" /> Time allotted: {next.durationMinutes} minutes ·{" "}
        {next.questionIds.length} questions
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        The section timer starts the moment you press Start Section.
      </p>
      <Button size="lg" className="mt-6" onClick={onStart}>
        Start Section <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
