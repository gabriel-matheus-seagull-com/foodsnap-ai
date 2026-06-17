import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeImage } from "@/lib/ai/analyze-image";

// The AI providers (Anthropic SDK / Gemini fetch) run on the Node.js runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Base64 is ~1.33x the byte size; cap the decoded image at ~6 MB.
const MAX_BASE64_LENGTH = Math.ceil((6 * 1024 * 1024 * 4) / 3);

const requestSchema = z.object({
  imageBase64: z
    .string()
    .min(1, "Image data is required.")
    .max(MAX_BASE64_LENGTH, "Image is too large (max ~6 MB)."),
  mediaType: z.enum(ALLOWED_MEDIA_TYPES),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid image upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await analyzeImage({
      imageBase64: parsed.data.imageBase64,
      mediaType: parsed.data.mediaType,
    });
    return NextResponse.json(result);
  } catch (error) {
    // Log server-side; return a friendly, non-leaky message to the client.
    console.error("[analyze] failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while analyzing the image.";
    return NextResponse.json(
      { error: `We couldn't analyze that photo. ${message}` },
      { status: 502 },
    );
  }
}
