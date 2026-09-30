import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  activeProviderId,
  hasConfiguredProvider,
  resolveProvider,
} from "@/lib/ai/providers";

// Provider selection reads only env vars; snapshot + restore them per test so
// the suite is order-independent and leaves the environment untouched.
const KEYS = [
  "AI_PROVIDER",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GOOGLE_API_KEY",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("resolveProvider — auto-detect", () => {
  it("returns null (mock mode) when nothing is configured", () => {
    expect(resolveProvider()).toBeNull();
    expect(hasConfiguredProvider()).toBe(false);
    expect(activeProviderId()).toBeNull();
  });

  it("selects Anthropic when only ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const provider = resolveProvider();
    expect(provider?.id).toBe("anthropic");
    expect(provider?.model).toBe("claude-haiku-4-5-20251001");
    expect(activeProviderId()).toBe("anthropic");
  });

  it("selects Gemini when only GEMINI_API_KEY is set", () => {
    process.env.GEMINI_API_KEY = "g-test";
    const provider = resolveProvider();
    expect(provider?.id).toBe("gemini");
    expect(provider?.model).toBe("gemini-2.5-flash-lite");
    expect(activeProviderId()).toBe("gemini");
  });

  it("accepts GOOGLE_API_KEY as a Gemini key", () => {
    process.env.GOOGLE_API_KEY = "g-test";
    expect(resolveProvider()?.id).toBe("gemini");
  });

  it("prefers Anthropic when both keys are present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GEMINI_API_KEY = "g-test";
    expect(resolveProvider()?.id).toBe("anthropic");
  });

  it("honors model overrides", () => {
    process.env.GEMINI_API_KEY = "g-test";
    process.env.GEMINI_MODEL = "gemini-2.5-pro";
    expect(resolveProvider()?.model).toBe("gemini-2.5-pro");
  });
});

describe("resolveProvider — explicit AI_PROVIDER", () => {
  it("forces Gemini even when an Anthropic key is also set", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GEMINI_API_KEY = "g-test";
    expect(resolveProvider()?.id).toBe("gemini");
  });

  it("throws when the requested provider has no API key", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(() => resolveProvider()).toThrow();
  });

  it("treats AI_PROVIDER=mock as offline mock mode", () => {
    process.env.AI_PROVIDER = "mock";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(resolveProvider()).toBeNull();
    expect(hasConfiguredProvider()).toBe(false);
  });

  it("throws on an unknown AI_PROVIDER value", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => resolveProvider()).toThrow();
  });
});
