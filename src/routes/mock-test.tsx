import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExamRunner } from "@/features/exam/ExamRunner";
import { PageShell } from "@/components/layout/PageShell";
import { useAttemptStore } from "@/store/attemptStore";

export const Route = createFileRoute("/mock-test")({
  head: () => ({
    meta: [
      { title: "Mock Test — MockForge AI" },
      {
        name: "description",
        content:
          "A realistic CBT exam engine with per-section timers, question palette and mark-for-review, running on your extracted question paper.",
      },
      { property: "og:title", content: "Mock Test — MockForge AI" },
      {
        property: "og:description",
        content: "Section timers, question palette and CBT navigation for your extracted paper.",
      },
    ],
  }),
  component: MockTestPage,
});

function MockTestPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const attempt = useAttemptStore((s) => s.attempt);

  if (!mounted) {
    return (
      <PageShell title="Mock test" description="Loading your exam...">
        <div className="surface-card h-64 animate-pulse" />
      </PageShell>
    );
  }

  // The live exam takes over the full screen; everything else uses the page shell.
  if (attempt && attempt.status === "in-progress") {
    return (
      <ErrorBoundary fallbackTitle="Exam engine error">
        <ExamRunner />
      </ErrorBoundary>
    );
  }

  return (
    <PageShell
      title="Mock test"
      description="Read the instructions, then start your timed computer-based test."
    >
      <ErrorBoundary fallbackTitle="Exam engine error">
        <ExamRunner />
      </ErrorBoundary>
    </PageShell>
  );
}
