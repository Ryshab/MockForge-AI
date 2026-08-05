import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UploadDropzone } from "@/features/upload/UploadDropzone";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload MCQ PDF — MockForge AI" },
      {
        name: "description",
        content:
          "Upload a PDF question paper up to 100 MB and read its page count and metadata before building your mock test.",
      },
      { property: "og:title", content: "Upload MCQ PDF — MockForge AI" },
      {
        property: "og:description",
        content: "Drag and drop your MCQ PDF to start building a CBT mock test.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  return (
    <PageShell
      title="Upload question paper"
      description="Drag and drop a PDF, or browse your files. We read page count and metadata only — no AI yet."
    >
      <ErrorBoundary fallbackTitle="Upload failed">
        <UploadDropzone />
      </ErrorBoundary>
    </PageShell>
  );
}
