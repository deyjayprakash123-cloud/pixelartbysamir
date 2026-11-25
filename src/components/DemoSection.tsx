"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createMonaLisaCanvas, loadMonaLisaSource } from "@/lib/monaLisa";
import {
  renderScrollDecodeFrame,
  sampleSourceToGrid,
  type SampledField,
} from "@/lib/matrixEngine";

gsap.registerPlugin(ScrollTrigger);

export function DemoSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const asciiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<number>(0);
  const fieldRef = useRef<SampledField | null>(null);

  const [decodePercent, setDecodePercent] = useState<number>(0);

  useEffect(() => {
    let monaSource: HTMLImageElement | HTMLCanvasElement =
      createMonaLisaCanvas(560, 720);
    const srcCanvas = sourceCanvasRef.current;
    const asciiCanvas = asciiCanvasRef.current;
    if (!srcCanvas || !asciiCanvas) return;

    srcCanvas.width = 560;
    srcCanvas.height = 720;
    asciiCanvas.width = 560;
    asciiCanvas.height = 720;

    const sctx = srcCanvas.getContext("2d");
    const actx = asciiCanvas.getContext("2d");
    if (!sctx || !actx) return;

    const cols = 48;
    const rows = 62;
    fieldRef.current = sampleSourceToGrid(monaSource, cols, rows);

    let cancelled = false;
    loadMonaLisaSource().then((img) => {
      if (cancelled) return;
      monaSource = img;
      fieldRef.current = sampleSourceToGrid(monaSource, cols, rows);
    });

    const drawSourceWithSweep = (p: number) => {
      sctx.fillStyle = "#000000";
      sctx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);

      // Draw real Mona Lisa aspect-fitted onto left canvas
      const natW =
        monaSource instanceof HTMLImageElement
          ? monaSource.naturalWidth || monaSource.width
          : monaSource.width;
      const natH =
        monaSource instanceof HTMLImageElement
          ? monaSource.naturalHeight || monaSource.height
          : monaSource.height;

      if (natW > 0 && natH > 0) {
        const scale = Math.min(srcCanvas.width / natW, srcCanvas.height / natH);
        const dw = natW * scale;
        const dh = natH * scale;
        const ox = (srcCanvas.width - dw) * 0.5;
        const oy = (srcCanvas.height - dh) * 0.5;
        sctx.save();
        sctx.filter = "grayscale(100%) contrast(112%)";
        sctx.drawImage(monaSource, ox, oy, dw, dh);
        sctx.restore();
      }

      if (p > 0.01) {
        const splitY = Math.floor(srcCanvas.height * p);
        sctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        sctx.fillRect(0, 0, srcCanvas.width, splitY);
        sctx.strokeStyle = "#FFFFFF";
        sctx.lineWidth = 3;
        sctx.beginPath();
        sctx.moveTo(0, splitY);
        sctx.lineTo(srcCanvas.width, splitY);
        sctx.stroke();
      }
    };

    let timeTick = 0;
    let rafId = 0;

    const renderLoop = () => {
      timeTick++;
      const p = progressRef.current;
      drawSourceWithSweep(p);
      if (fieldRef.current) {
        renderScrollDecodeFrame({
          ctx: actx,
          width: asciiCanvas.width,
          height: asciiCanvas.height,
          field: fieldRef.current,
          progress: p,
          timeTick,
        });
      }
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        setDecodePercent(Math.round(self.progress * 100));
      },
    });

    return () => {
      cancelled = true;
      trigger.kill();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="sec-demo"
      ref={sectionRef}
      className="relative h-[185vh] sm:h-[200vh] w-full border-b border-white bg-black"
    >
      {/* Sticky Viewport inside 200vh scroll runway (uses 100dvh for mobile address bar safety) */}
      <div className="sticky top-0 h-[100dvh] w-full flex flex-col justify-between px-3 sm:px-8 pt-14 sm:pt-16 pb-4 sm:pb-6 overflow-hidden">
        {/* Top Demo Telemetry */}
        <div className="mx-auto w-full max-w-[1400px] flex flex-wrap items-center justify-between gap-2 border-b border-white pb-2.5 sm:pb-4">
          <div>
            <p className="text-[10px] sm:text-[11px] tracking-[0.2em] text-white/60">
              [02] // SCROLL_REVEAL_ENGINE
            </p>
            <h2 className="text-base sm:text-3xl font-extrabold uppercase tracking-tight">
              &gt;_ MONA_LISA_DECODE
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold">
            <span className="hidden sm:inline border border-[#333333] px-3 py-1.5 text-white/80">
              SOURCE → GLYPH_MATRIX
            </span>
            <span className="border border-white bg-white text-black px-2.5 py-1 sm:px-3 sm:py-1.5">
              DECODE: {String(decodePercent).padStart(3, "0")}%
            </span>
          </div>
        </div>

        {/* Side-by-side transformation stage (stays side-by-side even on phones so both are always visible) */}
        <div className="mx-auto w-full max-w-[1400px] flex-1 grid grid-cols-2 gap-2 sm:gap-6 py-2.5 sm:py-4 min-h-0 items-center">
          {/* Left Side: Real Mona Lisa Portrait */}
          <div className="flex flex-col h-full max-h-[64dvh] sm:max-h-[70dvh] border border-white bg-black min-w-0">
            <div className="flex items-center justify-between border-b border-white px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-bold">
              <span className="truncate">[SRC] MONA_LISA</span>
              <span className="hidden sm:inline">LUMA_INPUT</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-1.5 sm:p-3 min-h-0">
              <canvas
                ref={sourceCanvasRef}
                className="max-h-full max-w-full w-auto h-auto border border-[#333333] object-contain"
              />
            </div>
          </div>

          {/* Right Side: Live Glitch-Resolving ASCII Output */}
          <div className="flex flex-col h-full max-h-[64dvh] sm:max-h-[70dvh] border border-white bg-black min-w-0">
            <div className="flex items-center justify-between border-b border-white px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-bold">
              <span className="truncate">[OUT] ASCII_GRID</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white animate-terminal-blink" />
                {decodePercent >= 96 ? "LOCKED" : "LIVE"}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center p-1.5 sm:p-3 min-h-0">
              <canvas
                ref={asciiCanvasRef}
                data-cursor="+"
                className="max-h-full max-w-full w-auto h-auto border border-[#333333] object-contain"
              />
            </div>
          </div>
        </div>

        {/* Bottom Scrub Bar */}
        <div className="mx-auto w-full max-w-[1400px] pt-1">
          <div className="h-2 w-full border border-white bg-black">
            <div
              className="h-full bg-white transition-[width] duration-75"
              style={{ width: `${decodePercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
