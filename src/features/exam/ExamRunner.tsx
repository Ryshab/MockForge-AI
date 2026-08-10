import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Eraser, Flag, LayoutGrid, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { MediaList } from "@/components/media/MediaBlock";
import { ContextPanel } from "@/components/media/ContextPanel";
import { useSectionTimer } from "@/hooks/useSectionTimer";
import { useExamAttempt } from "@/hooks/useExamAttempt";
import { useAttemptStore } from "@/store/attemptStore";
import { ExamInstructions } from "./ExamInstructions";
import { SectionTransition } from "./SectionTransition";
import { QuestionPalette } from "./QuestionPalette";
import { ExamCompleted } from "./ExamCompleted";

function requestFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    void el.requestFullscreen().catch(() => undefined);
  }
}

export function ExamRunner() {
  const { exam, attempt, valid, section, questionIds, question, timing } = useExamAttempt();
  const startSection = useAttemptStore((s) => s.startSection);
  const selectOption = useAttemptStore((s) => s.selectOption);
  const clearResponse = useAttemptStore((s) => s.clearResponse);
  const toggleMarkForReview = useAttemptStore((s) => s.toggleMarkForReview);
  const goToQuestion = useAttemptStore((s) => s.goToQuestion);
  const completeSection = useAttemptStore((s) => s.completeSection);
  const discardAttempt = useAttemptStore((s) => s.discardAttempt);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const running =
    Boolean(attempt && section && timing?.startedAt && !timing?.completedAt) &&
    attempt!.status === "in-progress";

  const onExpire = useCallback(() => {
    setConfirmOpen(false);
    completeSection();
    toast.warning("Time is up — the section was submitted automatically.");
  }, [completeSection]);

  const { label, tone } = useSectionTimer(running ? (timing?.endsAt ?? null) : null, onExpire);

  const settings = attempt?.settings;
  const inProgress = attempt?.status === "in-progress";
  const shouldAutoStart =
    Boolean(settings?.autoStartNextSection) &&
    inProgress &&
    Boolean(section) &&
    !timing?.startedAt &&
    (attempt?.currentSectionIndex ?? 0) > 0;

  useEffect(() => {
    if (!shouldAutoStart) return;
    startSection();
    if (settings?.enableFullscreen) requestFullscreen();
  }, [shouldAutoStart, startSection, settings?.enableFullscreen]);

  useEffect(() => {
    if (!inProgress || !settings?.warnBeforeExit) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [inProgress, settings?.warnBeforeExit]);

  useEffect(() => {
    if (!running || !settings?.enableFullscreen) return;
    const onChange = () => {
      if (!document.fullscreenElement) {
        toast.warning("You left fullscreen. Fullscreen is an exam-environment feature only.");
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [running, settings?.enableFullscreen]);

  // Attempt exists in storage but is unusable.
  if (attempt && !valid) {
    return (
      <div className="mx-auto max-w-lg surface-card p-8 text-center">
        <h2 className="font-display text-lg font-semibold">Saved attempt couldn't be restored</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The stored attempt is incomplete or out of sync with the exam. Nothing else was changed —
          your extracted questions are safe.
        </p>
        <Button className="mt-6" onClick={discardAttempt}>
          Restart the attempt
        </Button>
      </div>
    );
  }

  if (!attempt || !exam || !section) {
    return <ExamInstructions onStart={() => undefined} />;
  }

  if (attempt.status === "completed") return <ExamCompleted />;

  const sectionStarted = Boolean(timing?.startedAt && !timing?.completedAt);

  if (!sectionStarted) {
    const previous =
      attempt.currentSectionIndex > 0 ? exam.sections[attempt.currentSectionIndex - 1]! : null;
    const start = () => {
      startSection();
      if (settings?.enableFullscreen) requestFullscreen();
    };
    if (shouldAutoStart) return null;
    return <SectionTransition previous={previous} next={section} onStart={start} />;
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-lg surface-card p-8 text-center">
        <h2 className="font-display text-lg font-semibold">Question unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This question couldn't be loaded. You can submit the section and continue.
        </p>
        <Button className="mt-6" onClick={completeSection}>
          Submit section
        </Button>
      </div>
    );
  }

  const answered = questionIds.filter((id) => attempt.answers[id]).length;
  const marked = questionIds.filter((id) => attempt.markedForReview.includes(id)).length;
  const unanswered = questionIds.length - answered;
  const selected = attempt.answers[question.id] ?? null;
  const optionIds = attempt.optionOrder[question.id] ?? question.options.map((o) => o.id);
  const isLastSection = attempt.currentSectionIndex >= exam.sections.length - 1;

  const palette = (
    <QuestionPalette
      questionIds={questionIds}
      statuses={attempt.questionStatuses}
      currentIndex={attempt.currentQuestionIndex}
      onSelect={(i) => {
        goToQuestion(i);
        setPaletteOpen(false);
      }}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              MockForge AI
            </p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{exam.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              Section {attempt.currentSectionIndex + 1} of {exam.sections.length} · {section.name}
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-lg font-bold tabular-nums",
              tone === "normal" && "border-border bg-secondary/60",
              tone === "warning" && "border-amber-500/50 bg-amber-500/15 text-amber-600",
              tone === "critical" &&
                "animate-pulse border-destructive/60 bg-destructive/15 text-destructive",
            )}
            aria-live="off"
          >
            <Timer className="size-4" />
            {label}
          </div>
          <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <LayoutGrid className="size-4" /> Palette
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] overflow-y-auto sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{section.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{palette}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="surface-card flex min-h-[60vh] flex-col p-5 sm:p-6">
          <p className="text-sm font-semibold text-muted-foreground">
            Question {attempt.currentQuestionIndex + 1} of {questionIds.length}
          </p>

          <ContextPanel
            className="mt-3"
            contexts={question.contextIds
              .map((cid) => exam.contexts[cid])
              .filter((c): c is NonNullable<typeof c> => Boolean(c))}
          />

          <h2 className="mt-3 whitespace-pre-wrap text-lg font-medium leading-relaxed">
            {question.text}
          </h2>

          {/* Figures are shown exactly as they appear in the source paper. */}
          <MediaList media={question.media} className="mt-4" maxHeight={360} />

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Options</legend>
            {optionIds.map((oid, i) => {
              const option = question.options.find((o) => o.id === oid);
              if (!option) return null;
              const active = selected === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/60",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    className="mt-1 size-4 accent-[hsl(var(--primary))]"
                    checked={active}
                    onChange={() => selectOption(question.id, option.id)}
                  />
                  <span className="text-sm">
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                    {option.text}
                    <MediaList media={option.media} className="mt-2" maxHeight={200} />
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={() => goToQuestion(attempt.currentQuestionIndex - 1)}
              disabled={attempt.currentQuestionIndex === 0}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button variant="outline" onClick={() => clearResponse(question.id)}>
              <Eraser className="size-4" /> Clear Response
            </Button>
            {settings?.allowReviewMode ? (
              <Button variant="outline" onClick={() => toggleMarkForReview(question.id)}>
                <Flag className="size-4" />
                {attempt.markedForReview.includes(question.id) ? "Unmark" : "Mark for Review"}
              </Button>
            ) : null}
            <Button
              className="ml-auto"
              onClick={() => {
                if (attempt.currentQuestionIndex < questionIds.length - 1) {
                  goToQuestion(attempt.currentQuestionIndex + 1);
                } else {
                  setConfirmOpen(true);
                }
              }}
            >
              {attempt.currentQuestionIndex < questionIds.length - 1 ? "Save & Next" : "Finish"}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </main>

        <aside className="hidden lg:block">
          <div className="surface-card sticky top-24 p-5">
            <h2 className="font-display text-sm font-semibold">{section.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {answered} answered · {unanswered} left
            </p>
            <div className="mt-4">{palette}</div>
            <Button
              className="mt-5 w-full"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Submit Section
            </Button>
          </div>
        </aside>

        <div className="lg:hidden">
          <Button className="w-full" variant="destructive" onClick={() => setConfirmOpen(true)}>
            Submit Section
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to finish this section?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Answered: {answered} · Unanswered: {unanswered} · Marked for review: {marked}
                </p>
                {settings?.strictSectionMode ? (
                  <p className="text-destructive">
                    Strict section mode is on — this section cannot be reopened.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                completeSection();
                setConfirmOpen(false);
              }}
            >
              {isLastSection ? "Submit exam" : "Submit section"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="pb-8 text-center text-xs text-muted-foreground">
        Your exam is in progress. Leaving this page may interrupt it —{" "}
        <Link to="/review" className="underline">
          review questions
        </Link>{" "}
        only after finishing.
      </p>
    </div>
  );
}
