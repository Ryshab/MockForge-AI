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
- An option can be an image (common in reasoning papers). If an option has no text, set
  "text": null and give it a media entry with the matching "ref" from the VISUAL INVENTORY.

VISUALS (diagrams, figures, charts, tables, equations) — critical
- Some pages list a VISUAL INVENTORY line: [VISUALS on this page: v3-1 (top, left, ~40% page width); ...].
  Those ids point at real regions of the original PDF. The app crops the ORIGINAL image for
  anything you reference — so you must NEVER describe a diagram instead of referencing it, and
  never try to reproduce it as ASCII, markdown or text.
- If a question depends on a figure, chart, map, circuit, geometry drawing or an image option,
  add a media entry with the best-matching inventory "ref" (match by page and position order).
- If the text clearly implies a visual ("in the figure below", "the given diagram", "study the
  chart") but no inventory id fits, still add a media entry with "ref": "page:N" so the app can
  recover the region from page N. Never drop the question and never pretend the visual is absent.
- Tables: if you can reconstruct every header, row and cell exactly, return structured
  "table" data (that renders as a real table). If the table is ambiguous, merged or partly
  graphical, set "table": null and give a "ref" so the original is preserved as an image.
- Mathematical/chemical expressions stay in the question text as plain text; only use
  "equation" media when the expression is an image in the PDF.

PARTIAL PAGE CHUNKS
- The selected paper may be supplied in overlapping page chunks. Extract only questions whose
  question text appears in the ordinary page blocks of this request.
- A block labelled "Answer-key reference pages" is reference material only: use it to match
  answers by question number, but never emit duplicate questions from that block.

SHARED CONTENT (passages, case studies, common data)
- When several questions share a reading passage, case study, instruction block or data table
  ("Directions for questions 96-100", "Read the passage and answer"), store that block ONCE in
  "contexts" with a stable id and list that id in each dependent question's "contextIds".
- Copy shared text verbatim; do not summarise it and do not duplicate it inside every question.
- A question that stands alone gets "contextIds": [].

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

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000] as const;

class ProviderHttpError extends Error {
  constructor(
    readonly providerName: string,
    readonly status: number,
    readonly retryAfterMs?: number,
    readonly invalidCredential = false,
  ) {
    super(`AI provider returned HTTP ${status}.`);
    this.name = "ProviderHttpError";
  }
}

