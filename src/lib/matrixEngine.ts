export interface SampledField {
  cols: number;
  rows: number;
  luma: Float32Array;
}

/**
 * Samples an image or canvas into a normalized [0..1] luminance grid
 * fitted cleanly with aspect preservation onto pure black padding.
 */
export function sampleSourceToGrid(
  source: HTMLImageElement | HTMLCanvasElement,
  cols: number,
  rows: number
): SampledField {
  const safeCols = Math.max(8, Math.floor(cols));
  const safeRows = Math.max(8, Math.floor(rows));
  const luma = new Float32Array(safeCols * safeRows);

  const offscreen = document.createElement("canvas");
  offscreen.width = safeCols;
  offscreen.height = safeRows;
  const octx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!octx) return { cols: safeCols, rows: safeRows, luma };

  octx.fillStyle = "#000000";
  octx.fillRect(0, 0, safeCols, safeRows);

  const srcW =
    source instanceof HTMLImageElement
      ? source.naturalWidth || source.width
      : source.width;
  const srcH =
    source instanceof HTMLImageElement
      ? source.naturalHeight || source.height
      : source.height;

  if (srcW > 0 && srcH > 0) {
    const scale = Math.min(safeCols / srcW, safeRows / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const offsetX = (safeCols - drawW) * 0.5;
    const offsetY = (safeRows - drawH) * 0.5;
    octx.drawImage(source, offsetX, offsetY, drawW, drawH);
  }

  const pixels = octx.getImageData(0, 0, safeCols, safeRows).data;
  for (let i = 0; i < safeCols * safeRows; i++) {
    const idx = i * 4;
    const r = pixels[idx] / 255;
    const g = pixels[idx + 1] / 255;
    const b = pixels[idx + 2] / 255;
    const rawLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const boosted = Math.max(0, Math.min(1, (rawLum - 0.5) * 1.25 + 0.52));
    luma[i] = boosted;
  }

  return { cols: safeCols, rows: safeRows, luma };
}

export function deterministicNoise(a: number, b: number, c: number): number {
  const n = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Renders the scroll-driven Mona Lisa ASCII glitch-to-resolved frame (Demo Section).
 */
export function renderScrollDecodeFrame(params: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  field: SampledField;
  progress: number;
  timeTick: number;
}): void {
  const { ctx, width, height, field, progress, timeTick } = params;
  const { cols, rows, luma } = field;
  const ramp = " .:+*#%@01";
  const glitchPool = "01#@%*+=/:[]";

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const cellW = width / cols;
  const cellH = height / rows;
  const fontSize = Math.max(7, Math.floor(Math.min(cellW, cellH) * 0.92));

  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const revealThreshold = Math.min(1, Math.max(0, progress));

  for (let r = 0; r < rows; r++) {
    const rowNorm = r / Math.max(1, rows - 1);
    const frontierDist = Math.abs(rowNorm - revealThreshold);
    const isFrontier =
      frontierDist < 0.09 && revealThreshold > 0.02 && revealThreshold < 0.98;
    const rowGlitchShift = isFrontier
      ? Math.round(
          (deterministicNoise(r, Math.floor(revealThreshold * 40), timeTick) -
            0.5) *
            6
        )
      : 0;

    for (let c = 0; c < cols; c++) {
      const srcCol = ((c + rowGlitchShift) % cols + cols) % cols;
      const lum = luma[r * cols + srcCol] ?? 0;
      const cellOrder = deterministicNoise(c, r, 11);
      const localResolve =
        revealThreshold * 1.18 - rowNorm * 0.28 - cellOrder * 0.16;

      if (localResolve <= 0) {
        if (deterministicNoise(c, r, timeTick) > 0.72) {
          const ch = deterministicNoise(r, c, timeTick) > 0.5 ? "1" : "0";
          ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
          ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
        }
        continue;
      }

      if (localResolve < 0.25 || isFrontier) {
        const gIdx = Math.floor(
          deterministicNoise(c, r, timeTick + Math.floor(progress * 100)) *
            glitchPool.length
        );
        const ch = glitchPool[gIdx] ?? "#";
        if (isFrontier && lum > 0.25) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
          ctx.fillStyle = "#000000";
          ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(
            1,
            lum + 0.25
          ).toFixed(2)})`;
          ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
        }
        continue;
      }

      const charIdx = Math.round(lum * (ramp.length - 1));
      const ch = ramp[charIdx] ?? " ";
      if (ch === " ") continue;
      const alpha = Math.max(0.12, Math.min(1, lum));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
    }
  }
}
