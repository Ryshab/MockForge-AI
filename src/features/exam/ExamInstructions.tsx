import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, ListChecks, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAttemptExam } from "@/lib/exam-build";
import { useExamStore } from "@/store/examStore";
import { useExtractionStore } from "@/store/extractionStore";
import { useAttemptStore } from "@/store/attemptStore";

export function ExamInstructions({ onStart }: { onStart: () => void }) {
  const extracted = useExtractionStore((s) => s.exam);
  const configuration = useExamStore((s) => s.configuration);
  const configSections = useExamStore((s) => s.sections);
  const createAttempt = useAttemptStore((s) => s.createAttempt);

  if (!extracted || extracted.questions.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <h2 className="font-display text-lg font-semibold">No exam ready yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Upload a question paper and review the extracted questions first — the CBT engine runs on
          that validated exam.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/upload">Upload a PDF</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/review">Go to review</Link>
          </Button>
        </div>
      </div>
    );
  }

  let preview;
  try {
    preview = buildAttemptExam(extracted, configuration, configSections);
  } catch (error) {
    return (
      <div className="surface-card p-8 text-center">
        <h2 className="font-display text-lg font-semibold">This exam can't be started</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "The exam data is invalid."}
        </p>
      </div>
    );
  }

  const totalQuestions = preview.sections.reduce((n, s) => n + s.questionIds.length, 0);
  const totalMinutes = preview.sections.reduce((n, s) => n + s.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <h2 className="font-display text-xl font-semibold">{preview.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read the instructions carefully. The timer starts only when you press Start Test.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Sections", value: String(preview.sections.length) },
            { label: "Total questions", value: String(totalQuestions) },
            { label: "Total marks", value: String(preview.totalMarks) },
            { label: "Total duration", value: `${totalMinutes} min` },
            { label: "Marks per question", value: String(preview.marksPerQuestion) },
            {
              label: "Negative marking",
              value: preview.enableNegativeMarking ? `−${preview.negativeMarks}` : "None",
            },
            {
              label: "Question shuffling",
              value: configuration.shuffleQuestions ? "On" : "Off",
            },
            { label: "Option shuffling", value: configuration.shuffleOptions ? "On" : "Off" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-secondary/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface-card p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ListChecks className="size-5" /> Section plan
        </h3>
        <ul className="mt-4 divide-y divide-border">
          {preview.sections.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium">
                {i + 1}. {s.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {s.questionIds.length} questions ·{" "}
                <Clock className="inline size-3.5 align-[-2px]" /> {s.durationMinutes} min
              </span>
            </li>
          ))}
        </ul>
      </section>

      {configuration.strictSectionMode ? (
        <div className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold">Strict section mode is on.</p>
            <p className="text-muted-foreground">
              Once a section is completed you cannot return to it, and you cannot jump ahead to a
              future section.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          onClick={() => {
            createAttempt(extracted, configuration, configSections);
            onStart();
          }}
        >
          <Play className="size-4" /> Start Test
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/configure">Change configuration</Link>
        </Button>
      </div>
    </div>
  );
}
