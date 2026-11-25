"use client";

import { useEffect, useState } from "react";

type CursorMode = "default" | "link" | "action";

export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [mode, setMode] = useState<CursorMode>("default");
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    // Only enable on devices with a fine pointer (mouse/trackpad)
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) {
        setMode("default");
        return;
      }

      const customAttr = target
        .closest("[data-cursor]")
        ?.getAttribute("data-cursor");
      if (customAttr === "+" || customAttr === "action") {
        setMode("action");
      } else if (customAttr === ">" || customAttr === "link") {
        setMode("link");
      } else if (target.closest("a, button")) {
        setMode("link");
      } else if (
        target.closest("input, label, canvas, [role='button']")
      ) {
        setMode("action");
      } else {
        setMode("default");
      }
    };

    const onDown = () => setIsPressed(true);
    const onUp = () => setIsPressed(false);
    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (!visible) return null;

  const glyph = mode === "action" ? "+" : mode === "link" ? ">" : "■";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9999] mix-blend-difference"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${
          isPressed ? 0.82 : 1
        })`,
        transition: "transform 60ms linear",
      }}
    >
      {mode === "default" ? (
        <div className="w-4 h-4 border border-white bg-transparent flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white" />
        </div>
      ) : (
        <div className="w-7 h-7 border border-white bg-white text-black flex items-center justify-center text-sm font-extrabold leading-none">
          {glyph}
        </div>
      )}
    </div>
  );
}
