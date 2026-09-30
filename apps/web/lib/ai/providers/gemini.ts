import type { VisionProvider } from "@/lib/ai/providers/types";

/**
 * Gemini vision provider. Talks to the Generative Language REST API directly
 * with `fetch`, so it needs no extra SDK dependency. We force JSON output via
 * `responseMimeType` and still parse defensively downstream.
 */

// Cheapest vision-capable Gemini tier; override with GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Accept either GEMINI_API_KEY or the broader GOOGLE_API_KEY. */
function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

/** True when a Gemini/Google key is present (used for auto-detection). */
export function hasGeminiKey(): boolean {
  return Boolean(geminiApiKey());
}

/** Minimal shape of the bits of the Gemini response we read. */
interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return typeof body?.error?.message === "string" ? body.error.message : "";
  } catch {
    return "";
  }
}

/**
 * Build a Gemini-backed vision provider. Throws if no key is present so an
 * explicit `AI_PROVIDER=gemini` fails loudly instead of silently mocking.
 */
export function createGeminiProvider(): VisionProvider {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local or switch AI_PROVIDER.",
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  return {
    id: "gemini",
    model,
    async generateText({
      imageBase64,
      mediaType,
      systemPrompt,
      userInstruction,
    }) {
      const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(
        model,
      )}:generateContent`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header auth keeps the key out of URLs and server logs.
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: mediaType, data: imageBase64 } },
                { text: userInstruction },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const detail = await extractErrorMessage(res);
        throw new Error(
          `Gemini request failed (${res.status})${detail ? `: ${detail}` : ""}.`,
        );
      }

      const data = (await res.json()) as GeminiResponse;

      if (data.promptFeedback?.blockReason) {
        throw new Error("The AI declined to analyze this image.");
      }

      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (
        finishReason &&
        finishReason !== "STOP" &&
        finishReason !== "MAX_TOKENS"
      ) {
        // e.g. SAFETY / RECITATION / PROHIBITED_CONTENT
        throw new Error("The AI declined to analyze this image.");
      }

      const text = (candidate?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new Error("The AI returned an empty response.");
      }

      return text;
    },
  };
}
