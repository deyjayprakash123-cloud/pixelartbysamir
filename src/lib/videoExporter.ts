import type { ExportResult } from "@/types/pixelate";

const PREFERRED_MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickSupportedMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return null;
}

export interface CanvasStreamRecorder {
  finish: () => void;
  cancel: () => void;
}

/**
 * Starts real-time MediaRecorder capture directly on an HTML5 <canvas>.
 * Call `finish()` once the top-to-bottom scan animation completes to finalize the Blob.
 */
export function startCanvasStreamRecorder(params: {
  canvas: HTMLCanvasElement;
  fps?: number;
  onComplete: (result: ExportResult) => void;
  onError: (message: string) => void;
}): CanvasStreamRecorder {
  const { canvas, fps = 30, onComplete, onError } = params;

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    onError(
      "ERR_NO_CODEC: MediaRecorder API is unsupported in this browser."
    );
    return { finish: () => {}, cancel: () => {} };
  }

  if (typeof canvas.captureStream !== "function") {
    onError("ERR_NO_STREAM: canvas.captureStream() is unavailable.");
    return { finish: () => {}, cancel: () => {} };
  }

  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  let cancelled = false;

  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    onError(
      `ERR_RECORDER_INIT: ${
        err instanceof Error ? err.message : "Failed to initialize MediaRecorder"
      }`
    );
    return { finish: () => {}, cancel: () => {} };
  }

  recorder.ondataavailable = (ev: BlobEvent) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  recorder.onerror = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (!cancelled) {
      onError("ERR_RECORDER_STREAM: Browser encoder interrupted recording.");
    }
  };

  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (cancelled) return;

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    onComplete({
      url,
      filename: `pixelate-by-samir-${stamp}.${ext}`,
      mimeType,
      sizeBytes: blob.size,
    });
  };

  recorder.start(100);

  return {
    finish: () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    },
    cancel: () => {
      cancelled = true;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export function triggerFileDownload(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
