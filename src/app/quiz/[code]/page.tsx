"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePaystackPayment } from "react-paystack";
import Image from "next/image";
import { useTranslations } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────
type Player = { id: string; userId: string; name: string };

type SessionInfo = {
  collection: {
    name: string; description: string | null; publicLinkCode: string;
    isInUse: boolean; scheduledActivateAt: string | null; hostName: string;
    ctaText: string | null; accentColor: string | null;
    logoUrl: string | null; welcomeMessage: string | null;
  };
  session:    { id: string; status: string; title: string };
  playerCount: number;
  prizePool:   number;
  players:     Player[];
};

type BetTypeId = "TOP10" | "TOP5" | "TOP3" | "TOP1";
type BetStep   = "type" | "players" | "stake";

const BET_TYPES: { id: BetTypeId; label: string; bonus: string; multiplier: number; picks: number; color: string }[] = [
  { id: "TOP10", label: "Top 10", bonus: "+100%", multiplier: 2,  picks: 10, color: "#1A6659" },
  { id: "TOP5",  label: "Top 5",  bonus: "+200%", multiplier: 3,  picks: 5,  color: "#0E4A3D" },
  { id: "TOP3",  label: "Top 3",  bonus: "+400%", multiplier: 5,  picks: 3,  color: "#B45309" },
  { id: "TOP1",  label: "Top 1",  bonus: "+800%", multiplier: 9,  picks: 1,  color: "#7C3AED" },
];

// ── Helpers ───────────────────────────────────────────────────────
function useCountdown(target: string | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!target) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return secs;
}

