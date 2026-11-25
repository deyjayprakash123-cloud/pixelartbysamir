import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PIXELATE // BY SAMIR — ASCII & Binary Matrix Studio",
  description:
    "Brutalist monochrome client-side web app converting images into animated ASCII & Binary Matrix art with native video export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-black text-white font-mono antialiased overflow-x-hidden selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
