"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  Download,
  Film,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";
import {
  CHARSET_LABELS,
  CHARSET_RAMP,
  type CharsetId,
  type ExportResult,
} from "@/types/pixelate";
import { loadMonaLisaSource, MONA_LISA_SRC } from "@/lib/monaLisa";
import { deterministicNoise } from "@/lib/matrixEngine";
import {
  pickSupportedMimeType,
  startCanvasStreamRecorder,
  triggerFileDownload,
  type CanvasStreamRecorder,
} from "@/lib/videoExporter";

interface CharCell {
  char: string;
  luma: number; // 0..1 normalized brightness
}

interface ComputedGrid {
  cols: number;
  rows: number;
  cellSize: number;
  cells: CharCell[];
}

export function Creator() {
  // Hidden canvas for reading uploaded image & extracting RGBA ImageData
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Visible output canvas for progressive row-by-row ASCII/Binary rendering
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sourceRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const gridRef = useRef<ComputedGrid | null>(null);
  const recorderRef = useRef<CanvasStreamRecorder | null>(null);

  // Progressive animation state refs
  const rafIdRef = useRef<number>(0);
  const currentRowRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const lastRowStepAtRef = useRef<number>(0);
  const holdTimerRef = useRef<number | null>(null);

  // React UI state
  const [charsetId, setCharsetId] = useState<CharsetId>("binary");
  const [resolution, setResolution] = useState<number>(6); // 1 (Low) -> 10 (High)
  const [speed, setSpeed] = useState<number>(5); // 1 (Slow) -> 10 (Fast)

  const charsetRef = useRef<CharsetId>(charsetId);
  charsetRef.current = charsetId;
  const speedRef = useRef<number>(speed);
  speedRef.current = speed;

  const [sourceName, setSourceName] = useState<string>("MONA_LISA_DEFAULT.GEN");
  const [sourceThumbUrl, setSourceThumbUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [canvasDim, setCanvasDim] = useState<{ w: number; h: number }>({
    w: 680,
    h: 720,
  });
  const [gridDims, setGridDims] = useState<{ cols: number; rows: number }>({
    cols: 56,
    rows: 60,
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [scanPercent, setScanPercent] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detectedCodec, setDetectedCodec] = useState<string>("CHECKING...");

  useEffect(() => {
    setDetectedCodec(pickSupportedMimeType() ?? "UNSUPPORTED");
  }, []);

  useEffect(() => {
    return () => {
      if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
    };
  }, [exportResult]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  /**
   * 1. Image Processing (hidden canvas ImageData RGBA extraction)
   * 2. Luminance Mapping (Rec.709 pixel brightness -> charset character)
   * 3. Grid Calculation (cellSize & fontSize derived from resolution slider)
   */
  const processImageIntoGrid = useCallback(
    (
      src: HTMLImageElement | HTMLCanvasElement,
      resValue: number,
      activeCharset: CharsetId,
      targetWidth: number,
      targetHeight: number
    ): ComputedGrid | null => {
      const hiddenCanvas = hiddenCanvasRef.current;
      if (!hiddenCanvas) return null;
      const hCtx = hiddenCanvas.getContext("2d", { willReadFrequently: true });
      if (!hCtx) return null;

      // Grid Calculation: higher resolution slider => smaller cellSize => denser grid
      // Resolution 1 => 24px cellSize (coarse), Resolution 10 => 6px cellSize (fine)
      const cellSize = Math.max(6, Math.round(26 - resValue * 2));
      const cols = Math.max(12, Math.floor(targetWidth / cellSize));
      const rows = Math.max(12, Math.floor(targetHeight / cellSize));

      hiddenCanvas.width = cols;
      hiddenCanvas.height = rows;

      hCtx.fillStyle = "#000000";
      hCtx.fillRect(0, 0, cols, rows);

      const srcW =
        src instanceof HTMLImageElement
          ? src.naturalWidth || src.width
          : src.width;
      const srcH =
        src instanceof HTMLImageElement
          ? src.naturalHeight || src.height
          : src.height;

      if (srcW > 0 && srcH > 0) {
        const scale = Math.min(cols / srcW, rows / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const offsetX = (cols - drawW) * 0.5;
        const offsetY = (rows - drawH) * 0.5;
        hCtx.drawImage(src, offsetX, offsetY, drawW, drawH);
      }

      // Extract raw RGBA pixel buffer from hidden canvas
      const imageData = hCtx.getImageData(0, 0, cols, rows);
      const rgba = imageData.data;
      const ramp = CHARSET_RAMP[activeCharset];
      const cells: CharCell[] = new Array(cols * rows);

      for (let i = 0; i < cols * rows; i++) {
        const idx = i * 4;
        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        const a = rgba[idx + 3] / 255;

        // Luminance Mapping: Rec.709 perceptual brightness normalized [0..1]
        const rawLum = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * a;
        const luma = Math.max(0, Math.min(1, (rawLum - 0.5) * 1.28 + 0.52));
        const charIdx = Math.round(luma * (ramp.length - 1));

        cells[i] = {
          char: ramp[charIdx] ?? " ",
          luma,
        };
      }

      const grid: ComputedGrid = { cols, rows, cellSize, cells };
      gridRef.current = grid;
      setGridDims({ cols, rows });
      return grid;
    },
    []
  );

  /**
   * Computes clean even-dimensioned output canvas sizing preserving aspect ratio.
   */
  const computeCanvasSize = useCallback(
    (src: HTMLImageElement | HTMLCanvasElement) => {
      const maxDim = 720;
      const natW =
        src instanceof HTMLImageElement
          ? src.naturalWidth || src.width || 640
          : src.width || 640;
      const natH =
        src instanceof HTMLImageElement
          ? src.naturalHeight || src.height || 640
          : src.height || 640;

      const ratio = natW / natH;
      let w = maxDim;
      let h = Math.round(maxDim / ratio);
      if (h > maxDim) {
        h = maxDim;
        w = Math.round(maxDim * ratio);
      }

      w = Math.max(320, Math.floor(w / 2) * 2);
      h = Math.max(320, Math.floor(h / 2) * 2);
      return { w, h };
    },
    []
  );

  /**
   * 4. Progressive Render Loop (requestAnimationFrame)
   * Draws characters row by row from top to bottom with a speed-controlled delay,
   * mimicking a slow terminal loading/scanning pass.
   */
  const drawFrameAtRow = useCallback(
    (resolvedRows: number, timestampMs: number) => {
      const canvas = outputCanvasRef.current;
      const grid = gridRef.current;
      if (!canvas || !grid) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { cols, rows, cellSize, cells } = grid;
      const activeCharset = charsetRef.current;
      const ramp = CHARSET_RAMP[activeCharset];
      const tick = Math.floor(timestampMs / 110);

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;
      const fontSize = Math.max(
        6,
        Math.floor(Math.min(cellSize, cellW, cellH) * 0.92)
      );

      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxRow = Math.min(rows - 1, resolvedRows);

      for (let r = 0; r <= maxRow; r++) {
        const isActiveScanRow = isAnimatingRef.current && r === maxRow;

        if (isActiveScanRow) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, r * cellH, canvas.width, Math.max(2, cellH));
        }

        for (let c = 0; c < cols; c++) {
          const cell = cells[r * cols + c];
          if (!cell) continue;

          let ch = cell.char;
          // Continuous living Matrix shimmer across all charsets so output never looks stuck
          if (cell.luma > 0.08) {
            if (activeCharset === "binary") {
              const flip = deterministicNoise(c, r, tick);
              ch = flip < cell.luma ? ramp[ramp.length - 1] : ramp[1];
            } else if (
              !isActiveScanRow &&
              deterministicNoise(c, r, Math.floor(tick / 2)) > 0.94
            ) {
              const shiftIdx = Math.max(
                1,
                Math.min(
                  ramp.length - 1,
                  Math.round(cell.luma * (ramp.length - 1)) +
                    (deterministicNoise(r, c, tick) > 0.5 ? 1 : -1)
                )
              );
              ch = ramp[shiftIdx] ?? ch;
            }
          }

          if (isActiveScanRow) {
            ctx.fillStyle = "#000000";
            ctx.fillText(
              ch === " " ? "_" : ch,
              (c + 0.5) * cellW,
              (r + 0.5) * cellH
            );
            continue;
          }

          if (ch === " ") continue;
          const alpha = Math.max(0.12, Math.min(1, cell.luma));
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
          ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
        }
      }
    },
    []
  );

  const startProgressiveLoop = useCallback(
    (startFromZero: boolean) => {
      cancelAnimationFrame(rafIdRef.current);
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      const grid = gridRef.current;
      if (!grid) return;

      if (startFromZero) {
        currentRowRef.current = 0;
        isAnimatingRef.current = true;
        lastRowStepAtRef.current = performance.now();
        setIsGenerating(true);
        setScanPercent(0);
      } else {
        currentRowRef.current = grid.rows - 1;
        isAnimatingRef.current = false;
        setIsGenerating(false);
        setScanPercent(100);
      }

      const step = (now: number) => {
        const curGrid = gridRef.current;
        if (!curGrid) return;

        if (isAnimatingRef.current) {
          // Delay per row in ms: speed 1 (slow ~95ms/row) -> speed 10 (fast ~8ms/row)
          const rowDelayMs = Math.max(8, 105 - speedRef.current * 9.7);
          const elapsed = now - lastRowStepAtRef.current;

          if (elapsed >= rowDelayMs) {
            const rowsToAdvance = Math.max(1, Math.floor(elapsed / rowDelayMs));
            currentRowRef.current = Math.min(
              curGrid.rows - 1,
              currentRowRef.current + rowsToAdvance
            );
            lastRowStepAtRef.current = now;

            const pct = Math.min(
              100,
              Math.round(((currentRowRef.current + 1) / curGrid.rows) * 100)
            );
            setScanPercent(pct);

            if (currentRowRef.current >= curGrid.rows - 1) {
              isAnimatingRef.current = false;
              setIsGenerating(false);
              setScanPercent(100);

              if (isRecordingRef.current && recorderRef.current) {
                const activeRec = recorderRef.current;
                holdTimerRef.current = window.setTimeout(() => {
                  activeRec.finish();
                }, 650);
              }
            }
          }
        }

        drawFrameAtRow(currentRowRef.current, now);
        rafIdRef.current = requestAnimationFrame(step);
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [drawFrameAtRow]
  );

  // Reprocess image when resolution or charset changes
  useEffect(() => {
    const src = sourceRef.current;
    if (!src) return;
    const grid = processImageIntoGrid(
      src,
      resolution,
      charsetId,
      canvasDim.w,
      canvasDim.h
    );
    if (grid && !isAnimatingRef.current) {
      currentRowRef.current = grid.rows - 1;
      setScanPercent(100);
    }
  }, [resolution, charsetId, canvasDim, processImageIntoGrid]);

  const applySourceImage = useCallback(
    (
      src: HTMLImageElement | HTMLCanvasElement,
      label: string,
      thumbUrl: string
    ) => {
      sourceRef.current = src;
      setSourceName(label);
      setSourceThumbUrl(thumbUrl);

      const dims = computeCanvasSize(src);
      setCanvasDim(dims);

      // Ensure output canvas dimensions are updated synchronously before initial draw
      if (outputCanvasRef.current) {
        outputCanvasRef.current.width = dims.w;
        outputCanvasRef.current.height = dims.h;
      }

      processImageIntoGrid(
        src,
        resolution,
        charsetRef.current,
        dims.w,
        dims.h
      );
      startProgressiveLoop(true);
    },
    [computeCanvasSize, processImageIntoGrid, resolution, startProgressiveLoop]
  );

  const loadDefaultMonaLisa = useCallback(async () => {
    const mona = await loadMonaLisaSource();
    const thumb =
      mona instanceof HTMLImageElement
        ? MONA_LISA_SRC
        : mona.toDataURL("image/png");
    applySourceImage(mona, "MONA_LISA.JPG", thumb);
  }, [applySourceImage]);

  useEffect(() => {
    void loadDefaultMonaLisa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setExportError(
        "ERR_INVALID_FORMAT: Please upload PNG, JPG, WEBP, or GIF."
      );
      return;
    }
    setExportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        applySourceImage(img, file.name.toUpperCase(), dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadedFile(file);
  };

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadedFile(file);
  };

  const handleGenerateClick = () => {
    if (!sourceRef.current || isRecordingRef.current) return;
    processImageIntoGrid(
      sourceRef.current,
      resolution,
      charsetId,
      canvasDim.w,
      canvasDim.h
    );
    startProgressiveLoop(true);
  };

  const handleExportVideo = () => {
    const canvas = outputCanvasRef.current;
    if (!canvas || !sourceRef.current || isRecordingRef.current) return;

    setExportError(null);
    isRecordingRef.current = true;
    setIsRecording(true);

    processImageIntoGrid(
      sourceRef.current,
      resolution,
      charsetId,
      canvasDim.w,
      canvasDim.h
    );
    startProgressiveLoop(true);

    recorderRef.current = startCanvasStreamRecorder({
      canvas,
      fps: 30,
      onComplete: (result) => {
        isRecordingRef.current = false;
        setIsRecording(false);
        setExportResult(result);
        triggerFileDownload(result.url, result.filename);
      },
      onError: (msg) => {
        isRecordingRef.current = false;
        setIsRecording(false);
        setExportError(msg);
      },
    });
  };

  return (
    <section
      id="sec-workspace"
      className="relative w-full border-b border-white bg-black py-12 sm:py-24"
    >
      {/* Hidden offscreen canvas used exclusively for ImageData RGBA extraction */}
      <canvas ref={hiddenCanvasRef} className="hidden" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white pb-5">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-white/60 mb-1">
              [03] // CORE_CREATOR_TOOL
            </p>
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight">
              &gt;_ PIXELATE_WORKSPACE
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border border-[#333333] px-2.5 py-1">
              GRID: {gridDims.cols}×{gridDims.rows}
            </span>
            <span className="border border-white px-2.5 py-1 font-bold">
              {isRecording
                ? `REC_SCAN: ${scanPercent}%`
                : isGenerating
                ? `LOADING_ROWS: ${scanPercent}%`
                : "STATUS: COMPLETE"}
            </span>
          </div>
        </div>

        {/* Brutalist Two-Column Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-white bg-black">
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white p-5 sm:p-6 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              {/* Drag-and-drop file upload zone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tracking-widest flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    01 // SOURCE_IMAGE
                  </span>
                  <button
                    type="button"
                    data-cursor=">"
                    onClick={loadDefaultMonaLisa}
                    className="text-[10px] border border-[#333333] hover:border-white px-2 py-0.5 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    USE_MONA_LISA
                  </button>
                </div>

                <div
                  data-cursor="+"
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border border-white p-4 sm:p-5 transition-colors flex items-center justify-between gap-4 ${
                    isDragging
                      ? "bg-white text-black"
                      : "bg-black text-white hover:bg-[#333333]/35"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileInputChange}
                    className="hidden"
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold tracking-wider">
                      [ DRAG &amp; DROP IMAGE HERE ]
                    </p>
                    <p className="text-[11px] opacity-70 mt-1 truncate">
                      ACTIVE: {sourceName}
                    </p>
                  </div>
                  {sourceThumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sourceThumbUrl}
                      alt="Uploaded thumbnail"
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover border border-white grayscale shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Character Set Selector (Radio buttons) */}
              <div>
                <p className="text-xs font-bold tracking-widest mb-2.5">
                  02 // CHARACTER_SET
                </p>
                <div
                  className="space-y-2"
                  role="radiogroup"
                  aria-label="Character Set"
                >
                  {CHARSET_LABELS.map((item) => {
                    const checked = charsetId === item.id;
                    return (
                      <label
                        key={item.id}
                        data-cursor="+"
                        className={`flex items-center justify-between border px-3.5 py-2.5 text-xs font-bold transition-colors ${
                          checked
                            ? "border-white bg-white text-black"
                            : "border-[#333333] bg-black text-white hover:border-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="charset"
                            value={item.id}
                            checked={checked}
                            onChange={() => setCharsetId(item.id)}
                            className="sr-only"
                          />
                          <span>{checked ? "(●)" : "( )"}</span>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[11px] opacity-75">
                          {item.sample}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Slider (Low to High) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span>03 // RESOLUTION</span>
                  <span>
                    {resolution <= 3 ? "LOW" : resolution >= 8 ? "HIGH" : "MID"}{" "}
                    [{resolution}/10]
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                  className="brutal-slider"
                />
                <div className="flex justify-between text-[10px] text-white/60 mt-1">
                  <span>LOW (24PX CELLS)</span>
                  <span>HIGH (6PX CELLS)</span>
                </div>
              </div>

              {/* Animation Speed Slider (Slow to Fast) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span>04 // ANIMATION_SPEED</span>
                  <span>
                    {speed <= 3 ? "SLOW" : speed >= 8 ? "FAST" : "NOMINAL"} [
                    {speed}/10]
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="brutal-slider"
                />
                <div className="flex justify-between text-[10px] text-white/60 mt-1">
                  <span>SLOW SCAN</span>
                  <span>FAST SCAN</span>
                </div>
              </div>
            </div>

            {/* Generate Trigger */}
            <div className="pt-2">
              <button
                type="button"
                data-cursor=">"
                disabled={isRecording}
                onClick={handleGenerateClick}
                className="w-full flex items-center justify-center gap-2 border border-white bg-white text-black py-4 px-5 text-xs sm:text-sm font-extrabold tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                [ GENERATE PIXEL ART ]
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Canvas Output + Export */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 bg-black">
            {/* Large <canvas> area with thick white border */}
            <div className="relative flex-1 flex items-center justify-center border-2 border-white bg-black p-2 sm:p-3 min-h-[300px] sm:min-h-[520px] brutal-grid-bg">
              <canvas
                ref={outputCanvasRef}
                width={canvasDim.w}
                height={canvasDim.h}
                data-cursor="+"
                className="max-w-full max-h-[58dvh] sm:max-h-[65vh] w-auto h-auto bg-black"
              />

              {isRecording && (
                <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 border border-white bg-black px-3 py-1.5 text-xs font-bold">
                  <span className="inline-block w-2.5 h-2.5 bg-white animate-rec-pulse" />
                  REC // {scanPercent}%
                </div>
              )}
            </div>

            {/* Export Feature below canvas */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  data-cursor=">"
                  disabled={isRecording}
                  onClick={handleExportVideo}
                  className="flex-1 flex items-center justify-center gap-2 border border-white bg-black text-white py-3.5 px-5 text-xs sm:text-sm font-extrabold tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                >
                  <Film className="w-4 h-4" />
                  {isRecording
                    ? `[ RECORDING_ANIMATION... ${scanPercent}% ]`
                    : "[ EXPORT AS MP4 ]"}
                </button>

                <div className="border border-[#333333] px-3 py-2 text-[11px] text-white/70 text-center sm:text-right">
                  <div>CLIENT_ENCODER: MediaRecorder</div>
                  <div>CODEC: {detectedCodec}</div>
                </div>
              </div>

              {exportError && (
                <div className="border border-white bg-black p-3 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{exportError}</span>
                </div>
              )}

              {exportResult && !isRecording && (
                <div className="border border-white bg-black p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold">
                      &gt;_ EXPORT_COMPLETE :: {exportResult.filename}
                    </span>
                    <span className="text-white/70">
                      {(exportResult.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <video
                    src={exportResult.url}
                    controls
                    loop
                    autoPlay
                    muted
                    playsInline
                    className="w-full max-h-56 border border-[#333333] bg-black object-contain"
                  />
                  <button
                    type="button"
                    data-cursor=">"
                    onClick={() =>
                      triggerFileDownload(
                        exportResult.url,
                        exportResult.filename
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 border border-white py-2 text-xs font-bold hover:bg-white hover:text-black transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    [ DOWNLOAD_RECORDING ]
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