function fmtCountdown(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2,"0")}s`;
  if (m > 0) return `${m}m ${String(sec).padStart(2,"0")}s`;
  return `${s}s`;
}

// ── Animated prize counter ─────────────────────────────────────────
function PrizeCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current, steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(Math.round(prev.current + (diff * i) / steps));
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ══════════════════════════════════════════════════════════════════
// BETTING SHEET
// ══════════════════════════════════════════════════════════════════
function BettingSheet({
  players, sessionId, sessionCode, userEmail,
  onClose, onSuccess,
}: {
  players: Player[]; sessionId: string; sessionCode: string;
  userEmail: string; onClose: () => void; onSuccess: () => void;
}) {
  const t = useTranslations("Quiz.bet");
  const [step,        setStep]        = useState<BetStep>("type");
  const [betType,     setBetType]     = useState<BetTypeId | null>(null);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [stake,       setStake]       = useState("");
  const [paying,      setPaying]      = useState(false);
  const [psRef,       setPsRef]       = useState("");
  const [error,       setError]       = useState("");

  // Swipe-down to close
  const sheetRef      = useRef<HTMLDivElement>(null);
  const touchStartY   = useRef(0);
  const dragDistance  = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && sheetRef.current) {
      dragDistance.current = delta;
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragDistance.current > 90) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.3s ease";
      sheetRef.current.style.transform = "translateY(0)";
    }
    dragDistance.current = 0;
  }, [onClose]);

  const chosenType  = BET_TYPES.find((t) => t.id === betType);
  const stakeNum    = Math.max(0, parseInt(stake) || 0);
  const potentialWin = stakeNum * (chosenType?.multiplier ?? 1);

  // Paystack config (amount set to stakeNum)
  const psConfig = {
    email:     userEmail,
    amount:    stakeNum * 100, // kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
    currency:  "NGN",
    label:     `Quiz Bet: ${betType}`,
    reference: `BET-${sessionId}-${Date.now()}`,
  };
  const initPayment = usePaystackPayment(psConfig);

  async function handlePay() {
    if (!betType || selected.size !== chosenType!.picks) return;
    if (stakeNum < 100) { setError(t("minimumStakeError")); return; }
    setError("");
    initPayment({
      onSuccess: async (tx: { reference: string }) => {
        setPsRef(tx.reference);
        setPaying(true);
        try {
          const res = await fetch(`/api/quiz/${sessionCode}/bet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              betType,
              predictedIds:      Array.from(selected),
              stake:             stakeNum,
              paystackReference: tx.reference,
            }),
          });
          if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? "Bet failed");
          } else {
            onSuccess();
          }
        } catch {
          setError("Network error placing bet");
        } finally {
          setPaying(false);
        }
      },
      onClose: () => {},
    });
  }

  void psRef; // used via psConfig

  function togglePlayer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= (chosenType?.picks ?? 0)) return prev; // cap
      next.add(id);
      return next;
    });
  }

  const mockPlayers: Player[] = players.length >= 3 ? players : [
    ...players,
    { id: "mock1", userId: "m1", name: "Ade Williams" },
    { id: "mock2", userId: "m2", name: "Funmi Okafor" },
    { id: "mock3", userId: "m3", name: "Chidi Obi"    },
    { id: "mock4", userId: "m4", name: "Ngozi Eze"    },
    { id: "mock5", userId: "m5", name: "Tunde Adeyemi" },
  ].slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div
        ref={sheetRef}
        className="w-full bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ transition: "transform 0.3s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle — visual affordance for swipe-down */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step !== "type" && (
              <button onClick={() => setStep(step === "stake" ? "players" : "type")}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div>
              <h3 className="font-bold text-text-dark text-base leading-none">
                {step === "type" ? t("titleType") : step === "players" ? t("titlePick", { n: chosenType?.picks ?? 0 }) : t("titleStake")}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === "type" ? t("chooseBetType") : step === "players" ? t("selectedOf", { sel: selected.size, total: chosenType?.picks ?? 0 }) : t("typeAndBonus", { label: chosenType?.label ?? "", bonus: chosenType?.bonus ?? "" })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-5 py-2.5">
          {(["type","players","stake"] as BetStep[]).map((s, i) => (
            <div key={s} className={`h-1 rounded-full flex-1 transition-all ${
              s === step ? "bg-gold" : i < ["type","players","stake"].indexOf(step) ? "bg-green-400" : "bg-gray-100"
            }`} />
          ))}
        </div>

        {/* ── Step 1: Bet type cards ── */}
        {step === "type" && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <p className="text-xs text-gray-400 mb-3 mt-1">{t("higherRisk")}</p>
            <div className="grid grid-cols-2 gap-3">
              {BET_TYPES.map((bt) => (
                <button key={bt.id} onClick={() => { setBetType(bt.id); setSelected(new Set()); setStep("players"); }}
                  className="rounded-2xl p-4 text-left transition-all active:scale-95 hover:scale-[1.02]"
                  style={{ background: bt.color }}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-white font-black text-lg leading-none">{bt.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">{bt.bonus}</span>
                  </div>
                  <p className="text-white/70 text-xs mb-3">{t("predictPlayers", { n: bt.picks })}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60 text-[10px]">{t("win")}</span>
                    <span className="text-white font-black text-sm">{t("multiplierStake", { mult: bt.multiplier })}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">{t("betsAreFinal")}</p>
          </div>
        )}

        {/* ── Step 2: Player selection ── */}
        {step === "players" && chosenType && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-2 bg-gold/5 border-b border-gold/15">
              <p className="text-xs text-amber-700 font-medium">
                {t("selectExactly", { n: chosenType.picks })}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {mockPlayers.map((p, i) => {
                const checked = selected.has(p.id);
                const full    = selected.size >= chosenType.picks && !checked;
                return (
                  <button key={p.id} onClick={() => togglePlayer(p.id)} disabled={full}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left ${
                      full ? "opacity-40" : checked ? "bg-primary/5" : "hover:bg-gray-50"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checked ? "border-primary bg-primary" : "border-gray-300"
                    }`}>
                      {checked && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: BET_TYPES[i % 4].color }}>
                      {p.name.charAt(0)}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${checked ? "text-primary" : "text-text-dark"}`}>{p.name}</span>
                    {checked && <span className="text-xs text-primary font-semibold">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4">
              <button
                onClick={() => setStep("stake")}
                disabled={selected.size !== chosenType.picks}
                className="w-full py-3.5 rounded-2xl font-bold text-text-dark disabled:opacity-40 transition-all"
                style={{ background: selected.size === chosenType.picks ? "linear-gradient(135deg,#F0B429,#d4981e)" : "#e5e7eb" }}>
                {t("continue")}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Stake + Pay ── */}
        {step === "stake" && chosenType && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {/* Summary */}
            <div className="rounded-2xl p-4 mt-3 mb-4" style={{ background: "rgba(26,102,89,0.06)" }}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">{t("betType")}</span>
                <span className="font-semibold text-text-dark">{chosenType.label} <span className="text-green-600">{chosenType.bonus}</span></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("predictedPlayers")}</span>
                <span className="font-semibold text-text-dark">{t("nSelected", { n: selected.size })}</span>
              </div>
            </div>

            {/* Selected player chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from(selected).map((id) => {
                const p = mockPlayers.find((x) => x.id === id);
                return p ? (
                  <span key={id} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">{p.name.charAt(0)}</span>
                    {p.name}
                  </span>
                ) : null;
              })}
            </div>

            {/* Stake input */}
            <label className="block text-sm font-semibold text-text-dark mb-2">{t("yourStake")}</label>
            <div className="flex items-center border-2 rounded-2xl overflow-hidden mb-1 focus-within:border-gold transition-colors" style={{ borderColor: "#e5e7eb" }}>
              <span className="px-4 text-lg font-black text-gold bg-gold/5 self-stretch flex items-center">₦</span>
              <input
                type="number"
                min="100"
                placeholder="500"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="flex-1 px-3 py-4 text-lg font-bold text-text-dark outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400 mb-4">{t("minimumStake")}</p>

            {/* Potential win */}
            {stakeNum >= 100 && (
              <div className="rounded-2xl p-4 mb-4 border border-gold/30 bg-gold/5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("potentialWin")}</span>
                  <span className="text-xl font-black text-gold">₦{potentialWin.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t("potentialWinDetail", { stake: stakeNum.toLocaleString(), mult: chosenType.multiplier, total: potentialWin.toLocaleString() })}
                </p>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">{error}</div>
            )}

            {/* Paystack CTA */}
            <button
              onClick={handlePay}
              disabled={stakeNum < 100 || paying}
              className="w-full py-4 rounded-2xl font-black text-text-dark text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{ background: stakeNum >= 100 ? "linear-gradient(135deg,#F0B429,#d4981e)" : "#e5e7eb" }}>
              {paying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/>
                  </svg>
                  {t("confirming")}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  {stakeNum > 0 ? t("payViaPaystack", { amount: stakeNum.toLocaleString() }) : t("payEmpty")}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// VIEWER REFERRAL CARD
// ══════════════════════════════════════════════════════════════════
function ViewerReferralCard({ code, playerCount }: { code: string; playerCount: number }) {
  const t = useTranslations("Quiz.referral");
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/quiz/${code}` : `https://bauin.app/quiz/${code}`;
  const goal = 50;
  const pct  = Math.min(100, Math.round((playerCount / goal) * 100));

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function share() {
    const text = `Join me on this BAUIN quiz! ${url}`;
    if (navigator.share) navigator.share({ text, url });
    else copy();
  }

  return (
    <div className="w-full max-w-md mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gold">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span className="text-white font-semibold text-sm">{t("title")}</span>
      </div>

      {/* Link row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <p className="text-white/60 text-[11px] font-mono truncate">{url}</p>
        </div>
        <button onClick={copy}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            copied ? "bg-green-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}>
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/60">{t("playersJoined", { count: playerCount })}</span>
          <span className="text-white/40">{t("goal", { n: goal })}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1A6659,#F0B429)" }}
          />
        </div>
        <p className="text-white/40 text-[10px] mt-1.5">
          {t("morePlayers", { n: goal - playerCount })}
        </p>
      </div>

      <button onClick={share}
        className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:bg-white/10"
        style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
          <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        {t("shareLink")}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function QuizLobbyPage() {
  const t = useTranslations("Quiz");
  const { code }   = useParams<{ code: string }>();
  const router     = useRouter();
  const { data: authSession } = useSession();

  const [info,      setInfo]      = useState<SessionInfo | null>(null);
  const [error,     setError]     = useState("");
  const [joining,   setJoining]   = useState(false);
  const [pulse,     setPulse]     = useState(false);
  const [showBet,   setShowBet]   = useState(false);
  const [betDone,   setBetDone]   = useState(false);
  const [winToasts, setWinToasts] = useState<{ name: string; rank: number; id: string }[]>([]);

  const countdown = useCountdown(info?.collection.scheduledActivateAt ?? null);

  // Initial full fetch for collection + session + players + prizePool
  useEffect(() => {
    fetch(`/api/quiz/${code}`)
      .then((r) => r.json())
      .then((data: SessionInfo & { error?: string }) => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError("Failed to load session"));
  }, [code]);

  // SSE stream for live playerCount + status + winners
  useEffect(() => {
    const es = new EventSource(`/api/quiz/${code}/players/stream`);
    es.onmessage = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data as string) as {
          playerCount: number;
          status: string;
          winners?: { name: string; rank: number }[];
        };
        setInfo((prev) => {
          if (!prev) return prev;
          if (payload.playerCount !== prev.playerCount) setPulse(true);
          return {
            ...prev,
            playerCount: payload.playerCount,
            session: { ...prev.session, status: payload.status },
          };
        });
        if (payload.winners?.length) {
          setWinToasts(
            payload.winners.map((w) => ({ ...w, id: `${w.rank}-${w.name}` })),
          );
          setTimeout(() => setWinToasts([]), 12_000);
        }
      } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  }, [code]);

  useEffect(() => {
    if (!pulse) return;
    const id = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(id);
  }, [pulse]);

  async function handlePlay() {
    setJoining(true);
    try {
      const res = await fetch(`/api/quiz/${code}/join`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Could not join"); setJoining(false); return;
      }
      router.push(`/quiz/${code}/play`);
    } catch {
      setError("Network error. Please try again."); setJoining(false);
    }
  }

  const canPlay = info?.collection.isInUse && info?.session.status !== "ENDED";
  const ended   = info?.session.status === "ENDED";

  const accent = info?.collection.accentColor ?? "#1A6659";

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg,${accent}cc 0%,#1A1A2E 60%,#0a1628 100%)` }}>

      {/* Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle,#1A6659,transparent)" }} />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle,#F0B429,transparent)" }} />

      {/* Particles */}
      {[...Array(8)].map((_,i) => (
        <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-gold/30"
          style={{ top:`${10+i*11}%`, left:`${5+i*12}%`,
            animation:`float ${3+i*0.4}s ease-in-out infinite alternate`,
            animationDelay:`${i*0.3}s` }} />
      ))}
      <style>{`
        @keyframes float{from{transform:translateY(0)}to{transform:translateY(-14px)}}
        @keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
        @keyframes slideup{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* LIVE badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            {t("liveSession")}
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full">
          {/* Header */}
          <div className="relative px-6 pt-8 pb-6"
            style={{ background: `linear-gradient(135deg,${accent} 0%,${accent}cc 100%)` }}>
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {info?.collection.logoUrl && (
              <img src={info.collection.logoUrl} alt="logo" className="h-8 mb-3 object-contain" />
            )}
            <p className="text-xs text-white/60 font-medium uppercase tracking-widest mb-2">
              {t("hostedBy", { name: info?.collection.hostName ?? "—" })}
            </p>
            <h1 className="text-2xl font-black text-white leading-tight">
              {info?.session.title ?? info?.collection.name ?? "Loading…"}
            </h1>
            {/* Welcome message (custom) or description */}
            {(info?.collection.welcomeMessage || info?.collection.description) && (
              <p className="text-sm text-white/70 mt-1 line-clamp-2">
                {info.collection.welcomeMessage ?? info.collection.description}
              </p>
            )}
            <div className="absolute top-6 right-6">
              {ended ? (
                <span className="px-3 py-1 bg-red-500/20 border border-red-400/40 rounded-full text-red-300 text-xs font-semibold">{t("statusEnded")}</span>
              ) : canPlay ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-400/40 rounded-full text-green-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />{t("statusActive")}
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full text-yellow-300 text-xs font-semibold">{t("statusComingSoon")}</span>
              )}
            </div>
          </div>

          {/* Prize pool */}
          <div className="px-6 py-6 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest text-center mb-2">{t("livePrizePool")}</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-black text-gold">₦</span>
              <span className="text-5xl font-black text-gold tabular-nums leading-none">
                {info ? <PrizeCounter value={info.prizePool} /> : "—"}
              </span>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">{t("prizeGrows")}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"
                  style={pulse ? { animation:"pop 0.6s ease" } : {}} />
                <span className="text-2xl font-black text-text-dark tabular-nums">{info?.playerCount ?? 0}</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">{t("playersJoined")}</p>
            </div>
            <div className="px-6 py-4 text-center">
              <span className="text-2xl font-black text-text-dark">5</span>
              <p className="text-xs text-gray-400 font-medium mt-1">{t("gamePhases")}</p>
            </div>
          </div>

          {/* Countdown */}
          {!canPlay && countdown !== null && countdown > 0 && (
            <div className="px-6 py-4 bg-gold/5 border-b border-gold/20 text-center">
              <p className="text-xs text-gold/70 font-medium uppercase tracking-wide mb-1">{t("startsIn")}</p>
              <p className="text-3xl font-black text-gold tabular-nums">{fmtCountdown(countdown)}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">{error}</div>
          )}

          {/* CTA area */}
          <div className="px-6 py-6">
            {betDone && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                {t("betPlaced")}
              </div>
            )}

            {ended ? (
              <p className="text-center text-gray-500 text-sm py-4">{t("sessionEnded")}</p>
            ) : canPlay ? (
              <div className="flex flex-col gap-3">
                <button onClick={handlePlay} disabled={joining}
                  className="w-full py-4 rounded-2xl font-black text-lg text-text-dark transition-all active:scale-95 disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg,#F0B429,#d4981e)" }}>
                  {joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/>
                      </svg>
                      {t("joining")}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      {info?.collection.ctaText ?? t("playNow")}
                    </span>
                  )}
                </button>
                {!betDone && (
                  <button onClick={() => { if (!authSession) { setError(t("signInToBet")); return; } setShowBet(true); }}
                    className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {t("placeBet")}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-gray-100 text-center text-gray-400 text-sm font-semibold">
                {countdown === 0 ? t("startingSoon") : t("notAvailable")}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-3">
              {t("playersCompeting", { count: info?.playerCount ?? 0 })}
            </p>
          </div>
        </div>

        {/* Phase strip */}
        <div className="mt-4 flex gap-2 justify-center">
          {(["flash","memory","sequence","fillGap","trueFalse"] as const).map((key, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-white/80 text-xs font-bold">{i+1}</span>
              </div>
              <span className="text-white/50 text-[9px] font-medium">{t(`phases.${key}`)}</span>
            </div>
          ))}
        </div>

        {/* Viewer referral card */}
        <ViewerReferralCard code={code} playerCount={info?.playerCount ?? 0} />
      </div>

      {/* Betting sheet */}
      {showBet && info && (
        <BettingSheet
          players={info.players}
          sessionId={info.session.id}
          sessionCode={code}
          userEmail={authSession?.user?.email ?? "user@bauin.app"}
          onClose={() => setShowBet(false)}
          onSuccess={() => { setShowBet(false); setBetDone(true); }}
        />
      )}

      {/* Win toasts — slide in bottom-left when session ends */}
      {winToasts.length > 0 && (
        <div className="fixed bottom-5 left-5 z-50 flex flex-col-reverse gap-2 pointer-events-none">
          {winToasts.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 max-w-[280px]"
              style={{ animation: "slideup 0.5s ease-out" }}
            >
              <span className="text-2xl flex-shrink-0">
                {w.rank === 1 ? "🏆" : w.rank === 2 ? "🥈" : "🥉"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  <span className="text-primary">{w.name}</span>
                  {" finished "}
                  <span className="font-black text-gold">
                    {w.rank === 1 ? "1st" : w.rank === 2 ? "2nd" : "3rd"}!
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Quiz winner 🎉</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
