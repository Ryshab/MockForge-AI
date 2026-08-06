import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReviewEditor } from "@/features/review/ReviewEditor";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review extracted questions — MockForge AI" },
      {
        name: "description",
        content:
          "Review, edit, merge, split and export AI-extracted MCQ questions before building your mock test.",
      },
      { property: "og:title", content: "Review extracted questions — MockForge AI" },
      {
        property: "og:description",
        content: "A spreadsheet-style editor for AI-extracted question papers.",
      },
    ],
  }),
  component: () => (
    <PageShell
      title="Review extracted questions"
      description="Edit anything the AI got wrong, then export the exam as JSON."
    >
      <ErrorBoundary fallbackTitle="Review failed">
        <ReviewEditor />
      </ErrorBoundary>
    </PageShell>
  ),
});
