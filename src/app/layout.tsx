import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./theme.css";
const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Common Form — Everyday, considered.",
    template: "%s — Common Form",
  },
  description: "A local clothing storefront prototype.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
