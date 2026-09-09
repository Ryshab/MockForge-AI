import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The client sends page-bounded chunks. Reject oversized requests rather than
// silently chopping a selected paper in the middle of a question.
const MAX_PAPER_CHARS = 90_000;

const inputSchema = z.object({
  paperTitle: z.string().min(1),
  paperText: z.string().min(1),
  repair: z.object({ previous: z.string(), error: z.string() }).optional(),
});

/** Server-side entry point for AI extraction. The API key never leaves the server. */
export const extractQuestionsFromPaper = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.paperText.length > MAX_PAPER_CHARS) {
      throw new Error(
        "This page group is too large to process safely. Please use a smaller range.",
      );
    }
    const { getAIProvider } = await import("./ai/providers.server");
    const provider = getAIProvider();
    const raw = await provider.extract({
      paperTitle: data.paperTitle,
      paperText: data.paperText,
      ...(data.repair ? { repair: data.repair } : {}),
    });
    return { raw, provider: provider.name };
  });
