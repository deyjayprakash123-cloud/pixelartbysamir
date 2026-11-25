"use client";

import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

interface NavbarProps {
  scrollProgress: number;
  activeSection: string;
  onNavigate: (targetId: string) => void;
}

const NAV_ITEMS = [
  { id: "#sec-hero", label: "[01_HERO]" },
  { id: "#sec-demo", label: "[02_DECODE]" },
  { id: "#sec-workspace", label: "[03_WORKSPACE]" },
  { id: "#sec-footer", label: "[04_CREDITS]" },
];

export function Navbar({
  scrollProgress,
  activeSection,
  onNavigate,
}: NavbarProps) {
  const [utcTime, setUtcTime] = useState<string>("--:--:-- UTC");

  useEffect(() => {
    const updateClock = () => {
      setUtcTime(new Date().toISOString().slice(11, 19) + " UTC");
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white bg-black/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-8 h-12">
        <button
          type="button"
          data-cursor=">"
          onClick={() => onNavigate("#sec-hero")}
          className="flex items-center gap-2 text-xs font-extrabold tracking-widest hover:opacity-75 transition-opacity"
        >
          <Terminal className="w-4 h-4" />
          <span>PIXELATE // BY_SAMIR</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-cursor=">"
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1 text-[11px] font-bold tracking-wider border transition-colors ${
                  isActive
                    ? "border-white bg-white text-black"
                    : "border-transparent text-white hover:border-[#333333]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="hidden sm:inline text-white/60">{utcTime}</span>
          <span className="border border-white px-2 py-0.5">
            {String(Math.round(scrollProgress * 100)).padStart(3, "0")}%
          </span>
        </div>
      </div>

      {/* Brutalist scroll progress line */}
      <div className="h-[1px] w-full bg-[#333333]">
        <div
          className="h-full bg-white transition-[width] duration-75"
          style={{
            width: `${Math.min(100, Math.max(0, scrollProgress * 100))}%`,
          }}
        />
      </div>
    </header>
  );
}
