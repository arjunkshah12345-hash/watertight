import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE = "https://arjunkshah12345-hash.github.io/watertight/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Watertight",
    images: [{ url: "og.png", width: 1200, height: 630, alt: "Watertight: due diligence that doesn't leak" }],
  },
  twitter: { card: "summary_large_image", images: ["og.png"] },
  title: "Watertight | Due diligence that doesn't leak",
  description:
    "A private AI data room. Investors ask anything; sealed details never reach the model, every outbound byte is checked, and founders revoke access in one click. Attested confidential inference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
