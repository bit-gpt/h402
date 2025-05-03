import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { EvmWalletProvider } from "@/evm/context/EvmWalletContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BitGPT 402 Example",
  description: "BitGPT 402 Example App using Next.js",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark:bg-gray-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#2e74ff] dark:bg-gray-900 w-dvw h-dvh text-black dark:text-white`}
      >
        <EvmWalletProvider>
          <header className="flex justify-between items-center -mb-20 mr-2">
            <div className="text-2xl font-bold text-white"></div>
            <div className="flex gap-4 items-center pt-2">
              <Link
                href="https://bitgpt.xyz/discord"
                className="text-black dark:text-white px-4 py-2 rounded-full font-medium border border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join Community
              </Link>
              <Link
                href="https://github.com/bit-gpt/h402"
                className="bg-[#2E74FF] hover:bg-[#2361DB] dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </Link>
            </div>
          </header>
          {children}
        </EvmWalletProvider>
      </body>
    </html>
  );
}
