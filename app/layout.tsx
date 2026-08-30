import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "LoopClose — Meeting follow-through",
  description: "Turn meeting commitments into accountable, verified outcomes.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title:"LoopClose — Meeting follow-through", description:"Turn meeting commitments into verified outcomes.", images:["/og.png"] },
  twitter: { card:"summary_large_image", title:"LoopClose — Meeting follow-through", description:"Turn meeting commitments into verified outcomes.", images:["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
