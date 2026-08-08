import { EXTRACTION_JSON_CONTRACT, UNCATEGORIZED } from "@/lib/extraction-schema";

export interface ExtractionRequest {
  paperTitle: string;
  paperText: string;
  /** Present on the repair attempt after a failed validation. */
  repair?: { previous: string; error: string };
}

/** Provider-agnostic contract: every provider returns a raw JSON string. */
export interface AIProvider {
  readonly name: string;
  extract(request: ExtractionRequest): Promise<string>;
}

const SYSTEM_PROMPT = `You are an exam paper parser. You convert the raw text of MCQ question papers into structured data.

HARD RULES
- Respond with JSON only. No markdown, no code fences, no HTML, no prose.
- Never invent questions, options, sections or answers that are not in the text.
- Never invent section names. Detect real section headings (e.g. "General Intelligence",
  "General Awareness", "Quantitative Aptitude", "English"). If a question's section cannot be
  reliably determined, use "${UNCATEGORIZED}".

ANSWER KEY RULES (critical)
- Exam PDFs often place the answer key at the END, as a table or list of question numbers to
  option letters. Look for it across ALL supplied pages.
- Match answer-key entries to questions by QUESTION NUMBER, not by proximity. Never assume the
  text that follows a question is its answer.
- If the key gives the answer: correctAnswer = that option id, answerSource = "answer-key".
- If there is no key but the answer is objectively derivable from the question itself:
  answerSource = "inferred" and lower confidenceScore.
- If the answer cannot be reliably determined: correctAnswer = null and
  answerSource = "unavailable". Do NOT guess.

CONFIDENCE (0–1)
Base it on extraction reliability only — question text completeness, option completeness,
answer-key matching, section detection and text quality. It is never proof the answer is correct.

OPTIONS
- Use the paper's own labels as option ids ("A"/"B"/"C"/"D" or "1"/"2"/"3"/"4").
- correctAnswer must exactly equal one of that question's option ids, or be null.

SOURCE PAGE
Each page of input is prefixed with a "--- Page N ---" marker. Set sourcePage to the N the
question text appeared on.

If the text contains no MCQ questions at all, return the object with "questions": [].

Return exactly this shape:
${EXTRACTION_JSON_CONTRACT}`;

function userPrompt({ paperTitle, paperText, repair }: ExtractionRequest) {
  const base = `Paper: ${paperTitle}\n\nRaw text of the selected pages only:\n\n${paperText}\n\nReturn the JSON object now.`;
  if (!repair) return base;
  return `${base}\n\nYour previous response was rejected by schema validation with this error:\n${repair.error}\n\nPrevious response:\n${repair.previous.slice(0, 4000)}\n\nReturn a corrected JSON object that matches the contract exactly.`;
}

function mapHttpError(status: number, body: string): Error {
  if (status === 400 && /api[_ ]?key/i.test(body))
    return new Error("The AI API key looks invalid. Please check the configured GEMINI_API_KEY.");
  if (status === 401 || status === 403)
    return new Error("The AI API key was rejected. Please check the configured GEMINI_API_KEY.");
  if (status === 429)
    return new Error("The AI service is rate limited right now. Please retry in a moment.");
  if (status === 402)
    return new Error("AI credits are exhausted. Add credits to continue extracting.");
  if (status >= 500)
    return new Error("The AI service is temporarily unavailable. Please try again.");
  return new Error(`The AI request failed (${status}). ${body.slice(0, 300)}`);
}

/** Official Google Gemini API (server-side only). */
function createGeminiProvider(apiKey: string, model = "gemini-2.5-flash"): AIProvider {
  return {
    name: `gemini:${model}`,
    async extract(request) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt(request) }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
          }),
        },
      );

      if (!response.ok) {
        throw mapHttpError(response.status, await response.text().catch(() => ""));
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) throw new Error("The AI returned an empty response.");
      return text;
    },
  };
}

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Fallback: Gemini through the Lovable AI Gateway when no GEMINI_API_KEY is configured. */
function createGatewayProvider(apiKey: string, model = "google/gemini-3-flash"): AIProvider {
  return {
    name: `lovable-gateway:${model}`,
    async extract(request) {
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
            { role: "user", content: userPrompt(request) },
          ],
        }),
      });

      if (!response.ok || !response.body) {
        throw mapHttpError(response.status, await response.text().catch(() => ""));
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
      if (!text.trim()) throw new Error("The AI returned an empty response.");
      return text;
    },
  };
}

/**
 * Swap providers here (OpenAI, Claude, local LLM) without touching the frontend:
 * every provider only has to implement `AIProvider`.
 */
export function getAIProvider(): AIProvider {
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) return createGeminiProvider(geminiKey);
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) return createGatewayProvider(lovableKey);
  throw new Error("AI is not configured on the server. Add a GEMINI_API_KEY to enable extraction.");
}
