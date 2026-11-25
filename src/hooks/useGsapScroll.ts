"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const SECTION_SELECTORS = [
  "#sec-hero",
  "#sec-demo",
  "#sec-workspace",
  "#sec-footer",
];

/**
 * Coordinates Lenis smooth scrolling with GSAP ScrollTrigger across both desktop
 * and mobile touch screens without breaking sticky containers.
 */
export function useGsapScroll<T extends HTMLElement = HTMLElement>(
  scopeRef: RefObject<T | null>
) {
  const lenisRef = useRef<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("#sec-hero");

  useEffect(() => {
    ScrollTrigger.config({ ignoreMobileResize: true });

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ({ progress }: { progress: number }) => {
      setScrollProgress(progress);
      ScrollTrigger.update();
    });

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      SECTION_SELECTORS.forEach((selector) => {
        ScrollTrigger.create({
          trigger: selector,
          start: "top 45%",
          end: "bottom 45%",
          onEnter: () => setActiveSection(selector),
          onEnterBack: () => setActiveSection(selector),
        });
      });
    }, scopeRef);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ctx.revert();
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [scopeRef]);

  const scrollTo = useCallback((target: string) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: 0 });
    } else {
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return {
    scrollProgress,
    activeSection,
    scrollTo,
  };
}
