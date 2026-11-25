"use client";

export function FooterSection() {
  return (
    <footer
      id="sec-footer"
      className="w-full bg-black text-white py-14 sm:py-20"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
        <div className="border border-white bg-black p-6 sm:p-10 font-mono text-sm sm:text-base space-y-3">
          <div className="text-xs tracking-[0.22em] text-white/60 mb-4">
            {"// TERMINAL_CREDITS"}
          </div>

          <p className="font-bold tracking-widest uppercase">
            &gt;_ DEVELOPED BY: SAMIR
          </p>

          <p className="font-bold tracking-widest uppercase flex flex-wrap items-center gap-2">
            <span>&gt;_ EMAIL:</span>
            <a
              href="mailto:samirpatra12399@gmail.com"
              data-cursor=">"
              className="underline underline-offset-4 hover:bg-white hover:text-black px-1 transition-colors"
            >
              SAMIRPATRA12399@GMAIL.COM
            </a>
            <span
              aria-hidden="true"
              className="inline-block font-extrabold animate-terminal-blink"
            >
              _
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
