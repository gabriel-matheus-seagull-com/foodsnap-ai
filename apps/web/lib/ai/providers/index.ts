/**
 * Provider selection. The vision layer is provider-agnostic: which backend
 * runs is decided here, from environment variables only.
 *
 * Resolution order:
 *  1. Explicit `AI_PROVIDER` ("anthropic" | "gemini" | "mock").
 *  2. Otherwise auto-detect from whichever API key is present
 *     (Anthropic wins if both are set).
 *  3. Otherwise `null` → the caller falls back to offline mock mode.
 */

import {
  createAnthropicProvider,
  hasAnthropicKey,
} from "@/lib/ai/providers/anthropic";
import { createGeminiProvider, hasGeminiKey } from "@/lib/ai/providers/gemini";
import type { ProviderId, VisionProvider } from "@/lib/ai/providers/types";

function explicitProvider(): string | undefined {
  return process.env.AI_PROVIDER?.trim().toLowerCase() || undefined;
}

/**
 * Resolve the active vision provider, or `null` when none is configured
 * (offline mock mode). Throws on an unknown `AI_PROVIDER` or when an explicitly
 * requested provider is missing its API key.
 */
export function resolveProvider(): VisionProvider | null {
  const explicit = explicitProvider();

  switch (explicit) {
    case "anthropic":
      return createAnthropicProvider();
    case "gemini":
      return createGeminiProvider();
    case "mock":
      return null;
    case undefined:
      break;
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${explicit}". Use "anthropic", "gemini", or "mock".`,
      );
  }

  // Auto-detect: prefer Anthropic, then Gemini.
  if (hasAnthropicKey()) return createAnthropicProvider();
  if (hasGeminiKey()) return createGeminiProvider();
  return null;
}

/** True when a real provider can be resolved (vs. offline mock mode). */
export function hasConfiguredProvider(): boolean {
  if (explicitProvider() === "mock") return false;
  if (explicitProvider() === "anthropic") return hasAnthropicKey();
  if (explicitProvider() === "gemini") return hasGeminiKey();
  return hasAnthropicKey() || hasGeminiKey();
}

/** The id of the active provider, or `null` in mock mode. Handy for logging. */
export function activeProviderId(): ProviderId | null {
  if (!hasConfiguredProvider()) return null;
  const explicit = explicitProvider();
  if (explicit === "anthropic" || explicit === "gemini") return explicit;
  return hasAnthropicKey() ? "anthropic" : "gemini";
}
