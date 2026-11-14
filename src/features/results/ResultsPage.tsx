import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextPanel } from "@/components/media/ContextPanel";
import { MediaList } from "@/components/media/MediaBlock";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateAttemptResult, type ReviewStatus } from "@/lib/result-scoring";
import { useAttemptStore } from "@/store/attemptStore";
import type { ResultFilter } from "@/types";

const STATUS: Record<
  ReviewStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  correct: {
    label: "Correct",
    className: "border-accent/40 bg-accent/15 text-accent-foreground",
    icon: CheckCircle2,
  },
  incorrect: {
    label: "Incorrect",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  unattempted: {
    label: "Unattempted",
    className: "border-border bg-muted text-muted-foreground",
    icon: MinusCircle,
  },
  ungraded: {
    label: "Answer unavailable",
    className: "border-border bg-muted text-muted-foreground",
    icon: CircleHelp,
  },
};

const FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All Questions" },
  { value: "correct", label: "Correct" },
  { value: "incorrect", label: "Incorrect" },
  { value: "unattempted", label: "Unattempted" },
  { value: "ungraded", label: "Answer unavailable" },
];

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0
      ? `${minutes}m ${remainder}s`
      : `${remainder}s`;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const item = STATUS[status];
  const Icon = item.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${item.className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {item.label}
    </span>
  );
}

function calculateAttemptTiming(
  attempt: NonNullable<ReturnType<typeof useAttemptStore.getState>["attempt"]>,
  exam: NonNullable<ReturnType<typeof useAttemptStore.getState>["exam"]>,
) {
  const sectionTimes = exam.sections.flatMap((section) => {
    const timing = attempt.sectionTiming[section.id];
    if (timing?.startedAt == null || timing.completedAt == null) return [];
    const elapsed = Math.max(0, Math.floor((timing.completedAt - timing.startedAt) / 1000));
    return [
      {
        sectionId: section.id,
        name: section.name,
        elapsed,
        allotted: section.durationMinutes * 60,
      },
    ];
  });
  if (sectionTimes.length === 0 && (attempt.mode !== "practice" || !attempt.completedAt)) {
    return null;
  }
  const actualSeconds =
    attempt.mode === "practice" && attempt.completedAt
      ? sectionTimes.length > 0
        ? sectionTimes.reduce((sum, section) => sum + section.elapsed, 0)
        : Math.max(0, Math.floor((attempt.completedAt - attempt.startedAt) / 1000))
      : sectionTimes.reduce((sum, section) => sum + section.elapsed, 0);
  const allottedSeconds = exam.sections.reduce(
    (sum, section) => sum + section.durationMinutes * 60,
    0,
  );
  return { sectionTimes, actualSeconds, allottedSeconds };
}

