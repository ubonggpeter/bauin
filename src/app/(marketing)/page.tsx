"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useInView } from "framer-motion";
import SocialProofToast from "@/components/SocialProofToast";

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Categories", href: "#categories" },
  { label: "Referral", href: "#referral" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Projections", href: "/projections" },
];

const STATS = [
  { value: 50000, suffix: "+", label: "Active Members" },
  { value: 500, prefix: "₦", suffix: "M+", label: "Earnings Paid" },
  { value: 7, suffix: "", label: "Income Categories" },
  { value: 32, suffix: "+", label: "States Covered" },
];

const STEPS = [
  { num: "01", icon: "📝", title: "Register & Choose", desc: "Sign up and select your income category based on your skills and interest area." },
  { num: "02", icon: "🎓", title: "Get Certified", desc: "Complete a short certification test to prove your expertise and unlock full access." },
  { num: "03", icon: "🤖", title: "Access AI Tools", desc: "Get full access to AI-powered tools, real tasks, and income opportunities daily." },
  { num: "04", icon: "💰", title: "Earn & Grow", desc: "Earn from tasks, quizzes, referrals, and bets. Grow your team for passive income." },
];

const CATEGORIES = [
  { icon: "✍️", name: "AI Content Creator", min: 50000, max: 200000, fee: 5000, popular: false },
  { icon: "📊", name: "AI Data Analyst", min: 80000, max: 350000, fee: 8000, popular: true },
  { icon: "💻", name: "AI Developer", min: 150000, max: 500000, fee: 15000, popular: false },
  { icon: "📱", name: "Digital Marketer", min: 40000, max: 180000, fee: 4000, popular: false },
  { icon: "🎓", name: "AI Tutor", min: 60000, max: 250000, fee: 6000, popular: false },
  { icon: "🎬", name: "AI Video Editor", min: 70000, max: 300000, fee: 7000, popular: false },
  { icon: "₿", name: "Crypto & DeFi Analyst", min: 100000, max: 450000, fee: 10000, popular: false },
];

const TESTIMONIALS = [
  {
    name: "Chukwuemeka Okafor",
    role: "AI Content Creator · Lagos",
    quote: "I made ₦180,000 in my first month after certification. The referral bonuses alone are life-changing. BAUIN is the real deal.",
    initials: "CO",
    bg: "#1A6659",
  },
  {
    name: "Fatima Bello",
    role: "AI Data Analyst · Abuja",
    quote: "Went from struggling freelancer to ₦350,000 monthly. The AI tools are powerful and the community is incredibly supportive.",
    initials: "FB",
    bg: "#0E4A3D",
  },
  {
    name: "Taiwo Adeyemi",
    role: "Digital Marketer · Ibadan",
    quote: "Within 2 weeks I'd referred 5 people and earned over ₦80,000 in commissions. The process is straightforward and rewarding.",
    initials: "TA",
    bg: "#2B8A72",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 5000,
    desc: "Perfect for beginners",
    popular: false,
    features: ["1 Income Category", "AI Tool Access", "Certification Test", "Referral Earnings (50%)", "Community Access", "Email Support"],
  },
  {
    name: "Standard",
    price: 15000,
    desc: "Most popular choice",
    popular: true,
    features: ["3 Income Categories", "All AI Tools Included", "Priority Certification", "Referral Earnings (50%)", "Weekly Quiz Access", "Live Chat Support"],
  },
  {
    name: "Elite",
    price: 35000,
    desc: "For serious earners",
    popular: false,
    features: ["All 7 Categories", "All AI Tools Included", "VIP Certification Track", "Referral Earnings (50%)", "Betting & Quizzes", "Dedicated Manager"],
  },
];

// ── Counter hook ──────────────────────────────────────────────────────────────

