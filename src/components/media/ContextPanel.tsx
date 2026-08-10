import { BookOpen } from "lucide-react";
import { MediaList } from "./MediaBlock";
import { cn } from "@/lib/utils";
import type { ContextType, ExtractedContext } from "@/lib/extraction-schema";

const LABEL: Record<ContextType, string> = {
  passage: "Reading passage",
  "case-study": "Case study",
  "data-table": "Common data",
  instructions: "Directions",
  "diagram-context": "Refer to the figure",
};

/**
 * Shared content is stored once and shown with every question that needs it,
 * so a passage never gets copied into 5 separate questions.
 */
export function ContextPanel({
  contexts,
  className,
}: {
  contexts: ExtractedContext[];
  className?: string | undefined;
}) {
  if (contexts.length === 0) return null;
  return (
    <div className={cn("space-y-3", className)}>
      {contexts.map((context) => (
        <section
          key={context.id}
          className="rounded-xl border border-border bg-secondary/30 p-4"
          aria-label={LABEL[context.type]}
        >
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="size-3.5" />
            {LABEL[context.type]}
            {context.sourcePage ? ` · page ${context.sourcePage}` : ""}
          </p>
          {context.content ? (
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {context.content}
            </div>
          ) : null}
          <MediaList media={context.media} className="mt-3" maxHeight={280} />
        </section>
      ))}
    </div>
  );
}
