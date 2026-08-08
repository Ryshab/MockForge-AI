import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_PAPER_CHARS = 120_000;

const inputSchema = z.object({
  paperTitle: z.string().min(1),
  paperText: z.string().min(1),
  repair: z
    .object({ previous: z.string(), error: z.string() })
    .optional(),
});

/** Server-side entry point for AI extraction. The API key never leaves the server. */
export const extractQuestionsFromPaper = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { getAIProvider } = await import("./ai/providers.server");
    const provider = getAIProvider();
    const raw = await provider.extract({
      paperTitle: data.paperTitle,
      paperText: data.paperText.slice(0, MAX_PAPER_CHARS),
      ...(data.repair ? { repair: data.repair } : {}),
    });
    return { raw, provider: provider.name };
  });
