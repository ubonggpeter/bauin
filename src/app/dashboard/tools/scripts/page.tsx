"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GENRES, TONES, FREE_QUOTA, PRICE_NAIRA } from "@/lib/server/script-gen";

// ── Types ──────────────────────────────────────────────────────────────────────

type Usage = {
  usedThisMonth: number;
  freeQuota:     number;
  remaining:     number;
  isFree:        boolean;
  costNaira:     number;
  isCertified:   boolean;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup(opts: {
        key:       string;
        email:     string;
        amount:    number;
        currency:  string;
        ref:       string;
        onSuccess: (t: { reference: string }) => void;
        onCancel:  () => void;
      }): { openIframe(): void };
    };
  }
}

// ── Usage bar ─────────────────────────────────────────────────────────────────

function UsageBar({ usage }: { usage: Usage }) {
  const pct = Math.min(100, (usage.usedThisMonth / usage.freeQuota) * 100);
  return (
    <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-text-dark">Monthly Usage</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {usage.isFree
              ? `${usage.remaining} free generation${usage.remaining !== 1 ? "s" : ""} remaining`
              : `Free quota used · ₦${PRICE_NAIRA.toLocaleString()} per generation`}
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
          usage.isFree ? "bg-primary/10 text-primary" : "bg-orange-100 text-orange-700"
        }`}>
          {usage.usedThisMonth}/{usage.freeQuota} used
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${usage.isFree ? "bg-primary" : "bg-orange-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Copy + download helpers ───────────────────────────────────────────────────

function useActions(script: string) {
  const [copied, setCopied] = useState(false);

  function copyScript() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function downloadScript() {
    const blob = new Blob([script], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `bauin-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { copied, copyScript, downloadScript };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScriptHelperPage() {
  const [usage,       setUsage]       = useState<Usage | null>(null);
  const [genre,       setGenre]       = useState<string>(GENRES[0]);
  const [characters,  setCharacters]  = useState("");
  const [setting,     setSetting]     = useState("");
  const [conflict,    setConflict]    = useState("");
  const [tone,        setTone]        = useState<string>(TONES[0]);
  const [script,      setScript]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [paying,      setPaying]      = useState(false);
  const paystackLoaded = useRef(false);

  const { copied, copyScript, downloadScript } = useActions(script);

  // Load Paystack inline script once
  useEffect(() => {
    if (paystackLoaded.current) return;
    paystackLoaded.current = true;
    const el   = document.createElement("script");
    el.src     = "https://js.paystack.co/v1/inline.js";
    el.async   = true;
    document.head.appendChild(el);
  }, []);

  // Fetch usage
  const loadUsage = useCallback(async () => {
    const res  = await fetch("/api/tools/scripts");
    const data = await res.json();
    setUsage(data);
  }, []);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  // ── Generate (optionally with paystackRef) ─────────────────────────────────
  const doGenerate = useCallback(async (paystackRef?: string) => {
    setLoading(true);
    setError("");
    const res  = await fetch("/api/tools/scripts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ genre, characters, setting, conflict, tone, paystackRef }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setScript(data.script);
      loadUsage();
    } else {
      setError(data.error ?? "Generation failed.");
    }
  }, [genre, characters, setting, conflict, tone, loadUsage]);

  // ── Open Paystack popup ────────────────────────────────────────────────────
  function openPaystack() {
    const key   = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
    const email = ((window as unknown as { __session?: { user?: { email?: string } } }).__session?.user?.email) ?? "";

    if (!window.PaystackPop) {
      setError("Paystack not loaded. Please refresh the page.");
      return;
    }

    const ref     = `SCR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setPaying(true);

    const handler = window.PaystackPop.setup({
      key,
      email,
      amount:    PRICE_NAIRA * 100,
      currency:  "NGN",
      ref,
      onSuccess: (transaction) => {
        setPaying(false);
        doGenerate(transaction.reference);
      },
      onCancel: () => {
        setPaying(false);
      },
    });
    handler.openIframe();
  }

  // ── Handle generate button click ───────────────────────────────────────────
  function handleGenerate() {
    if (!characters.trim() || !setting.trim() || !conflict.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    if (usage?.isFree) {
      doGenerate();
    } else {
      openPaystack();
    }
  }

  const canGenerate = characters.trim() && setting.trim() && conflict.trim();

  // ── Gate: not certified ────────────────────────────────────────────────────
  if (usage && !usage.isCertified) {
    return (
      <div className="p-4 lg:p-8 space-y-4 pb-24 lg:pb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Script Helper</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-powered narration script generator</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-dark mb-2">Certified Writers Only</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mb-5">
            The Script Helper is available to certified BAUIN writers. Pass a certification exam to unlock access.
          </p>
          <a
            href="/dashboard/explore"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            Browse Certification Courses →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Script Helper</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Claude writes your narration script — genre, characters, setting, conflict, tone
        </p>
      </div>

      {/* Usage bar */}
      {usage && <UsageBar usage={usage} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Form ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-text-dark">Creative Brief</h2>

          {/* Genre */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-text-dark"
            >
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Characters */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Main Characters <span className="text-gray-400 font-normal">(name, age, role)</span>
            </label>
            <textarea
              rows={2}
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder="e.g. Amara, 28, ambitious Lagos startup founder"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Setting */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Setting</label>
            <input
              type="text"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              placeholder="e.g. Modern Lagos, tech startup office, 2027"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Conflict */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Central Conflict</label>
            <textarea
              rows={2}
              value={conflict}
              onChange={(e) => setConflict(e.target.value)}
              placeholder="e.g. Amara discovers her co-founder is selling company secrets to a rival"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                    tone === t
                      ? "bg-primary text-white border-primary"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading || paying || !usage}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
            style={{ background: usage && !usage.isFree ? "#F0B429" : "#1A6659", color: "white" }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a10 10 0 0110 10" /></svg>
                Claude is writing…
              </>
            ) : paying ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a10 10 0 0110 10" /></svg>
                Opening payment…
              </>
            ) : usage && !usage.isFree ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Pay ₦{PRICE_NAIRA.toLocaleString()} & Generate
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Generate Script
                {usage && <span className="opacity-70 font-normal text-[11px]">({usage.remaining} free left)</span>}
              </>
            )}
          </button>
        </div>

        {/* ── Script output ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-bold text-text-dark">Generated Script</h2>
            {script && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyScript}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    copied ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {copied ? (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy</>
                  )}
                </button>
                <button
                  onClick={downloadScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  .txt
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-5 overflow-auto min-h-[320px]">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
                ))}
                <div className="my-4 h-px bg-gray-100" />
                {[1, 2, 3, 4].map((i) => (
                  <div key={i + 10} className="h-3 bg-gray-100 rounded" style={{ width: `${55 + (i % 4) * 10}%` }} />
                ))}
              </div>
            ) : script ? (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{script}</pre>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Fill in the brief and click generate</p>
                  <p className="text-xs text-gray-300 mt-1">Your script will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
