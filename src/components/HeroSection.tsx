"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { createMonaLisaCanvas } from "@/lib/monaLisa";
import { sampleSourceToGrid } from "@/lib/matrixEngine";

interface HeroSectionProps {
  onScrollPromptClick: () => void;
}

export function HeroSection({ onScrollPromptClick }: HeroSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLDivElement | null>(null);
  const promptRef = useRef<HTMLButtonElement | null>(null);

  const [typedTitle, setTypedTitle] = useState("");
  const [typedSub, setTypedSub] = useState("");

  // GSAP fade-in + character-by-character hero text typing
  useEffect(() => {
    const fullTitle = "PIXELATE";
    const fullSub = "BY SAMIR";

    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
      );
      gsap.fromTo(
        subRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.35, ease: "power3.out" }
      );
      gsap.fromTo(
        promptRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, delay: 0.9, ease: "power2.out" }
      );
    });

    let titleIdx = 0;
    let subIdx = 0;
    const titleTimer = setInterval(() => {
      titleIdx++;
      setTypedTitle(fullTitle.slice(0, titleIdx));
      if (titleIdx >= fullTitle.length) {
        clearInterval(titleTimer);
      }
    }, 75);

    const subDelay = setTimeout(() => {
      const subTimer = setInterval(() => {
        subIdx++;
        setTypedSub(fullSub.slice(0, subIdx));
        if (subIdx >= fullSub.length) {
          clearInterval(subTimer);
        }
      }, 65);
    }, 520);

    return () => {
      ctx.revert();
      clearInterval(titleTimer);
      clearTimeout(subDelay);
    };
  }, []);

  // Background canvas: ASCII Mona Lisa slowly typing itself out character by character
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const monaSource = createMonaLisaCanvas(560, 720);
    const ramp = " .:-=+*#%@";

    let rafId = 0;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let luma: Float32Array = new Float32Array(0);
    let cellW = 12;
    let cellH = 14;
    let typedCount = 0;
    let holdFrames = 0;

    const setupGrid = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fit portrait ASCII grid cleanly in the center of the viewport
      const targetCell = width < 640 ? 10 : 13;
      cols = Math.max(32, Math.floor(width / targetCell));
      rows = Math.max(28, Math.floor(height / (targetCell * 1.15)));
      cellW = width / cols;
      cellH = height / rows;

      const sampled = sampleSourceToGrid(monaSource, cols, rows);
      luma = sampled.luma;
      // Start slightly pre-seeded so Mona Lisa silhouette starts forming right away
      typedCount = Math.floor(cols * rows * 0.14);
    };

    setupGrid();
    window.addEventListener("resize", setupGrid);

    const draw = () => {
      const totalCells = cols * rows;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      const fontSize = Math.max(8, Math.floor(Math.min(cellW, cellH) * 0.92));
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Advance typing cursor character-by-character across non-empty & empty cells
      if (typedCount < totalCells) {
        const charsPerFrame = Math.max(6, Math.floor(totalCells / 420));
        typedCount = Math.min(totalCells, typedCount + charsPerFrame);
      } else {
        holdFrames++;
        if (holdFrames > 260) {
          holdFrames = 0;
          typedCount = 0;
        }
      }

      for (let i = 0; i < typedCount; i++) {
        const lum = luma[i] ?? 0;
        if (lum < 0.08) continue;

        const r = Math.floor(i / cols);
        const c = i % cols;
        const ch = ramp[Math.round(lum * (ramp.length - 1))] ?? " ";
        if (ch === " ") continue;

        // Keep background subtle enough that centered PIXELATE typography pops sharply
        const alpha = Math.min(0.46, Math.max(0.06, lum * 0.44));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
      }

      // Draw bright typing head block cursor
      if (typedCount < totalCells) {
        const hr = Math.floor(typedCount / cols);
        const hc = typedCount % cols;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(hc * cellW, hr * cellH, cellW, cellH);
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setupGrid);
    };
  }, []);

  return (
    <section
      id="sec-hero"
      className="relative h-screen w-full border-b border-white bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background ASCII Mona Lisa Canvas typing character by character */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Center-aligned monumental title */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="mb-4 border border-[#333333] bg-black/85 px-3 py-1 text-[11px] tracking-[0.28em] text-white/75">
          &gt;_ MONOCHROME_ASCII_ENGINE
        </div>

        <h1
          ref={titleRef}
          className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-[0.18em] text-white uppercase select-none drop-shadow-[0_0_24px_rgba(0,0,0,0.95)]"
        >
          {typedTitle || "\u00A0"}
        </h1>

        <div
          ref={subRef}
          className="mt-4 flex items-center gap-2 text-sm sm:text-lg tracking-[0.38em] text-[#333333] sm:text-white/70 uppercase font-bold"
        >
          <span>{typedSub || "\u00A0"}</span>
          <span className="inline-block w-2.5 h-5 bg-white animate-terminal-blink" />
        </div>
      </div>

      {/* Bouncing scroll prompt at bottom */}
      <button
        ref={promptRef}
        type="button"
        onClick={onScrollPromptClick}
        data-cursor=">"
        className="absolute bottom-8 z-10 flex items-center gap-2 border border-white bg-black px-4 py-2 text-xs tracking-[0.2em] uppercase text-white hover:bg-white hover:text-black transition-colors animate-bounce"
      >
        <span>↓ Scroll to decode</span>
      </button>
    </section>
  );
}
