import Anthropic from "@anthropic-ai/sdk";

import type { VisionProvider } from "@/lib/ai/providers/types";

/** Default vision-capable Claude model (cheapest tier); override with ANTHROPIC_MODEL. */
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

/** True when an Anthropic key is present (used for auto-detection). */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Build an Anthropic-backed vision provider. Throws if the key is missing so
 * an explicit `AI_PROVIDER=anthropic` fails loudly instead of silently mocking.
 */
export function createAnthropicProvider(): VisionProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or switch AI_PROVIDER.",
    );
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const client = new Anthropic({ apiKey });

  return {
    id: "anthropic",
    model,
    async generateText({
      imageBase64,
      mediaType,
      systemPrompt,
      userInstruction,
    }) {
      const response = await client.messages.create({
        model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              { type: "text", text: userInstruction },
            ],
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        throw new Error("The AI declined to analyze this image.");
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        throw new Error("The AI returned an empty response.");
      }

      return text;
    },
  };
}