function retryAfterDelay(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function failureReason(status: number): string {
  if (status === 401 || status === 403) return "provider authentication or access was rejected";
  if (status === 400) return "provider rejected the request";
  if (status === 429) return "provider rate limit reached";
  if (RETRYABLE_STATUSES.has(status)) return "temporary provider failure";
  return "provider request failed";
}

function logProviderFailure(providerName: string, status: number | "unknown") {
  // Never log response bodies, prompts, credentials, or request headers.
  console.warn("[ai-provider] request failed", {
    provider: providerName,
    status,
    reason: status === "unknown" ? "request failed before a response" : failureReason(status),
  });
}

function logHttpFailure(error: ProviderHttpError) {
  logProviderFailure(error.providerName, error.status);
}

function isTemporaryFailure(error: unknown): error is ProviderHttpError {
  return error instanceof ProviderHttpError && RETRYABLE_STATUSES.has(error.status);
}

function toUserError(error: unknown): Error {
  if (!(error instanceof ProviderHttpError)) {
    return error instanceof Error
      ? new Error(error.message || "The AI request could not be completed. Please try again.")
      : new Error("The AI request could not be completed. Please try again.");
  }
  if (error.invalidCredential) {
    return new Error(
      "Gemini could not authorize the request. Please check the server's Gemini configuration.",
    );
  }
  if (error.status === 401 || error.status === 403) {
    return new Error(
      error.providerName.startsWith("gemini:")
        ? "Gemini could not authorize the request. Please check the server's Gemini configuration."
        : "The AI service could not authorize the request. Please check the server configuration.",
    );
  }
  if (error.status === 402)
    return new Error("AI credits are exhausted. Add credits to continue extracting.");
  if (RETRYABLE_STATUSES.has(error.status)) {
    return new Error("The AI service is temporarily unavailable. Please try again in a moment.");
  }
  return new Error(
    `The AI request could not be completed (HTTP ${error.status}). Please try again.`,
  );
}

/** Official Google Gemini API (server-side only). */
function createGeminiProvider(
  apiKey: string,
  model = "gemini-2.5-flash",
  fetcher: typeof fetch = fetch,
): AIProvider {
  const name = `gemini:${model}`;
  return {
    name,
    async extract(request) {
      const response = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt(request) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 65536,
            },
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new ProviderHttpError(
          name,
          response.status,
          retryAfterDelay(response.headers.get("Retry-After")),
          response.status === 400 && /api[_ ]?key|invalid[_ ]?key|api key not valid/i.test(body),
        );
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
function createGatewayProvider(
  apiKey: string,
  model = "google/gemini-3.6-flash",
  fetcher: typeof fetch = fetch,
): AIProvider {
  const name = `lovable-gateway:${model}`;
  return {
    name,
    async extract(request) {
      const response = await fetcher(GATEWAY_URL, {
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

      if (!response.ok) {
        throw new ProviderHttpError(
          name,
          response.status,
          retryAfterDelay(response.headers.get("Retry-After")),
        );
      }
      if (!response.body) throw new Error("The AI provider returned no response stream.");

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
  const lovableKey = process.env["LOVABLE_API_KEY"];
  return createAIProviderFromConfig({
    ...(geminiKey ? { geminiApiKey: geminiKey } : {}),
    ...(lovableKey ? { lovableApiKey: lovableKey } : {}),
  });
}

interface ProviderConfig {
  geminiApiKey?: string;
  lovableApiKey?: string;
  /** Injectable only to make provider behavior deterministic in tests. */
  fetcher?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}

async function waitForRetry(milliseconds: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function extractWithRetries(
  provider: AIProvider,
  request: ExtractionRequest,
  wait: (milliseconds: number) => Promise<void>,
): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await provider.extract(request);
    } catch (error) {
      if (error instanceof ProviderHttpError) logHttpFailure(error);
      else logProviderFailure(provider.name, "unknown");

      if (!isTemporaryFailure(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      const baseDelay = RETRY_DELAYS_MS[attempt];
      if (baseDelay === undefined) throw error;
      await wait(Math.max(baseDelay, error.retryAfterMs ?? 0));
    }
  }
}

/**
 * Creates the current provider chain. Gemini remains primary; the gateway is
 * used only after Gemini exhausts transient retries. Without a Gemini key,
 * existing gateway-only configuration continues to work as before.
 */
export function createAIProviderFromConfig(config: ProviderConfig): AIProvider {
  const fetcher = config.fetcher ?? fetch;
  const gemini = config.geminiApiKey
    ? createGeminiProvider(config.geminiApiKey, undefined, fetcher)
    : undefined;
  const gateway = config.lovableApiKey
    ? createGatewayProvider(config.lovableApiKey, undefined, fetcher)
    : undefined;
  const primary = gemini ?? gateway;
  if (!primary) {
    throw new Error(
      "AI is not configured on the server. Add a GEMINI_API_KEY to enable extraction.",
    );
  }
  const fallback = gemini ? gateway : undefined;
  const wait = config.wait ?? waitForRetry;

  return {
    name: primary.name,
    async extract(request) {
      try {
        return await extractWithRetries(primary, request, wait);
      } catch (primaryError) {
        if (!fallback || !isTemporaryFailure(primaryError)) throw toUserError(primaryError);
        try {
          return await extractWithRetries(fallback, request, wait);
        } catch (fallbackError) {
          if (fallbackError instanceof ProviderHttpError) logHttpFailure(fallbackError);
          else logProviderFailure(fallback.name, "unknown");
          throw new Error(
            "The AI services could not complete this extraction. Your PDF is unchanged; please try again shortly.",
          );
        }
      }
    },
  };
}
