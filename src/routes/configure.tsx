import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { ExamConfigForm } from "@/features/configure/ExamConfigForm";
import { SectionManager } from "@/features/configure/SectionManager";
import { usePdfStore } from "@/store/pdfStore";

export const Route = createFileRoute("/configure")({
  head: () => ({
    meta: [
      { title: "Configure Exam — MockForge AI" },
      {
        name: "description",
        content:
          "Set exam name, marking scheme, negative marking, shuffling and unlimited timed sections before generating your CBT.",
      },
      { property: "og:title", content: "Configure Exam — MockForge AI" },
      {
        property: "og:description",
        content: "Marking scheme, section timers and exam behaviour, all in one place.",
      },
    ],
  }),
  component: ConfigurePage,
});

function ConfigurePage() {
  const metadata = usePdfStore((s) => s.metadata);

  return (
    <PageShell
      title="Configure exam"
      description="Shape the test pattern before the CBT engine is generated."
      actions={
        <Button asChild variant="outline">
          <Link to="/upload">
            <FileText className="size-4" />
            {metadata ? metadata.fileName.slice(0, 22) : "Upload a PDF"}
          </Link>
        </Button>
      }
    >
      <ErrorBoundary fallbackTitle="Configuration error">
        <div className="space-y-6">
          <ExamConfigForm />
          <SectionManager />
        </div>
      </ErrorBoundary>
    </PageShell>
  );
}