function useCountUp(target: number, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 2.5,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.floor(v)),
    });
    return controls.stop;
  }, [inView, target]);
  return count;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? "shadow-md" : "shadow-sm"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm leading-none">B</span>
          </div>
          <div>
            <span className="font-black text-lg text-text-dark leading-none">BAUIN</span>
            <span className="block text-[9px] text-primary font-semibold leading-none tracking-widest uppercase">AI Income Network</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/auth/register" className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-md shadow-primary/20">
            Register Now
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/auth/register" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full">
            Register
          </Link>
          <button aria-label="Toggle menu" onClick={() => setOpen((o) => !o)} className="w-8 h-8 flex flex-col justify-center items-center gap-1.5">
            <span className={`block h-0.5 w-5 bg-text-dark transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 bg-text-dark transition-all duration-200 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-text-dark transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white border-t border-border px-4 py-5 flex flex-col gap-3">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-gray-700 hover:text-primary py-1">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            <Link href="/auth/login" className="text-center py-2.5 border-2 border-primary text-primary text-sm font-bold rounded-full">
              Sign In
            </Link>
            <Link href="/auth/register" className="text-center py-2.5 bg-primary text-white text-sm font-bold rounded-full">
              Register Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-bg-light pt-16">
      {/* Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 -left-48 w-[400px] h-[400px] rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 rounded-full bg-gold/8 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 xl:gap-20 items-center w-full relative z-10">
        {/* Text */}
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-wide uppercase"
          >
            🚀 Africa&apos;s #1 AI Income Network
          </motion.span>

          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-text-dark leading-[1.1] mb-4 tracking-tight">
            BAUIN —{" "}
            <span className="text-primary">Where AI Earners Become Billionaires</span>
          </h1>

          <p className="text-lg sm:text-xl text-primary font-semibold mb-4">
            Billionaires AI Users Income Network
          </p>

          <p className="text-gray-600 text-base sm:text-lg mb-10 leading-relaxed max-w-lg">
            Join thousands of Nigerians earning consistent income through AI tools,
            certification tasks, referrals, and network growth.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/register"
              className="bg-primary hover:bg-primary-dark text-white font-black px-8 py-4 rounded-full transition-all shadow-xl shadow-primary/30 text-base flex items-center gap-2"
            >
              Get Started <span aria-hidden>→</span>
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold px-8 py-4 rounded-full transition-all text-base flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs" aria-hidden>▷</span>
              How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-5 mt-10 text-xs text-gray-500">
            {["Verified Platform", "Instant Payouts", "50% Referral Commission"].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span> {b}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-border">
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <span className="text-white font-bold text-sm">BAUIN Dashboard</span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((d) => <div key={d} className="w-2.5 h-2.5 rounded-full bg-white/20" />)}
              </div>
            </div>
            <div className="px-6 py-5 border-b border-border">
              <p className="text-xs text-gray-500 mb-0.5">Wallet Balance</p>
              <p className="text-3xl font-black text-text-dark">₦284,500</p>
              <p className="text-xs text-green-600 font-medium mt-1">↑ +₦52,000 this month</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              {[
                { label: "Referrals", value: "23", cls: "text-primary" },
                { label: "Rank", value: "Silver", cls: "text-gold" },
                { label: "Tasks Done", value: "147", cls: "text-primary" },
                { label: "Earned Today", value: "₦8,200", cls: "text-green-600" },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-lg font-black ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pt-4 pb-5">
              <p className="text-xs text-gray-500 mb-3">Earnings — last 7 days</p>
              <div className="flex items-end gap-1 h-14">
                {[38, 62, 44, 78, 52, 88, 72].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/80 rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute -bottom-5 -right-5 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 border border-border"
          >
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</div>
            <div>
              <p className="text-xs font-semibold text-text-dark">Commission Received</p>
              <p className="text-sm font-black text-green-600">+₦4,000</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="absolute -top-5 -left-5 bg-gold rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2"
          >
            <span aria-hidden>🏆</span>
            <div>
              <p className="text-xs font-black text-text-dark">Top 10 Earner</p>
              <p className="text-[10px] text-text-dark/60">This week</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatItem({ value, prefix = "", suffix = "", label }: { value: number; prefix?: string; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(value, inView);
  return (
    <div ref={ref} className="text-center px-4 py-2">
      <div className="text-3xl sm:text-4xl font-black text-primary">
        {prefix}{count.toLocaleString("en-NG")}{suffix}
      </div>
      <div className="text-sm text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

function Stats() {
  return (
    <section className="bg-white border-y border-border py-12">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {STATS.map((s) => (
          <StatItem key={s.label} value={s.value} prefix={s.prefix} suffix={s.suffix} label={s.label} />
        ))}
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section id="how-it-works" className="py-24 bg-bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">The Process</span>
          <h2 className="text-3xl sm:text-4xl font-black text-text-dark mt-2">How It Works</h2>
          <p className="text-gray-500 mt-4 max-w-md mx-auto">
            Get started in 4 simple steps and begin earning within 24 hours of certification.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="bg-primary hover:bg-primary-dark transition-colors rounded-2xl p-6 relative overflow-hidden"
            >
              <span className="absolute top-3 right-4 text-7xl font-black text-white/[0.07] select-none leading-none pointer-events-none">
                {step.num}
              </span>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-white font-black text-lg mb-2">{step.title}</h3>
              <p className="text-primary-light text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

function Categories() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section id="categories" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Income Streams</span>
          <h2 className="text-3xl sm:text-4xl font-black text-text-dark mt-2">Choose Your Category</h2>
          <p className="text-gray-500 mt-4 max-w-md mx-auto">
            7 proven income categories powered by AI tools. Pick what matches your skills.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`relative bg-white rounded-xl border-2 p-6 hover:shadow-lg hover:border-primary/50 transition-all ${
                cat.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border"
              }`}
            >
              {cat.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-text-dark text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                  ⭐ Most Popular
                </div>
              )}
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="font-black text-text-dark text-sm mb-1">{cat.name}</h3>
              <p className="text-[11px] text-gray-400 mb-3">Monthly Earnings Range</p>
              <p className="text-primary font-black text-sm">
                ₦{cat.min.toLocaleString("en-NG")} – ₦{cat.max.toLocaleString("en-NG")}
              </p>
              <div className="mt-4 flex items-center justify-between py-2.5 border-t border-border">
                <span className="text-[11px] text-gray-400">Reg. Fee</span>
                <span className="text-gold font-black text-sm">₦{cat.fee.toLocaleString("en-NG")}</span>
              </div>
              <Link
                href="/auth/register"
                className="mt-3 block w-full text-center py-2 rounded-lg border-2 border-primary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
              >
                Register →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Referral Banner ───────────────────────────────────────────────────────────

function ReferralBanner() {
  return (
    <section id="referral" className="bg-primary py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-2xl" />
      </div>
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-wider">
          💰 Referral Program
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gold mb-4 leading-tight">
          Earn 50% Commission on Every Registration You Refer
        </h2>
        <p className="text-white/75 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          No cap. No limit. Every person you bring to BAUIN puts money in your wallet — instantly.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {[
            { value: "50%", label: "Commission Rate" },
            { value: "∞", label: "No Earning Limit" },
            { value: "24h", label: "Instant Credit" },
            { value: "5+", label: "Unlock Bonuses" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 sm:px-8 py-4 min-w-[110px]">
              <div className="text-2xl sm:text-3xl font-black text-gold">{s.value}</div>
              <div className="text-xs text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <Link
          href="/auth/register"
          className="inline-block bg-gold hover:bg-yellow-400 text-text-dark font-black px-10 py-4 rounded-full text-base transition-all shadow-2xl"
        >
          Start Referring Today →
        </Link>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section className="py-24 bg-bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Success Stories</span>
          <h2 className="text-3xl sm:text-4xl font-black text-text-dark mt-2">What Our Members Say</h2>
          <p className="text-gray-500 mt-4">Real people, real earnings, real impact.</p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-border flex flex-col"
            >
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="text-gold text-base" aria-hidden>★</span>
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed italic flex-grow mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-5 border-t border-border">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ backgroundColor: t.bg }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="font-bold text-text-dark text-sm">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Packages</span>
          <h2 className="text-3xl sm:text-4xl font-black text-text-dark mt-2">Simple, Transparent Pricing</h2>
          <p className="text-gray-500 mt-4 max-w-md mx-auto">
            One-time registration fee. No hidden charges, no monthly subscriptions.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 }}
              className={`rounded-2xl p-8 relative ${
                plan.popular
                  ? "bg-primary text-white shadow-2xl shadow-primary/20 ring-4 ring-primary"
                  : "bg-white border-2 border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-text-dark text-xs font-black px-5 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                  Most Popular
                </div>
              )}
              <h3 className={`text-xl font-black ${plan.popular ? "text-white" : "text-text-dark"}`}>{plan.name}</h3>
              <p className={`text-sm mt-0.5 mb-5 ${plan.popular ? "text-white/60" : "text-gray-400"}`}>{plan.desc}</p>
              <div className="flex items-end gap-1 mb-7">
                <span className={`text-4xl font-black ${plan.popular ? "text-gold" : "text-primary"}`}>
                  ₦{plan.price.toLocaleString("en-NG")}
                </span>
                <span className={`text-sm mb-1.5 ${plan.popular ? "text-white/50" : "text-gray-400"}`}>/once</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.popular ? "text-white/85" : "text-gray-600"}`}>
                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5 font-bold ${
                      plan.popular ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
                    }`} aria-hidden>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className={`block w-full text-center py-3.5 rounded-full font-bold transition-all text-sm ${
                  plan.popular
                    ? "bg-gold text-text-dark hover:bg-yellow-400 shadow-lg"
                    : "bg-primary text-white hover:bg-primary-dark"
                }`}
              >
                Get Started Today
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          All plans include access to the BAUIN community, daily tasks, and real-time earnings tracking.
        </p>
      </div>
    </section>
  );
}

