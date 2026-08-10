import { MediaImage } from "./MediaImage";
import { cn } from "@/lib/utils";
import type { ExtractedMedia } from "@/lib/extraction-schema";

function MediaTable({ media }: { media: ExtractedMedia }) {
  const table = media.table!;
  return (
    <figure className="w-full overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        {table.headers.length > 0 ? (
          <thead>
            <tr>
              {table.headers.map((header, i) => (
                <th
                  key={`${header}-${i}`}
                  className="border border-border bg-secondary/60 px-3 py-2 text-left font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="border border-border px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {media.alt ? (
        <figcaption className="mt-1 text-xs text-muted-foreground">{media.alt}</figcaption>
      ) : null}
    </figure>
  );
}

/** One visual: a real table when we could reconstruct it, otherwise the original crop. */
export function MediaBlock({
  media,
  className,
  maxHeight,
}: {
  media: ExtractedMedia;
  className?: string | undefined;
  maxHeight?: number | undefined;
}) {
  if (media.type === "table" && media.table && media.table.rows.length > 0) {
    return (
      <div className={className}>
        <MediaTable media={media} />
      </div>
    );
  }
  return <MediaImage media={media} className={className} {...(maxHeight ? { maxHeight } : {})} />;
}

export function MediaList({
  media,
  className,
  maxHeight,
}: {
  media: ExtractedMedia[];
  className?: string | undefined;
  maxHeight?: number | undefined;
}) {
  if (media.length === 0) return null;
  return (
    <div className={cn("space-y-3", className)}>
      {media.map((item) => (
        <MediaBlock key={item.id} media={item} {...(maxHeight ? { maxHeight } : {})} />
      ))}
    </div>
  );
}
