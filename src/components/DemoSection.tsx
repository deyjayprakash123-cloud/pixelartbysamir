"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createMonaLisaCanvas } from "@/lib/monaLisa";
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
    const mona = createMonaLisaCanvas(560, 720);
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

    // Sample Mona Lisa into 52x66 ASCII grid
    const field = sampleSourceToGrid(mona, 52, 66);
    fieldRef.current = field;

    const drawSourceWithPixelSweep = (p: number) => {
      sctx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
      sctx.drawImage(mona, 0, 0, srcCanvas.width, srcCanvas.height);

      // Visual halftone/pixel block sweep across the portrait as scroll advances
      if (p > 0.02) {
        const splitY = Math.floor(srcCanvas.height * p);
        sctx.strokeStyle = "#FFFFFF";
        sctx.lineWidth = 2;
        sctx.beginPath();
        sctx.moveTo(0, splitY);
        sctx.lineTo(srcCanvas.width, splitY);
        sctx.stroke();

        // Subtle dark grid overlay over scanned portion
        sctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        sctx.fillRect(0, 0, srcCanvas.width, splitY);
      }
    };

    let timeTick = 0;
    let rafId = 0;

    const renderLoop = () => {
      timeTick++;
      const p = progressRef.current;
      drawSourceWithPixelSweep(p);
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
      onUpdate: (self) => {
        progressRef.current = self.progress;
        setDecodePercent(Math.round(self.progress * 100));
      },
    });

    return () => {
      trigger.kill();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="sec-demo"
      ref={sectionRef}
      className="relative h-[200vh] w-full border-b border-white bg-black"
    >
      {/* Sticky / Pinned Viewport inside 200vh scroll runway */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between px-4 sm:px-8 pt-16 pb-6 overflow-hidden">
        {/* Top Demo Telemetry */}
        <div className="mx-auto w-full max-w-[1400px] flex flex-wrap items-center justify-between gap-3 border-b border-white pb-4">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-white/60">
              [02] // SCROLL_REVEAL_ENGINE
            </p>
            <h2 className="text-xl sm:text-3xl font-extrabold uppercase tracking-tight">
              &gt;_ MONA_LISA_DECODE_PROTOCOL
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="border border-[#333333] px-3 py-1.5 text-white/80">
              SOURCE → GLYPH_MATRIX
            </span>
            <span className="border border-white bg-white text-black px-3 py-1.5">
              DECODE: {String(decodePercent).padStart(3, "0")}%
            </span>
          </div>
        </div>

        {/* Two-side Transformation Stage */}
        <div className="mx-auto w-full max-w-[1400px] flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 min-h-0 items-center">
          {/* Left Side: High-res Mona Lisa Source */}
          <div className="flex flex-col h-full max-h-[70vh] border border-white bg-black">
            <div className="flex items-center justify-between border-b border-white px-3 py-2 text-[11px] font-bold">
              <span>[SRC] // RASTER_PORTRAIT_560x720</span>
              <span>LUMA_INPUT</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-3 min-h-0">
              <canvas
                ref={sourceCanvasRef}
                className="max-h-full max-w-full w-auto h-auto border border-[#333333] object-contain"
              />
            </div>
          </div>

          {/* Right Side: Glitch-resolving ASCII Grid */}
          <div className="flex flex-col h-full max-h-[70vh] border border-white bg-black">
            <div className="flex items-center justify-between border-b border-white px-3 py-2 text-[11px] font-bold">
              <span>[OUT] // ASCII_GLITCH_GRID_52x66</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-white animate-terminal-blink" />
                {decodePercent >= 98 ? "RESOLVED" : "DECODING"}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center p-3 min-h-0">
              <canvas
                ref={asciiCanvasRef}
                data-cursor="+"
                className="max-h-full max-w-full w-auto h-auto border border-[#333333] object-contain"
              />
            </div>
          </div>
        </div>

        {/* Bottom Scrub Bar */}
        <div className="mx-auto w-full max-w-[1400px] pt-2">
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
