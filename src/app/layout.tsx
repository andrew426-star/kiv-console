import type { Metadata, Viewport } from "next";
import { Syne, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K.I.V — Kivaro Intelligence Vectoring",
  description: "The unified operating system for Kivaro AI.",
  // Opens full-screen from the home screen (app/manifest.ts).
  appleWebApp: { capable: true, title: "K.I.V.", statusBarStyle: "black-translucent" },
};

// viewport-fit=cover lets the phone bars reach under the notch and home
// bar; they pad back out with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080c0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col grid-pattern noise-overlay">{children}</body>
    </html>
  );
}
