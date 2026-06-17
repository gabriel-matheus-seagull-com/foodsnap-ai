"use client";

import * as React from "react";
import { ImageOff, Sparkles, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadPayload {
  base64: string;
  mediaType: "image/jpeg";
  previewUrl: string;
}

const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB raw upload guard
const MAX_DIMENSION = 1024; // downscale longest edge for fast, small payloads

/** Read a File as a data URL. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

/** Downscale + re-encode to JPEG so uploads are small and consistent. */
async function processImage(file: File): Promise<UploadPayload> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not supported here.");
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = out.split(",")[1] ?? "";
  if (!base64) throw new Error("Could not process the image.");
  return { base64, mediaType: "image/jpeg", previewUrl: out };
}

export function ImageUploader({
  onAnalyze,
  serverError,
}: {
  onAnalyze: (payload: UploadPayload) => void;
  serverError?: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [payload, setPayload] = React.useState<UploadPayload | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);

  const error = localError ?? serverError ?? null;

  async function handleFile(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLocalError("That image is too large. Please use one under 12 MB.");
      return;
    }
    setWorking(true);
    try {
      const processed = await processImage(file);
      setPayload(processed);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Could not read that image.",
      );
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    setPayload(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!payload ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors",
            "hover:border-primary/60 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging && "border-primary bg-secondary/60",
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-7 w-7" />
          </span>
          <span className="text-base font-semibold">
            {working ? "Reading photo…" : "Drag & drop a meal photo"}
          </span>
          <span className="text-sm text-muted-foreground">
            or <span className="font-medium text-primary">browse files</span> ·
            JPG, PNG, WebP
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-muted">
            {/* User-supplied data URL preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payload.previewUrl}
              alt="Selected meal"
              className="max-h-[360px] w-full object-contain"
            />
            <button
              type="button"
              onClick={reset}
              aria-label="Remove photo"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => onAnalyze(payload)}
            >
              <Sparkles className="h-4 w-4" />
              Analyze my meal
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>
              Choose a different photo
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <ImageOff className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
