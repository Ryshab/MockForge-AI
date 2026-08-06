import { EXTRACTION_JSON_CONTRACT } from "@/lib/extraction-schema";

export interface ExtractionRequest {
  paperTitle: string;
  paperText: string;
}

/** Provider-agnostic contract: every provider returns a raw JSON string. */
export interface AIProvider {
  readonly name: string;
  extract(request: ExtractionRequest): Promise<string>;
}

const SYSTEM_PROMPT = `You are an exam paper parser.
You convert raw text of a single MCQ question paper into structured data.

HARD RULES:
- Respond with JSON only. No markdown, no code fences, no HTML, no React, no prose.
- Never invent questions that are not present in the text.
- correctAnswer must exactly match one string in that question's options array.
- confidenceScore is your own 0-100 certainty that the question, options and answer were read correctly.
- If the answer key is absent, pick the most likely option and lower confidenceScore accordingly.
- Use the paper's own section names; if none exist, use "General".

Return exactly this shape:
${EXTRACTION_JSON_CONTRACT}`;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Gemini via the Lovable AI Gateway (OpenAI-compatible chat completions). */
function createGeminiProvider(apiKey: string, model = "google/gemini-3.6-flash"): AIProvider {
  return {
    name: `gemini:${model}`,
    async extract({ paperTitle, paperText }) {
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model,
          stream: true,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Paper: ${paperTitle}\n\nRaw text of this paper only:\n\n${paperText}\n\nReturn the JSON object now.`,
            },
          ],
        }),
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        if (response.status === 429) throw new Error("AI rate limit reached. Please retry shortly.");
        if (response.status === 402)
          throw new Error("AI credits exhausted. Add credits to continue extracting.");
        throw new Error(`AI request failed [${response.status}]: ${body.slice(0, 400)}`);
      }

      // Stream so long extractions keep bytes flowing past platform timeouts.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const chunk = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            text += chunk.choices?.[0]?.delta?.content ?? "";
          } catch {
            // ignore partial/keep-alive frames
          }
        }
      }
      return text;
    },
  };
}

/**
 * Swap providers here (OpenAI, Claude, local LLM) without touching the frontend:
 * every provider only has to implement `AIProvider`.
 */
export function getAIProvider(): AIProvider {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured on the server.");
  return createGeminiProvider(key);
}