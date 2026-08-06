import { createFileRoute } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/mock-test")({
  head: () => ({
    meta: [
      { title: "Mock Test — MockForge AI" },
      {
        name: "description",
        content:
          "The CBT exam engine with palette, timers and section navigation lands in a future release.",
      },
      { property: "og:title", content: "Mock Test — MockForge AI" },
      { property: "og:description", content: "CBT exam engine, coming soon." },
    ],
  }),
  component: () => (
    <PageShell
      title="Mock test"
      description="The exam engine is not part of this foundation release."
    >
      <ComingSoon
        icon={MonitorPlay}
        title="CBT engine coming soon"
        description="Question palette, section timers, fullscreen mode and auto-submit will plug straight into the exam store you configure today."
      />
    </PageShell>
  ),
});
