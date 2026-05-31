"use client";

import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">{title}</p>
      <div className="bg-white border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3.5">{children}</div>;
}

function LinkRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-light transition-colors">
      <div>
        <p className="text-sm font-medium text-text-dark">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const user = session?.user;

  return (
    <div className="min-h-screen bg-bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-black text-text-dark">Profile &amp; Settings</h1>
        </div>

        {/* Avatar card */}
        <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-black flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-text-dark truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
            {user?.role && (
              <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                {user.role}
              </span>
            )}
          </div>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <Row>
            <ThemeToggle variant="row" />
          </Row>
          <Row>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-dark">Current theme</p>
                <p className="text-xs text-gray-500 capitalize">{theme === "dark" ? "Dark mode" : "Light mode"} active</p>
              </div>
            </div>
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account">
          <LinkRow href="/dashboard/wallet" label="Wallet" sub="View balance and transactions" />
          <LinkRow href="/dashboard/referral" label="Referrals" sub="Earn by inviting friends" />
          <LinkRow href="/dashboard/stories/subscriptions" label="Story subscriptions" sub="Manage seller subscriptions" />
        </Section>

        {/* Actions */}
        <Section title="Session">
          <Row>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 w-full text-red-500 hover:text-red-600 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span className="text-sm font-semibold">Sign out</span>
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}
