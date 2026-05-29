import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BAUIN — Billionaires AI Users Income Network",
  description:
    "Empowering users to build wealth through AI-driven income streams and collaborative network growth.",
  keywords: ["BAUIN", "AI income", "network", "wealth building", "billionaires"],
  openGraph: {
    title: "BAUIN Platform",
    description: "Billionaires AI Users Income Network",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
