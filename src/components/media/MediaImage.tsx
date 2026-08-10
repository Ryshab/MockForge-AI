import { useEffect, useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { assetStore } from "@/services/assetStore";
import { cn } from "@/lib/utils";
import type { ExtractedMedia } from "@/lib/extraction-schema";

/**
 * Renders a visual exactly as it appeared in the source PDF.
 * Nothing here regenerates or re-draws content — it only resolves the stored crop.
 */
export function MediaImage({
  media,
  className,
  maxHeight = 320,
}: {
  media: ExtractedMedia;
  className?: string | undefined;
  maxHeight?: number | undefined;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc(null);
    setFailed(false);
    assetStore
      .resolve(media.url)
      .then((url) => {
        if (!active) return;
        if (url) setSrc(url);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [media.url]);

  const alt = media.alt || `Figure from page ${media.sourcePage ?? "?"}`;

  if (failed || !media.url) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive",
          className,
        )}
      >
        <ImageOff className="mt-0.5 size-4 shrink-0" />
        <span>
          The original visual
          {media.sourcePage ? ` on page ${media.sourcePage}` : ""} could not be loaded.
          {media.alt ? ` The paper describes it as: ${media.alt}` : ""}
        </span>
      </div>
    );
  }

  return (
    <>
      <figure className={cn("group relative w-fit max-w-full", className)}>
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            style={{ maxHeight }}
            onClick={() => setZoom(true)}
            className="w-auto max-w-full cursor-zoom-in rounded-lg border border-border bg-white object-contain"
          />
        ) : (
          <div
            className="w-64 animate-pulse rounded-lg border border-border bg-secondary/50"
            style={{ height: Math.min(maxHeight, 160) }}
          />
        )}
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="size-3.5" />
        </span>
        {media.alt ? (
          <figcaption className="mt-1 text-xs text-muted-foreground">{media.alt}</figcaption>
        ) : null}
      </figure>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="text-sm font-medium">
            {alt}
            {media.sourcePage ? ` · page ${media.sourcePage}` : ""}
          </DialogTitle>
          {src ? (
            <img
              src={src}
              alt={alt}
              className="max-h-[75vh] w-full rounded-md bg-white object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
