import { beforeAll, describe, expect, it } from "vitest";

import { POST } from "@/app/api/analyze/route";

// A 1x1 transparent PNG (tiny valid base64 payload).
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze — validation", () => {
  it("rejects a request missing the image", async () => {
    const res = await POST(makeRequest({ mediaType: "image/png" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unsupported media type", async () => {
    const res = await POST(
      makeRequest({ imageBase64: TINY_PNG_BASE64, mediaType: "image/tiff" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze — graceful no-key (mock) happy path", () => {
  beforeAll(() => {
    // Force the offline mock path so the test never makes a network call,
    // regardless of which provider keys happen to be in the environment.
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.AI_PROVIDER = "mock";
  });

  it("returns a 200 mock analysis when no API key is configured", async () => {
    const res = await POST(
      makeRequest({ imageBase64: TINY_PNG_BASE64, mediaType: "image/png" }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { source: string; items: unknown[] };
    expect(data.source).toBe("mock");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });
});
