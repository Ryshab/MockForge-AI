import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { ResultsPage } from "@/features/results/ResultsPage";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — MockForge AI" },
      {
        name: "description",
        content: "Review your completed mock test or practice set, score, answers, and section timing.",
      },
      { property: "og:title", content: "Results — MockForge AI" },
      {
        property: "og:description",
        content: "Review your completed test score, question answers, and section timing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Results — MockForge AI" },
      {
        name: "twitter:description",
        content: "Review your completed test score, question answers, and section timing.",
      },
    ],
  }),
  component: ResultsRoute,
});

function ResultsRoute() {
  return (
    <PageShell title="Results" description="Your completed exam performance and answer review.">
      <ResultsPage />
    </PageShell>
  );
}
