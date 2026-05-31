import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export const metadata: Metadata = {
  title: {
    default: "BAUIN — Billionaires AI Users Income Network",
    template: "%s | BAUIN",
  },
  alternates: { canonical: APP_URL },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much can I earn on BAUIN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Certified BAUIN members typically earn between ₦50,000 and ₦500,000 per month depending on their activity level, number of referrals, and participation in quiz competitions.",
      },
    },
    {
      "@type": "Question",
      name: "What is BAUIN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BAUIN (Billionaires AI Users Income Network) is Nigeria's leading AI income platform where members earn through certified AI tasks, 50% referral commissions, live quiz prize competitions, and AI-powered productivity tools.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started on BAUIN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Register on BAUIN, choose your income category, pay the one-time certification fee, study and pass your certification test, then start accessing daily earning tasks and referral links immediately.",
      },
    },
    {
      "@type": "Question",
      name: "Is BAUIN legit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. BAUIN is a verified Nigerian platform with over 50,000 active members, instant naira payouts to Nigerian bank accounts, and a transparent earnings dashboard that members can audit at any time.",
      },
    },
  ],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
