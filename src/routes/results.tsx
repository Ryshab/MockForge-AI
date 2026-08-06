import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — MockForge AI" },
      {
        name: "description",
        content:
          "Scorecards, accuracy and section-wise analysis arrive once the exam engine ships.",
      },
      { property: "og:title", content: "Results — MockForge AI" },
      { property: "og:description", content: "Scorecards and section analysis, coming soon." },
    ],
  }),
  component: () => (
    <PageShell title="Results" description="Scoring is disabled in this foundation release.">
      <ComingSoon
        icon={Trophy}
        title="Scorecards coming soon"
        description="Score, accuracy, attempt rate and section-wise breakdowns will be computed from your marking scheme."
      />
    </PageShell>
  ),
});
