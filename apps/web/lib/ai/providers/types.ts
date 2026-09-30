/**
 * Provider-agnostic contract for the vision layer.
 *
 * A `VisionProvider` knows how to send one meal image + prompt to a specific
 * model backend (Anthropic, Gemini, …) and return the raw text response. It is
 * deliberately dumb about *what* the text means — parsing/validation lives in
 * `analyze-image.ts` so it stays identical across providers.
 */

export type SupportedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

/** Stable identifiers for the backends we support. */
export type ProviderId = "anthropic" | "gemini";

/** Everything a provider needs to make a single vision request. */
export interface VisionRequest {
  imageBase64: string;
  mediaType: SupportedMediaType;
  /** System / instruction prompt (provider-independent). */
  systemPrompt: string;
  /** The user-turn instruction sent alongside the image. */
  userInstruction: string;
}

/** Everything a provider needs to make a single text-only request (no image). */
export interface ChatRequest {
  systemPrompt: string;
  userInstruction: string;
}

export interface VisionProvider {
  /** Which backend this is, e.g. "anthropic" | "gemini". */
  readonly id: ProviderId;
  /** The resolved model name actually in use. */
  readonly model: string;
  /**
   * Send the image+prompt to the model and return its raw text output.
   * Throws a friendly `Error` on refusal, an empty response, or transport
   * failure — never leaks credentials or raw provider internals.
   */
  generateText(request: VisionRequest): Promise<string>;
  /**
   * Send a text-only prompt (no image) and return its raw text output. Used
   * by the AI Food Coach, which only ever sends a small aggregated JSON
   * snapshot — never an image. Same error-handling contract as
   * `generateText`.
   */
  generateChatText(request: ChatRequest): Promise<string>;
}
