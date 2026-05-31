import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallBanner from "@/components/pwa/InstallBanner";
import PushManager from "@/components/pwa/PushManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BAUIN — Billionaires AI Users Income Network",
  description:
    "Empowering users to build wealth through AI-driven income streams and collaborative network growth.",
  keywords: ["BAUIN", "AI income", "network", "wealth building", "billionaires"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BAUIN",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "BAUIN Platform",
    description: "Billionaires AI Users Income Network",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A6659",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ServiceWorkerRegistration />
        <InstallBanner />
        <PushManager />
      </body>
    </html>
  );
}