// ── Email Capture ─────────────────────────────────────────────────────────────

function EmailCapture() {
  const [email,     setEmail]     = useState("");
  const [status,    setStatus]    = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg,  setErrorMsg]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), source: "LANDING" }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Something went wrong");
      }
      setStatus("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <section id="newsletter" className="py-20 bg-gradient-to-br from-[#0D3D32] via-[#1A6659] to-[#0a2a22] relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 text-center">
        <div className="inline-block bg-[#F0B429]/20 text-[#F0B429] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
          Free Weekly Earnings Tips
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          Get the BAUIN playbook<br />
          <span className="text-[#F0B429]">delivered to your inbox</span>
        </h2>
        <p className="text-white/70 text-base mb-8 leading-relaxed">
          Join 2,000+ subscribers. We send 3 emails — what BAUIN is, real earnings examples,
          and your personal referral link. No spam. Unsubscribe anytime.
        </p>

        {status === "done" ? (
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-7 py-4">
            <span className="text-2xl">✅</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">You&apos;re on the list!</p>
              <p className="text-white/60 text-xs">Check your inbox for the first email.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 rounded-full px-5 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F0B429] bg-white"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#F0B429] hover:bg-[#d4a017] disabled:opacity-70 text-[#1A1A2E] font-bold text-sm px-7 py-3.5 rounded-full transition-colors whitespace-nowrap shadow-lg shadow-[#F0B429]/30"
            >
              {status === "loading" ? "…" : "Get the Playbook"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-red-300 text-sm">{errorMsg}</p>
        )}

        <p className="mt-5 text-white/40 text-xs">
          3 emails over 7 days. No spam. Unsubscribe in one click.
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

const FOOTER_SOCIAL = [
  { label: "Twitter / X", char: "𝕏" },
  { label: "Instagram", char: "◈" },
  { label: "Telegram", char: "✈" },
  { label: "LinkedIn", char: "in" },
  { label: "YouTube", char: "▶" },
];

function Footer() {
  return (
    <footer className="bg-primary-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-text-dark font-black text-base">B</span>
              </div>
              <div>
                <span className="text-xl font-black">BAUIN</span>
                <p className="text-[10px] text-white/40 leading-none tracking-widest uppercase">AI Income Network</p>
              </div>
            </div>
            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-xs">
              Billionaires AI Users Income Network — empowering Africans to build
              sustainable wealth through AI-driven income streams and network growth.
            </p>
            <div className="flex gap-2.5">
              {FOOTER_SOCIAL.map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold text-white/70 hover:text-white transition-colors"
                >
                  {s.char}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs mb-5 text-white/60 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-3">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Categories", href: "#categories" },
                { label: "Referral Program", href: "#referral" },
                { label: "Pricing", href: "#pricing" },
                { label: "Leaderboard",    href: "/dashboard"     },
                { label: "Earnings Proof", href: "/earnings-proof" },
                { label: "Projections",    href: "/projections"    },
                { label: "Blog",           href: "/blog"           },
                { label: "Affiliate",      href: "/affiliate"      },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-white/50 hover:text-white text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs mb-5 text-white/60 uppercase tracking-widest">Account</h4>
            <ul className="space-y-3">
              {[
                { label: "Register Now", href: "/auth/register" },
                { label: "Sign In", href: "/auth/login" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "My Wallet", href: "/dashboard/wallet" },
                { label: "My Network", href: "/dashboard/network" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/50 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} BAUIN Platform. All rights reserved.</p>
          <p>Built with ❤️ in Nigeria 🇳🇬</p>
        </div>
      </div>
    </footer>
  );
}

// ── Earnings Proof (landing section) ─────────────────────────────────────────

type EarningsProofData = {
  total:     number;
  breakdown: { key: string; label: string; icon: string; amount: number }[];
};

const ACCENT_BAR: Record<string, string> = {
  jobs:      "bg-teal-500",
  stories:   "bg-purple-500",
  quiz:      "bg-amber-500",
  referrals: "bg-green-500",
  betting:   "bg-orange-500",
};

const ACCENT_TEXT: Record<string, string> = {
  jobs:      "text-teal-600",
  stories:   "text-purple-600",
  quiz:      "text-amber-600",
  referrals: "text-green-600",
  betting:   "text-orange-600",
};

function EarningsProofSection() {
  const [data, setData]       = useState<EarningsProofData | null>(null);
  const [loading, setLoading] = useState(true);

  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    fetch("/api/earnings-proof")
      .then((r) => r.json())
      .then((d: EarningsProofData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total     = data?.total ?? 0;
  const breakdown = data?.breakdown ?? [];
  const count     = useCountUp(total, inView && !loading);

  return (
    <section className="py-20 bg-[#070F0D] overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/50 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-teal-300 text-xs font-bold tracking-widest uppercase">Verified Platform Totals</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Total Paid to Workers</h2>
          <div ref={ref} className="text-5xl sm:text-6xl font-black text-amber-400 mt-4 tracking-tight">
            {loading
              ? <span className="animate-pulse text-white/20">₦ —</span>
              : `₦${count.toLocaleString("en-NG")}`}
          </div>
          <p className="text-gray-500 text-sm mt-3">Aggregated totals · no individual data shown</p>
        </div>

        {/* Breakdown */}
        {!loading && breakdown.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            {breakdown.map((b, i) => {
              const pct  = total > 0 ? (b.amount / total) * 100 : 0;
              const bar  = ACCENT_BAR[b.key]  ?? "bg-teal-500";
              const text = ACCENT_TEXT[b.key] ?? "text-teal-600";
              return (
                <motion.div
                  key={b.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  className="bg-white/5 border border-white/8 rounded-xl p-4"
                >
                  <div className="text-xl mb-1">{b.icon}</div>
                  <div className={`text-sm font-black ${text}`}>
                    ₦{(b.amount / 1_000_000).toFixed(1)}M
                  </div>
                  <div className="text-gray-500 text-[11px] mb-2">{b.label}</div>
                  <div className="h-1 bg-white/10 rounded-full">
                    <motion.div
                      className={`h-full rounded-full ${bar}`}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${pct}%` } : {}}
                      transition={{ delay: 0.3 + i * 0.08, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Link to full page */}
        <div className="text-center">
          <a
            href="/earnings-proof"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors"
          >
            View full earnings breakdown
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Categories />
        <ReferralBanner />
        <EarningsProofSection />
        <Testimonials />
        <Pricing />
        <EmailCapture />
      </main>
      <Footer />
      <SocialProofToast />
    </div>
  );
}