export function ResultsPage() {
  const currentExam = useAttemptStore((state) => state.exam);
  const currentAttempt = useAttemptStore((state) => state.attempt);
  const latestCompleted = useAttemptStore((state) => state.latestCompleted);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<ResultFilter>("all");
  useEffect(() => setMounted(true), []);
  const completed =
    currentAttempt?.status === "completed" && currentExam
      ? { exam: currentExam, attempt: currentAttempt }
      : latestCompleted;
  const exam = completed?.exam ?? null;
  const attempt = completed?.attempt ?? null;
  const result = useMemo(
    () => (exam && attempt ? calculateAttemptResult(exam, attempt) : null),
    [exam, attempt],
  );
  const timing = useMemo(
    () => (exam && attempt ? calculateAttemptTiming(attempt, exam) : null),
    [exam, attempt],
  );

  if (!mounted) {
    return (
      <div
        className="surface-card mx-auto h-48 max-w-2xl animate-pulse"
        aria-label="Loading saved result"
      />
    );
  }

  if (!exam || !attempt || !result) {
    return (
      <div className="surface-card mx-auto max-w-2xl p-8 text-center sm:p-12">
        <BookOpenCheck className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 font-display text-xl font-semibold">No completed result yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Complete a mock test or practice set to see its score and question-by-question analysis
          here.
        </p>
        <Button asChild className="mt-6">
          <Link to="/mock-test">Go to exam</Link>
        </Button>
      </div>
    );
  }

  const counts: Record<ResultFilter, number> = {
    all: result.totalQuestions,
    correct: result.correct,
    incorrect: result.incorrect,
    unattempted: result.unattempted,
    ungraded: result.ungraded,
  };
  const questions = result.questions.filter((item) => filter === "all" || item.status === filter);

  const scrollToQuestion = (questionId: string) => {
    const element = document.getElementById(`result-question-${questionId}`);
    if (element instanceof HTMLDetailsElement) element.open = true;
    element?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="space-y-8">
      <section
        aria-label="Result summary"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="grid gap-6 border-b border-border p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {attempt.mode === "practice" ? "Practice Set" : "Mock Test"} · completed
            </p>
            <h2 className="mt-2 break-words font-display text-2xl font-semibold">{exam.name}</h2>
            {attempt.completedAt ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted {new Date(attempt.completedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="min-w-48 border-l-2 border-primary pl-5 sm:text-right">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">
              {formatNumber(result.score)}{" "}
              <span className="text-muted-foreground">/ {formatNumber(result.maximumMarks)}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: "Questions", value: result.totalQuestions },
            { label: "Attempted", value: result.attempted },
            { label: "Correct", value: result.correct },
            { label: "Incorrect", value: result.incorrect },
            { label: "Unattempted", value: result.unattempted },
            { label: "Answer unavailable", value: result.ungraded },
            { label: "Accuracy", value: `${result.accuracy.toFixed(1)}%` },
            {
              label: "Marking",
              value: exam.enableNegativeMarking
                ? `−${formatNumber(exam.negativeMarks)} penalty`
                : "No penalty",
            },
          ].map((item) => (
            <div key={item.label} className="min-w-0 px-4 py-4 sm:px-6">
              <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {timing ? (
        <section aria-labelledby="timing-title" className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="timing-title" className="font-display text-lg font-semibold">
              Timing
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {attempt.mode === "practice" ? "Time taken" : "Time used"}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatDuration(timing.actualSeconds)}
              </p>
              {attempt.mode === "mock" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  of {formatDuration(timing.allottedSeconds)} allotted
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Time by section</p>
              <ul className="mt-2 space-y-1.5">
                {timing.sectionTimes.map((section) => (
                  <li key={section.sectionId} className="flex justify-between gap-3 text-sm">
                    <span className="truncate">{section.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatDuration(section.elapsed)}
                      {attempt.mode === "mock" ? ` / ${formatDuration(section.allotted)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {result.sections.length > 1 ? (
        <section aria-labelledby="section-scores-title" className="space-y-3">
          <h2 id="section-scores-title" className="font-display text-lg font-semibold">
            Section scores
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Correct</th>
                  <th className="px-4 py-3 font-medium">Incorrect</th>
                  <th className="px-4 py-3 font-medium">Unattempted</th>
                  <th className="px-4 py-3 font-medium">Ungraded</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.sections.map((section) => (
                  <tr key={section.id}>
                    <th className="px-4 py-3 font-medium">{section.name}</th>
                    <td className="px-4 py-3 tabular-nums">{section.correct}</td>
                    <td className="px-4 py-3 tabular-nums">{section.incorrect}</td>
                    <td className="px-4 py-3 tabular-nums">{section.unattempted}</td>
                    <td className="px-4 py-3 tabular-nums">{section.ungraded}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatNumber(section.score)} / {formatNumber(section.maximumMarks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="question-analysis-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="question-analysis-title" className="font-display text-xl font-semibold">
              Question-wise Analysis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your responses, answers, and marks.
            </p>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            {questions.length} shown
          </span>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as ResultFilter)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            {FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="gap-1.5">
                {item.label}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                  {counts[item.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-3">
            {questions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No questions in this category.
              </p>
            ) : (
              questions.map((item) => {
                const { question } = item;
                const status = STATUS[item.status];
                const StatusIcon = status.icon;
                const contexts = question.contextIds
                  .map((id) => exam.contexts[id])
                  .filter((context): context is NonNullable<typeof context> => Boolean(context));
                const snapshotMedia = question.visualSnapshot?.assets ?? [];
                const questionMedia = [...question.media, ...snapshotMedia].filter(
                  (media, index, list) =>
                    list.findIndex((candidate) => candidate.id === media.id) === index,
                );
                return (
                  <details
                    key={item.questionId}
                    id={`result-question-${item.questionId}`}
                    className="group scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-md border ${status.className}`}
                      >
                        <StatusIcon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">
                          Question {item.questionNumber} · {item.sectionName}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm font-medium">
                          {question.text || "Image-based question"}
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                      <span className="min-w-20 text-right text-sm font-semibold tabular-nums">
                        {formatNumber(item.marksAwarded)}{" "}
                        <span className="text-muted-foreground">
                          / {formatNumber(item.maximumMarks)}
                        </span>
                      </span>
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="space-y-5 border-t border-border px-4 pb-5 pt-4 sm:px-5">
                      <ContextPanel contexts={contexts} />
                      {question.text ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {question.text}
                        </p>
                      ) : null}
                      <MediaList media={questionMedia} maxHeight={360} />
                      {question.visualSnapshot?.warning ? (
                        <p className="text-xs text-muted-foreground">
                          {question.visualSnapshot.warning}
                        </p>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-2">
                        {question.options.map((option) => {
                          const selected = item.selectedAnswer === option.id;
                          const isCorrect = item.correctAnswers.includes(option.id);
                          const optionState = isCorrect
                            ? "border-accent/50 bg-accent/10"
                            : selected && item.status === "incorrect"
                              ? "border-destructive/40 bg-destructive/10"
                              : "border-border bg-background";
                          return (
                            <div
                              key={option.id}
                              className={`min-w-0 rounded-md border p-3 ${optionState}`}
                            >
                              <div className="flex items-start gap-2 text-sm">
                                <span className="shrink-0 font-semibold">
                                  {option.label || option.id}.
                                </span>
                                <span className="min-w-0 flex-1 whitespace-pre-wrap">
                                  {option.text || "Image option"}
                                </span>
                                {selected ? (
                                  <span className="shrink-0 text-xs font-semibold">
                                    Your answer
                                  </span>
                                ) : null}
                                {isCorrect ? (
                                  <span className="shrink-0 text-xs font-semibold text-accent-foreground">
                                    Correct
                                  </span>
                                ) : null}
                              </div>
                              <MediaList media={option.media} className="mt-2" maxHeight={220} />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                        <div className="space-y-1">
                          <p>
                            Your answer:{" "}
                            <span
                              className={`font-semibold ${
                                item.status === "incorrect"
                                  ? "text-destructive"
                                  : item.status === "correct"
                                    ? "text-accent-foreground"
                                    : ""
                              }`}
                            >
                              {item.selectedAnswer === null
                                ? "Unattempted"
                                : question.options.find(
                                    (option) => option.id === item.selectedAnswer,
                                  )?.text || item.selectedAnswer}
                            </span>
                          </p>
                          {item.correctAnswers.length > 0 ? (
                            <p>
                              <span className="font-semibold text-accent-foreground">
                                {item.correctAnswers
                                  .map(
                                    (id) =>
                                      question.options.find((option) => option.id === id)?.text ||
                                      id,
                                  )
                                  .join(", ")}
                              </span>
                            </p>
                          ) : (
                            <p className="text-muted-foreground">Correct answer unavailable.</p>
                          )}
                        </div>
                        <p className="font-semibold tabular-nums">
                          Marks: {formatNumber(item.marksAwarded)}
                        </p>
                      </div>
                      {question.explanation ? (
                        <div className="rounded-md bg-muted/60 p-3 text-sm">
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                            Explanation
                          </p>
                          <p className="whitespace-pre-wrap">{question.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  </details>
                );
              })
            )}
          </div>

          <aside aria-label="Question navigation" className="lg:sticky lg:top-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Questions</h3>
              <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
                {result.questions.map((item) => {
                  const status = STATUS[item.status];
                  return (
                    <Button
                      key={item.questionId}
                      variant="outline"
                      size="icon"
                      className={`size-8 text-xs tabular-nums ${status.className}`}
                      aria-label={`Go to question ${item.questionNumber}: ${status.label}`}
                      title={`Question ${item.questionNumber}: ${status.label}`}
                      onClick={() => {
                        setFilter("all");
                        window.requestAnimationFrame(() => scrollToQuestion(item.questionId));
                      }}
                    >
                      {item.questionNumber}
                    </Button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                {(
                  [
                    ["correct", result.correct],
                    ["incorrect", result.incorrect],
                    ["unattempted", result.unattempted],
                    ["ungraded", result.ungraded],
                  ] as const
                ).map(([key, count]) => {
                  const item = STATUS[key];
                  const Icon = item.icon;
                  return (
                    <p key={key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="size-3.5" />
                        {item.label}
                      </span>
                      <span className="tabular-nums">{count}</span>
                    </p>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
        <Button asChild>
          <Link to="/mock-test">Return to exam</Link>
        </Button>
      </div>
    </div>
  );
}
