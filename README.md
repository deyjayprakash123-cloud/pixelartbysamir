# PIXELATE // BY SAMIR

A brutalist, pure black-and-white (`#000000` / `#FFFFFF`) Next.js web application that converts user-uploaded images into animated ASCII and Binary Matrix art on an HTML5 `<canvas>` and exports the live animation as a video (`WebM` / `MP4` via `MediaRecorder`).

## Tech Stack
- **Next.js (App Router, React, TypeScript)** — 100% client-side processing (`"use client"`), ready for Vercel
- **Tailwind CSS + Custom CSS** — Brutalist `rounded-none`, `1px` borders, scanlines, glitch & marquee keyframes
- **GSAP + ScrollTrigger & Lenis** — Smooth scrolling and scroll-choreographed reveals
- **Lucide React & JetBrains Mono** — Terminal-grade iconography and monospace typography
- **HTML5 `<canvas>` + `MediaRecorder` API** — Real-time luminance quantization & native video capture

## Local Setup
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
