import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AppHeader } from "@/components/foodsnap/app-header";
import { Disclaimer } from "@/components/foodsnap/disclaimer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "FoodSnap AI — Snap your meal. Get a smart nutrition estimate.",
  description:
    "Upload a photo of your meal and get an AI-powered estimate of calories and macros. Approximate, friendly, and for general nutrition awareness only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans`}
      >
        <AppHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/70 py-8">
          <div className="container flex flex-col gap-3">
            <Disclaimer />
            <p className="text-center text-xs text-muted-foreground">
              FoodSnap AI · Built as an MVP demo
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
