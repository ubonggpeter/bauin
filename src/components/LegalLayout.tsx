import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_NAV = [
  { label: "Terms of Service",   href: "/terms" },
  { label: "Privacy Policy",     href: "/privacy" },
  { label: "Refund Policy",      href: "/refund-policy" },
  { label: "Quiz Rules",         href: "/quiz-rules" },
  { label: "Betting Disclaimer", href: "/betting-disclaimer" },
] as const;

export interface TocItem {
  id: string;
  label: string;
}

interface Props {
  title: string;
  effective: string;
  toc: TocItem[];
  children: ReactNode;
}

export default function LegalLayout({ title, effective, toc, children }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow">
              <span className="text-white font-black text-sm">B</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">BAUIN</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-primary transition-colors hidden sm:block"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary to-primary-light py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{title}</h1>
          <p className="text-white/70 text-sm">Effective date: {effective}</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-14">
          {/* TOC */}
          <aside className="mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-20">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Contents
              </p>
              <nav className="space-y-0.5">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2.5 py-1.5 text-sm text-gray-500 hover:text-primary transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/25 group-hover:bg-primary flex-shrink-0 transition-colors" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main>{children}</main>
        </div>
      </div>

      {/* ── Legal Footer ── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center mb-4">
            {LEGAL_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-primary hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} BAUIN Platform. All rights reserved. · Governed by Nigerian law.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Re-usable section block ── */
interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-[17px] font-bold text-primary border-l-4 border-primary pl-4 py-0.5 mb-4">
        {title}
      </h2>
      <div className="text-gray-600 text-[15px] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-semibold text-gray-800 text-[14px] mt-4 mb-1">{children}</h3>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="list-none space-y-1 pl-0">
      {children}
    </ul>
  );
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-[15px] text-gray-600">
      <span className="text-primary mt-1.5 flex-shrink-0">▸</span>
      <span>{children}</span>
    </li>
  );
}
