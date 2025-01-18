import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WipeDatabase } from "@/components/WipeDatabase";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { PerformanceCounter } from "@/components/PerformanceCounter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PerformanceMonitor } from "@/components/debug/PerformanceMonitor";
import { Toaster } from "@/components/ui/toaster";
import { PruneInitializer } from "@/components/PruneInitializer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Realtime Blockchain Analytics",
  description: "Real-time token monitoring and analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>
          <WebSocketProvider>
            <main className="container mx-auto p-4">
              <PerformanceCounter />
              {children}
            </main>
            <WipeDatabase />
            <PerformanceMonitor />
          </WebSocketProvider>
        </TooltipProvider>
        <PruneInitializer />
        <Toaster />
      </body>
    </html>
  );
}
