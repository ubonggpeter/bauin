import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallBanner from "@/components/pwa/InstallBanner";
import PushManager from "@/components/pwa/PushManager";
import NetworkStatusToast from "@/components/NetworkStatusToast";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import MilestoneBanner from "@/components/MilestoneBanner";
import { JsonLd } from "@/components/JsonLd";
import { ThemeProvider } from "@/context/ThemeContext";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "BAUIN — Billionaires AI Users Income Network",
    template: "%s | BAUIN",
  },
  description:
    "Join BAUIN — Africa's #1 AI income network. Earn ₦50,000–₦500,000/month through certified AI tasks, referrals, quiz competitions, and network growth. Get certified today.",
  keywords: [
    "BAUIN",
    "earn online Nigeria",
    "AI income network",
    "billionaires AI users income network",
    "BAUIN certification",
    "make money Nigeria AI",
    "Nigerian AI platform",
    "passive income Nigeria",
  ],
  authors: [{ name: "BAUIN Editorial Team", url: APP_URL }],
  creator: "BAUIN Platform",
  publisher: "BAUIN Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BAUIN",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: APP_URL,
    siteName: "BAUIN",
    title: "BAUIN — Billionaires AI Users Income Network",
    description:
      "Earn ₦50,000–₦500,000/month on Africa's #1 AI income network. Certified tasks, referral commissions, live quiz prizes, and AI tools — all in one platform.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "BAUIN — Billionaires AI Users Income Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BAUINplatform",
    creator: "@BAUINplatform",
    title: "BAUIN — Billionaires AI Users Income Network",
    description:
      "Africa's #1 AI income network. Earn through certified tasks, referrals, and live quiz competitions. Join free today.",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: "#1A6659",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${APP_URL}/#organization`,
  name: "BAUIN",
  alternateName: "Billionaires AI Users Income Network",
  url: APP_URL,
  logo: {
    "@type": "ImageObject",
    url: `${APP_URL}/icons/icon-512.png`,
    width: 512,
    height: 512,
  },
  description:
    "BAUIN is Africa's leading AI income network, enabling Nigerians to earn through AI-powered certification tasks, referral commissions, and live quiz competitions.",
  foundingLocation: { "@type": "Country", name: "Nigeria" },
  areaServed: "NG",
  sameAs: [
    "https://twitter.com/BAUINplatform",
    "https://instagram.com/BAUINplatform",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${APP_URL}/#website`,
  url: APP_URL,
  name: "BAUIN",
  description: "Billionaires AI Users Income Network",
  publisher: { "@id": `${APP_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/blog?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    // suppressHydrationWarning prevents React mismatch warnings when the
    // anti-flash script adds the 'dark' class before hydration.
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Runs before first paint — avoids flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('bauin-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if((t||p)==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <MilestoneBanner />
            {children}
            <MaintenanceOverlay />
            <NetworkStatusToast />
            <ServiceWorkerRegistration />
            <InstallBanner />
            <PushManager />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
