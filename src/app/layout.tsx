import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Dashboard",
  description: "Live portfolio & analysis for algorithmic trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 min-h-screen dark:bg-slate-950 dark:text-slate-100`}
      >
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">Trading Dashboard</a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/portfolio" className="text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">Live Portfolio</a>
              <a href="/analysis" className="text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">Analysis</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
