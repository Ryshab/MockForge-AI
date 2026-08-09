import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAttemptStore } from "@/store/attemptStore";

export function ExamCompleted() {
  const discardAttempt = useAttemptStore((s) => s.discardAttempt);
  return (
    <div className="mx-auto max-w-lg surface-card p-10 text-center">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h2 className="mt-4 font-display text-2xl font-semibold">Exam Completed</h2>
      <p className="mt-2 text-sm text-muted-foreground">Your responses have been recorded.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/results">View Results</Link>
        </Button>
        <Button variant="ghost" onClick={discardAttempt}>
          Start a new attempt
        </Button>
      </div>
    </div>
  );
}
