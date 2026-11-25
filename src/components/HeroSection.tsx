"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { createMonaLisaCanvas, loadMonaLisaSource } from "@/lib/monaLisa";
import { deterministicNoise, sampleSourceToGrid } from "@/lib/matrixEngine";

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
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
      );
      gsap.fromTo(
        subRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.35, ease: "power3.out" }
      );
      gsap.fromTo(
        promptRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, delay: 0.85, ease: "power2.out" }
      );
    });

    let titleIdx = 0;
    let subIdx = 0;
    const titleTimer = setInterval(() => {
      titleIdx++;
      setTypedTitle(fullTitle.slice(0, titleIdx));
      if (titleIdx >= fullTitle.length) clearInterval(titleTimer);
    }, 70);

    const subDelay = setTimeout(() => {
      const subTimer = setInterval(() => {
        subIdx++;
        setTypedSub(fullSub.slice(0, subIdx));
        if (subIdx >= fullSub.length) clearInterval(subTimer);
      }, 65);
    }, 480);

    return () => {
      ctx.revert();
      clearInterval(titleTimer);
      clearTimeout(subDelay);
    };
  }, []);

  // Background canvas: Real Mona Lisa ASCII typing out character-by-character with continuous shimmer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let activeSource: HTMLImageElement | HTMLCanvasElement =
      createMonaLisaCanvas(560, 720);
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
    let tick = 0;
    let cancelled = false;

    const setupGrid = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCell = width < 640 ? 9 : 13;
      cols = Math.max(30, Math.floor(width / targetCell));
      rows = Math.max(28, Math.floor(height / (targetCell * 1.15)));
      cellW = width / cols;
      cellH = height / rows;

      const sampled = sampleSourceToGrid(activeSource, cols, rows);
      luma = sampled.luma;
      typedCount = Math.max(typedCount, Math.floor(cols * rows * 0.16));
    };

    setupGrid();
    window.addEventListener("resize", setupGrid);

    // Upgrade seamlessly to the user's real Mona Lisa image once loaded
    loadMonaLisaSource().then((img) => {
      if (cancelled) return;
      activeSource = img;
      const sampled = sampleSourceToGrid(activeSource, cols, rows);
      luma = sampled.luma;
    });

    const draw = () => {
      tick++;
      const totalCells = cols * rows;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      const fontSize = Math.max(7, Math.floor(Math.min(cellW, cellH) * 0.92));
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (typedCount < totalCells) {
        const charsPerFrame = Math.max(8, Math.floor(totalCells / 360));
        typedCount = Math.min(totalCells, typedCount + charsPerFrame);
      } else {
        holdFrames++;
        if (holdFrames > 300) {
          holdFrames = 0;
          typedCount = 0;
        }
      }

      for (let i = 0; i < typedCount; i++) {
        const lum = luma[i] ?? 0;
        if (lum < 0.08) continue;

        const r = Math.floor(i / cols);
        const c = i % cols;
        let ch = ramp[Math.round(lum * (ramp.length - 1))] ?? " ";
        if (ch === " ") continue;

        // Subtle continuous Matrix binary shimmer so background never feels static
        if (lum > 0.35 && deterministicNoise(c, r, Math.floor(tick / 6)) > 0.95) {
          ch = deterministicNoise(r, c, tick) > 0.5 ? "1" : "0";
        }

        const alpha = Math.min(0.48, Math.max(0.08, lum * 0.46));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
      }

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
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setupGrid);
    };
  }, []);

  return (
    <section
      id="sec-hero"
      className="relative min-h-[100svh] h-[100dvh] w-full border-b border-white bg-black flex flex-col items-center justify-center overflow-hidden px-4"
    >
      {/* Background ASCII Mona Lisa Canvas typing character by character */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Center-aligned monumental title */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-full">
        <div className="mb-4 border border-[#333333] bg-black/85 px-3 py-1 text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-[0.28em] text-white/75">
          &gt;_ MONOCHROME_ASCII_ENGINE
        </div>

        <h1
          ref={titleRef}
          className="text-5xl sm:text-8xl md:text-9xl font-extrabold tracking-[0.14em] sm:tracking-[0.18em] text-white uppercase select-none drop-shadow-[0_0_24px_rgba(0,0,0,0.95)]"
        >
          {typedTitle || "\u00A0"}
        </h1>

        <div
          ref={subRef}
          className="mt-4 flex items-center gap-2 text-xs sm:text-lg tracking-[0.32em] sm:tracking-[0.38em] text-white/70 uppercase font-bold"
        >
          <span>{typedSub || "\u00A0"}</span>
          <span className="inline-block w-2 h-4 sm:w-2.5 sm:h-5 bg-white animate-terminal-blink" />
        </div>
      </div>

      {/* Bouncing scroll prompt at bottom */}
      <button
        ref={promptRef}
        type="button"
        onClick={onScrollPromptClick}
        data-cursor=">"
        className="absolute bottom-6 sm:bottom-8 z-10 flex items-center gap-2 border border-white bg-black px-4 py-2 text-[11px] sm:text-xs tracking-[0.18em] uppercase text-white hover:bg-white hover:text-black transition-colors animate-bounce"
      >
        <span>↓ Scroll to decode</span>
      </button>
    </section>
  );
}
