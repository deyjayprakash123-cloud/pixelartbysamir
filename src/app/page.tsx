"use client";

import { useRef } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { DemoSection } from "@/components/DemoSection";
import { Creator } from "@/components/Creator";
import { FooterSection } from "@/components/FooterSection";
import { useGsapScroll } from "@/hooks/useGsapScroll";

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { scrollProgress, activeSection, scrollTo } = useGsapScroll(rootRef);

  return (
    <div ref={rootRef} className="min-h-screen bg-black text-white font-mono">
      {/* Custom Blocky Interactive Cursor */}
      <CustomCursor />

      {/* Fixed Scanline & Film Grain Texture Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 crt-scanlines film-grain-overlay"
      />

      <Navbar
        scrollProgress={scrollProgress}
        activeSection={activeSection}
        onNavigate={scrollTo}
      />

      <main>
        <HeroSection onScrollPromptClick={() => scrollTo("#sec-demo")} />

        <DemoSection />

        <Creator />
      </main>

      <FooterSection />
    </div>
  );
}
