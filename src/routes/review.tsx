import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review — MockForge AI" },
      {
        name: "description",
        content: "Question-by-question solution review with explanations arrives in a future release.",
      },
      { property: "og:title", content: "Review — MockForge AI" },
      { property: "og:description", content: "Solution review with explanations, coming soon." },
    ],
  }),
  component: () => (
    <PageShell title="Review" description="Solution review unlocks after the exam engine ships.">
      <ComingSoon
        icon={BookOpenCheck}
        title="Solution review coming soon"
        description="Walk through every question with your answer, the correct option and an AI-generated explanation."
      />
    </PageShell>
  ),
});
