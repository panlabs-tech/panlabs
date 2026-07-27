import localFont from "next/font/local";
import { siteMetadata } from "@/lib/seo";
import "@/styles/theme.css";
import "@/styles/base.css";

// Self-hosted variable fonts (latin subset, woff2) — no Google Fonts request at
// build or runtime (#15). next/font fingerprints and serves them locally.
const manrope = localFont({
  src: "../fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = siteMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
