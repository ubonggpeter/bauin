"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Static data ───────────────────────────────────────────────────────────────

const BENEFITS = [
  "AI-powered income streams working 24 / 7",
  "50% referral commission on every registration",
  "Real-time earnings dashboard & analytics",
  "Exclusive AI tools & certification access",
  "Investment pools with tracked returns",
  "Same-day wallet withdrawals, zero hidden fees",
] as const;

const CATEGORIES = [
  { id: "ai-content",   icon: "✍️", name: "AI Content Creator",    min: 50_000,  max: 200_000, fee: 5_000  },
  { id: "data-analyst", icon: "📊", name: "AI Data Analyst",        min: 80_000,  max: 350_000, fee: 8_000  },
  { id: "developer",    icon: "💻", name: "AI Developer",            min: 150_000, max: 500_000, fee: 15_000 },
  { id: "marketer",     icon: "📱", name: "Digital Marketer",        min: 40_000,  max: 180_000, fee: 4_000  },
  { id: "tutor",        icon: "🎓", name: "AI Tutor",                min: 60_000,  max: 250_000, fee: 6_000  },
  { id: "video-editor", icon: "🎬", name: "AI Video Editor",         min: 70_000,  max: 300_000, fee: 7_000  },
  { id: "crypto",       icon: "₿",  name: "Crypto & DeFi Analyst",  min: 100_000, max: 450_000, fee: 10_000 },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

const FULL_FEE       = CATEGORIES.reduce((s, c) => s + c.fee, 0); // ₦55,000
const BUNDLE_DISCOUNT = 7_000;
const BUNDLE_PRICE    = FULL_FEE - BUNDLE_DISCOUNT;                // ₦48,000

const ngn = (n: number) => `₦${n.toLocaleString("en-NG")}`;

// ── Shared icon ───────────────────────────────────────────────────────────────

function Tick({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3.5 3.5L10 2.5" />
    </svg>
  );
}

// ── Left teal panel ───────────────────────────────────────────────────────────

interface LeftPanelProps { step: 1 | 2; name: string; email: string }

function LeftPanel({ step, name, email }: LeftPanelProps) {
  const STEP_TIPS = [
    "Each category unlocks a dedicated AI tool set",
    "Earn from daily tasks, quizzes & referrals",
    "Bundle discount when you select all 7 categories",
    "30-day access — renewable from your dashboard",
  ] as const;

  return (
    <aside className="bg-primary w-full lg:w-[38%] xl:w-[34%] shrink-0 flex flex-col px-8 xl:px-12 py-10 text-white">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center shadow-md">
          <span className="text-text-dark font-black text-base leading-none">B</span>
        </div>
        <div>
          <span className="font-black text-xl leading-none">BAUIN</span>
          <p className="text-[9px] text-white/50 leading-none tracking-widest uppercase mt-0.5">
            AI Income Network
          </p>
        </div>
      </Link>

      {/* Step stepper */}
      <div className="flex items-center gap-1 mb-10">
        {(["Account", "Categories"] as const).map((label, i) => {
          const n = (i + 1) as 1 | 2;
          const done  = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className={`w-10 h-0.5 transition-colors ${step > 1 ? "bg-gold" : "bg-white/20"}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors
                  ${done || active ? "bg-gold text-text-dark" : "bg-white/20 text-white"}`}>
                  {done ? <Tick className="w-3.5 h-3.5" /> : n}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? "text-gold" : "text-white/45"}`}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step-dependent content */}
      <div className="flex-1">
        {step === 1 ? (
          <>
            <h2 className="text-2xl font-black leading-snug mb-7">
              Join the network that rewards your AI skills
            </h2>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-gold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Tick />
                  </span>
                  <span className="text-sm text-white/85 leading-snug">{b}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {name && (
              <div className="bg-white/10 rounded-xl px-4 py-3 mb-7 flex items-center gap-3">
                <div className="w-9 h-9 bg-gold rounded-full flex items-center justify-center font-black text-text-dark text-sm shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white leading-tight truncate">{name}</p>
                  <p className="text-xs text-white/50 truncate">{email}</p>
                </div>
              </div>
            )}
            <h2 className="text-2xl font-black leading-snug mb-2">
              Choose your income streams
            </h2>
            <p className="text-white/65 text-sm mb-7 leading-relaxed">
              Pick categories that match your skills and start earning after certification.
            </p>
            <ul className="space-y-3">
              {STEP_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Tick />
                  </span>
                  <span className="text-sm text-white/85 leading-snug">{tip}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <blockquote className="mt-10 border-l-2 border-gold/50 pl-4 text-sm text-white/40 italic hidden lg:block">
        &ldquo;The best time to join the BAUIN network is today.&rdquo;
      </blockquote>
    </aside>
  );
}

// ── Step 1 — account form ─────────────────────────────────────────────────────

interface Step1Props {
  form:     { name: string; email: string; phone: string; password: string; referral_code: string };
  setField: (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  error:    string;
  onSubmit: (e: React.FormEvent) => void;
}

function StepOneForm({ form, setField, error, onSubmit }: Step1Props) {
  const hasRef = form.referral_code.trim().length > 0;
  const INPUT  = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder-gray-400";

  return (
    <main className="flex-1 bg-white flex items-start justify-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-md">

        {/* Referral banner */}
        {hasRef && (
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3">
            <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
              <Tick className="w-3.5 h-3.5" />
            </span>
            <p className="text-sm font-medium">
              Referral code{" "}
              <span className="font-mono font-black tracking-widest text-green-900">
                {form.referral_code.toUpperCase()}
              </span>{" "}
              applied — you&apos;re joining via a member invite.
            </p>
          </div>
        )}

        <h2 className="text-2xl font-black text-text-dark mb-1">Create your account</h2>
        <p className="text-gray-500 text-sm mb-8">
          Already a member?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Full Name</label>
            <input type="text" required value={form.name} onChange={setField("name")}
              placeholder="John Doe" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Email Address</label>
            <input type="email" required value={form.email} onChange={setField("email")}
              placeholder="you@example.com" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Phone Number</label>
            <input type="tel" required value={form.phone} onChange={setField("phone")}
              placeholder="+234 800 000 0000" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">Password</label>
            <input type="password" required minLength={8} value={form.password}
              onChange={setField("password")} placeholder="Minimum 8 characters" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1.5">
              Referral Code <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text" value={form.referral_code} onChange={setField("referral_code")}
              placeholder="8-character code" maxLength={8}
              className={`${INPUT} font-mono uppercase tracking-widest ${
                hasRef ? "border-green-300 bg-green-50 text-green-800" : ""
              }`}
            />
          </div>

          <button type="submit"
            className="w-full mt-2 bg-primary hover:bg-primary-dark text-white font-black py-3.5 rounded-xl transition-colors text-sm shadow-md shadow-primary/20">
            Continue to Category Selection →
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to our{" "}
          <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}

// ── Step 2 — category cards ───────────────────────────────────────────────────

function CategoryCard({
  cat, selected, onToggle,
}: {
  cat: (typeof CATEGORIES)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`relative w-full text-left rounded-xl border-2 p-4 flex flex-col transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer select-none
        ${selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-white hover:border-primary/40 hover:shadow-sm"
        }`}
    >
      {/* Checkmark badge */}
      <span className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all
        ${selected ? "bg-primary text-white shadow scale-100 opacity-100" : "bg-border/60 text-transparent scale-75 opacity-0"}`}>
        <Tick />
      </span>

      <span className="text-3xl mb-2.5 leading-none">{cat.icon}</span>
      <h3 className="font-black text-text-dark text-sm leading-tight pr-8">{cat.name}</h3>
      <p className="text-xs text-gray-400 mt-1">{ngn(cat.min)} – {ngn(cat.max)}/mo</p>

      <p className={`text-sm font-black mt-auto pt-3 ${selected ? "text-primary" : "text-gold"}`}>
        {ngn(cat.fee)}
      </p>
    </button>
  );
}

function BundleCard({ allSelected, onToggle }: { allSelected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={allSelected}
      className={`relative w-full text-left rounded-xl border-2 p-4 flex flex-col transition-all focus:outline-none focus:ring-2 focus:ring-gold/40 cursor-pointer select-none
        ${allSelected
          ? "border-gold bg-gold/10 shadow-lg"
          : "border-dashed border-gold/60 bg-gradient-to-br from-gold/5 to-primary/5 hover:border-gold hover:shadow-sm"
        }`}
    >
      <span className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all
        ${allSelected ? "bg-gold text-text-dark shadow scale-100 opacity-100" : "opacity-0 scale-75"}`}>
        <Tick />
      </span>

      <span className="text-3xl mb-2.5 leading-none">🎯</span>
      <h3 className="font-black text-text-dark text-sm leading-tight">Complete Bundle</h3>
      <p className="text-xs text-gray-400 mt-1">All 7 categories · Best value</p>

      <div className="mt-auto pt-3">
        <p className="text-sm font-black text-primary">
          {ngn(BUNDLE_PRICE)}{" "}
          <span className="text-xs font-normal text-gray-400 line-through">{ngn(FULL_FEE)}</span>
        </p>
        <p className="text-xs text-green-600 font-semibold mt-0.5">Save {ngn(BUNDLE_DISCOUNT)}</p>
      </div>
    </button>
  );
}

// ── Pricing sidebar (desktop) ─────────────────────────────────────────────────

interface SidebarProps {
  selected:  Set<CatId>;
  subtotal:  number;
  discount:  number;
  total:     number;
  loading:   boolean;
  onProceed: () => void;
  onBack:    () => void;
}

function PricingSidebar({ selected, subtotal, discount, total, loading, onProceed, onBack }: SidebarProps) {
  const items = CATEGORIES.filter((c) => selected.has(c.id));
  return (
    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-l border-border bg-white">
      <div className="sticky top-0 p-6 flex flex-col overflow-y-auto max-h-screen">
        <h3 className="font-black text-text-dark text-base mb-5">Your Selection</h3>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Select at least one category to continue.
          </p>
        ) : (
          <ul className="space-y-2.5 mb-2 flex-1">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{c.icon}</span>
                  <span className="text-text-dark truncate">{c.name}</span>
                </span>
                <span className="font-semibold text-gray-600 shrink-0">{ngn(c.fee)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Pricing breakdown */}
        <div className="border-t border-border pt-4 space-y-2.5 mt-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="font-semibold text-text-dark">{ngn(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
              <span className="flex items-center gap-1">
                <span>🎉</span> Bundle Discount
              </span>
              <span>−{ngn(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline font-black text-text-dark border-t border-border pt-3">
            <span className="text-base">Total</span>
            <span className="text-xl text-primary">{ngn(total)}</span>
          </div>
        </div>

        {/* Proceed button */}
        <button
          type="button"
          onClick={onProceed}
          disabled={selected.size === 0 || loading}
          className="mt-5 w-full bg-gold hover:bg-yellow-400 text-text-dark font-black py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-gold/20 text-sm"
        >
          {loading ? "Creating account…" : "Proceed to Payment →"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-2.5 flex items-center justify-center gap-1.5">
          <span>🔒</span> Secured by Paystack
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 text-center text-xs text-gray-400 hover:text-primary transition-colors"
        >
          ← Back to account details
        </button>
      </div>
    </aside>
  );
}

// ── Mobile sticky bottom bar ──────────────────────────────────────────────────

function MobileBottomBar({
  selected, total, discount, loading, onProceed,
}: {
  selected: Set<CatId>; total: number; discount: number;
  loading: boolean; onProceed: () => void;
}) {
  const count = selected.size;
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border z-40 shadow-2xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-lg mx-auto">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">
            {count === 0 ? "No categories selected" : `${count} ${count === 1 ? "category" : "categories"}`}
          </p>
          <p className="text-xl font-black text-text-dark leading-tight">{ngn(total)}</p>
          {discount > 0 && (
            <p className="text-xs text-green-600 font-semibold">−{ngn(discount)} bundle saving</p>
          )}
        </div>
        <button
          type="button"
          onClick={onProceed}
          disabled={count === 0 || loading}
          className="bg-gold hover:bg-yellow-400 text-text-dark font-black px-5 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-md text-sm"
        >
          {loading ? "…" : "Proceed →"}
        </button>
      </div>
    </div>
  );
}

// ── Step 2 wrapper ────────────────────────────────────────────────────────────

interface Step2Props extends Omit<SidebarProps, "onBack"> {
  allSelected: boolean;
  onToggle:    (id: CatId) => void;
  onSelectAll: () => void;
  error:       string;
  onBack:      () => void;
}

function StepTwoContent(props: Step2Props) {
  const { selected, allSelected, onToggle, onSelectAll,
          subtotal, discount, total, loading, error, onProceed, onBack } = props;

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Scrollable left / grid area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 lg:px-8 py-7 pb-28 lg:pb-10 max-w-3xl">

          <div className="mb-5">
            <h2 className="text-2xl font-black text-text-dark mb-1">Select Your Categories</h2>
            <p className="text-sm text-gray-500">Choose one or more income streams to register for.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── Bundle banner ── */}
          <div className="bg-primary rounded-2xl px-5 py-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-gold font-black text-base leading-tight">
                Select all 7 categories — save {ngn(BUNDLE_DISCOUNT)}
              </p>
              <p className="text-white/65 text-xs mt-0.5">
                Bundle price: {ngn(BUNDLE_PRICE)} instead of {ngn(FULL_FEE)}
              </p>
            </div>
            <button
              type="button"
              onClick={onSelectAll}
              className={`shrink-0 font-black text-sm px-5 py-2.5 rounded-full transition-colors ${
                allSelected
                  ? "bg-white/20 text-white border-2 border-white/30 hover:bg-white/30"
                  : "bg-gold text-text-dark hover:bg-yellow-400"
              }`}
            >
              {allSelected ? "✓ All Selected" : "Select All 7 →"}
            </button>
          </div>

          {/* ── 8-card grid: 7 categories + 1 bundle card ── */}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                selected={selected.has(cat.id)}
                onToggle={() => onToggle(cat.id)}
              />
            ))}
            <BundleCard allSelected={allSelected} onToggle={onSelectAll} />
          </div>

          {/* Mobile back link */}
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden mt-6 text-sm text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
          >
            ← Back to account details
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <PricingSidebar
        selected={selected}
        subtotal={subtotal}
        discount={discount}
        total={total}
        loading={loading}
        onProceed={onProceed}
        onBack={onBack}
      />

      {/* Mobile sticky bottom bar */}
      <MobileBottomBar
        selected={selected}
        total={total}
        discount={discount}
        loading={loading}
        onProceed={onProceed}
      />
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ email, selectedCount, total }: { email: string; selectedCount: number; total: number }) {
  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-border max-w-sm w-full p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-text-dark mb-2">Account created!</h2>
        <p className="text-gray-500 text-sm mb-5">
          Check <strong className="text-text-dark">{email}</strong> for your verification link.
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-left">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Categories selected</span>
            <span className="font-bold text-text-dark">{selectedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total fee</span>
            <span className="font-black text-primary">{ngn(total)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-3 border-t border-border/60 pt-2">
            Complete payment from your dashboard to unlock category access.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-5">Redirecting to sign in…</p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface RegisterFormProps { initialRef: string }

export default function RegisterForm({ initialRef }: RegisterFormProps) {
  const router  = useRouter();
  const [step,     setStep]    = useState<1 | 2>(1);
  const [form,     setFormState] = useState({
    name: "", email: "", phone: "", password: "",
    referral_code: initialRef,
  });
  const [selected, setSelected] = useState<Set<CatId>>(new Set());
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const allSelected = selected.size === CATEGORIES.length;

  const { subtotal, discount, total } = useMemo(() => {
    const sub  = CATEGORIES.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.fee, 0);
    const disc = allSelected ? BUNDLE_DISCOUNT : 0;
    return { subtotal: sub, discount: disc, total: sub - disc };
  }, [selected, allSelected]);

  function setField(f: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormState((p) => ({ ...p, [f]: e.target.value }));
  }

  function toggleCategory(id: CatId) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(CATEGORIES.map((c) => c.id)));
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep(2);
  }

  async function handleProceed() {
    if (selected.size === 0) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Registration failed. Please try again.");
        setStep(1);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 4000);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <SuccessScreen email={form.email} selectedCount={selected.size} total={total} />;
  }

  return (
    // On desktop step 2 we fix height to viewport so both panels scroll independently
    <div className={`flex flex-col lg:flex-row ${step === 2 ? "lg:h-screen lg:overflow-hidden" : "min-h-screen"}`}>

      {/* Left teal panel — always visible on desktop; hidden on mobile for step 2 */}
      <div className={`${step === 2 ? "hidden lg:flex" : "flex"}`}>
        <LeftPanel step={step} name={form.name} email={form.email} />
      </div>

      {/* Mobile compact header for step 2 */}
      {step === 2 && (
        <div className="lg:hidden bg-primary px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gold rounded-lg flex items-center justify-center">
              <span className="text-text-dark font-black text-xs">B</span>
            </div>
            <span className="font-black text-sm">BAUIN</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-gold text-text-dark font-black flex items-center justify-center">
              <Tick className="w-2.5 h-2.5" />
            </span>
            <div className="w-8 h-px bg-gold" />
            <span className="w-5 h-5 rounded-full bg-gold text-text-dark font-black flex items-center justify-center text-[10px]">
              2
            </span>
            <span className="text-white/60 ml-1">Categories</span>
          </div>
        </div>
      )}

      {/* Right content area */}
      {step === 1 ? (
        <StepOneForm
          form={form}
          setField={setField}
          error={error}
          onSubmit={handleStep1}
        />
      ) : (
        <StepTwoContent
          selected={selected}
          allSelected={allSelected}
          onToggle={toggleCategory}
          onSelectAll={toggleAll}
          subtotal={subtotal}
          discount={discount}
          total={total}
          loading={loading}
          error={error}
          onProceed={handleProceed}
          onBack={() => { setError(""); setStep(1); }}
        />
      )}
    </div>
  );
}
