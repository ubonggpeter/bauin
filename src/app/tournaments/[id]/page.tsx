"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Tournament = {
  id:            string;
  name:          string;
  description:   string | null;
  entryFee:      number;
  prizePool:     number;
  date:          string;
  status:        "UPCOMING" | "LIVE" | "ENDED";
  _count:        { entries: number; bets: number };
};

type LeaderboardRow = {
  rank:       number;
  userId:     string;
  name:       string;
  totalScore: number;
};

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white/10 rounded-xl px-4 py-3 min-w-[60px]">
      <span className="text-2xl font-black text-white tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export default function TournamentPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDone, setEntryDone] = useState(false);
  const [betDone, setBetDone] = useState(false);
  const [betError, setBetError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [predicted, setPredicted] = useState<string[]>([]);
  const [stake, setStake] = useState(5000);
  const [showBetSheet, setShowBetSheet] = useState(false);
  const paystackReady = useRef(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => { paystackReady.current = true; };
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    fetch(`/api/tournaments/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setTournament(d.tournament);
        setLeaderboard(d.leaderboard ?? []);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const countdown = useCountdown(tournament ? new Date(tournament.date) : new Date(0));

  function payWith(amountNaira: number, cb: (ref: string) => void) {
    if (!session?.user?.email) return;
    const ref = `tournament-${Date.now()}`;
    const handler = window.PaystackPop?.setup({
      key:       process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
      email:     session.user.email,
      amount:    Math.round(amountNaira * 100),
      currency:  "NGN",
      ref,
      onSuccess: (t) => cb(t.reference),
      onCancel:  () => {},
    });
    handler?.openIframe();
  }

  async function handleEnter() {
    setEntryError("");
    payWith(tournament!.entryFee, async (ref) => {
      const r = await fetch(`/api/tournaments/${params.id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paystackReference: ref }),
      });
      if (r.ok) {
        setEntryDone(true);
      } else {
        const d = await r.json();
        setEntryError(d.error ?? "Entry failed");
      }
    });
  }

  async function handleBet() {
    setBetError("");
    if (predicted.length !== 3) { setBetError("Pick exactly 3 players"); return; }
    if (stake < 5000) { setBetError("Minimum stake is ₦5,000"); return; }
    payWith(stake, async (ref) => {
      const r = await fetch(`/api/tournaments/${params.id}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictedIds: predicted, stake, paystackReference: ref }),
      });
      if (r.ok) {
        setBetDone(true);
        setShowBetSheet(false);
      } else {
        const d = await r.json();
        setBetError(d.error ?? "Bet failed");
      }
    });
  }

  function togglePick(userId: string) {
    setPredicted((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 3
        ? [...prev, userId]
        : prev,
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4">
        <p className="text-text-dark font-bold">Tournament not found.</p>
        <Link href="/dashboard" className="text-primary text-sm underline">Back to dashboard</Link>
      </div>
    );
  }

  const isUpcoming = tournament.status === "UPCOMING";
  const isLive     = tournament.status === "LIVE";
  const isEnded    = tournament.status === "ENDED";
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-bg-light pb-24">
      {/* Hero */}
      <div className="bg-primary text-white px-4 pt-10 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isLive ? "bg-red-500" : isEnded ? "bg-gray-500" : "bg-gold text-text-dark"
            }`}>
              {tournament.status}
            </span>
          </div>
          <h1 className="text-2xl font-black mb-1">{tournament.name}</h1>
          {tournament.description && (
            <p className="text-white/80 text-sm mb-4">{tournament.description}</p>
          )}

          {/* Prize pool */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Prize Pool</p>
            <p className="text-3xl font-black text-gold">
              ₦{Number(tournament.prizePool).toLocaleString()}
            </p>
          </div>

          {/* Countdown */}
          {isUpcoming && countdown && (
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Tournament starts in</p>
              <div className="flex gap-2">
                <CountdownUnit value={countdown.d} label="Days" />
                <CountdownUnit value={countdown.h} label="Hrs" />
                <CountdownUnit value={countdown.m} label="Min" />
                <CountdownUnit value={countdown.s} label="Sec" />
              </div>
            </div>
          )}

          {isLive && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-sm font-semibold">Tournament is LIVE now!</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Stats bar */}
        <div className="bg-white border border-border rounded-2xl p-4 flex justify-around mb-4">
          <div className="text-center">
            <p className="text-lg font-black text-text-dark">{tournament._count.entries}</p>
            <p className="text-xs text-gray-500">Entered</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-black text-text-dark">₦{Number(tournament.entryFee).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Entry fee</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-black text-text-dark">×5</p>
            <p className="text-xs text-gray-500">Bet payout</p>
          </div>
        </div>

        {/* Actions */}
        {!isEnded && isLoggedIn && (
          <div className="flex flex-col gap-3 mb-4">
            {!entryDone ? (
              <button
                type="button"
                onClick={handleEnter}
                className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm"
              >
                Enter Tournament — ₦{Number(tournament.entryFee).toLocaleString()}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-green-600 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm font-semibold text-green-700">You are entered!</p>
              </div>
            )}

            {!betDone ? (
              <button
                type="button"
                onClick={() => setShowBetSheet(true)}
                className="w-full border-2 border-primary text-primary font-bold py-3.5 rounded-xl text-sm"
              >
                Predict Top 3 — Bet & Win +400%
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-green-600 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm font-semibold text-green-700">Bet placed! Good luck.</p>
              </div>
            )}

            {(entryError || betError) && (
              <p className="text-xs text-red-500 px-1">{entryError || betError}</p>
            )}
          </div>
        )}

        {!isLoggedIn && !isEnded && (
          <Link
            href="/login"
            className="block w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm text-center mb-4"
          >
            Sign in to enter
          </Link>
        )}

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <div className="bg-white border border-border rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-text-dark">Leaderboard</p>
              <Link href={`/tournaments/${params.id}/leaderboard`} className="text-xs text-primary font-semibold">
                Live view →
              </Link>
            </div>
            {leaderboard.slice(0, 10).map((row, i) => (
              <div key={row.userId} className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? "border-b border-border" : ""}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  row.rank === 1 ? "bg-gold text-text-dark" :
                  row.rank === 2 ? "bg-gray-300 text-text-dark" :
                  row.rank === 3 ? "bg-amber-600 text-white" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {row.rank}
                </span>
                <p className="flex-1 text-sm font-medium text-text-dark truncate">{row.name}</p>
                <p className="text-sm font-bold text-primary">{row.totalScore}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bet sheet */}
      {showBetSheet && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBetSheet(false)} />
          <div className="relative mt-auto bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text-dark">Predict Top 3</h2>
              <button type="button" onClick={() => setShowBetSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-gray-500">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">Select exactly 3 players you predict will finish in Top 3. Min stake ₦5,000 — win 5× your stake.</p>

            <div className="mb-4 space-y-2">
              {leaderboard.map((row) => {
                const picked = predicted.includes(row.userId);
                return (
                  <button
                    key={row.userId}
                    type="button"
                    onClick={() => togglePick(row.userId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                      picked ? "border-primary bg-primary/5" : "border-border bg-white"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      row.rank <= 3 ? "bg-gold text-text-dark" : "bg-gray-100 text-gray-500"
                    }`}>
                      {row.rank}
                    </span>
                    <span className="flex-1 text-sm font-medium text-text-dark truncate">{row.name}</span>
                    {picked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-primary flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Stake (₦)</label>
              <input
                type="number"
                min={5000}
                step={1000}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm font-medium text-text-dark outline-none focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Win: ₦{(stake * 5).toLocaleString()} if correct</p>
            </div>

            {betError && <p className="text-xs text-red-500 mb-3">{betError}</p>}

            <button
              type="button"
              onClick={handleBet}
              disabled={predicted.length !== 3}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
            >
              Place Bet — ₦{stake.toLocaleString()}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2">+400% payout if all 3 correct</p>
          </div>
        </div>
      )}
    </div>
  );
}
