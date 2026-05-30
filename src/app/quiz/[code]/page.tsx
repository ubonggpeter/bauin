"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SessionInfo = {
  collection: {
    name:                string;
    description:         string | null;
    isInUse:             boolean;
    scheduledActivateAt: string | null;
    hostName:            string;
  };
  session: { id: string; status: string; title: string };
  playerCount: number;
  prizePool:   number;
};

// ── Countdown ────────────────────────────────────────────────────
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

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

// ── Animated prize counter ────────────────────────────────────────
function PrizeCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const diff  = value - prev.current;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(Math.round(prev.current + (diff * i) / steps));
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 30);
    return () => clearInterval(id);
  }, [value]);

  return <>{displayed.toLocaleString()}</>;
}

export default function QuizLobbyPage() {
  const { code }  = useParams<{ code: string }>();
  const router    = useRouter();
  const [info, setInfo]       = useState<SessionInfo | null>(null);
  const [error, setError]     = useState("");
  const [joining, setJoining] = useState(false);
  const [pulse, setPulse]     = useState(false);

  const countdown = useCountdown(
    info?.collection.scheduledActivateAt ?? null
  );

  // ── Poll session info every 2 s ─────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res  = await fetch(`/api/quiz/${code}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Not found"); return; }
        setInfo((prev) => {
          if (prev && data.playerCount !== prev.playerCount) setPulse(true);
          return data as SessionInfo;
        });
      } catch { /* network hiccup — keep previous */ }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); void mounted; };
  }, [code]);

  // Clear pulse animation
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
        setError(d.error ?? "Could not join");
        setJoining(false);
        return;
      }
      router.push(`/quiz/${code}/play`);
    } catch {
      setError("Network error. Please try again.");
      setJoining(false);
    }
  }

  const canPlay = info?.collection.isInUse && info?.session.status !== "ENDED";
  const ended   = info?.session.status === "ENDED";

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0E4A3D 0%, #1A1A2E 60%, #0a1628 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #1A6659, transparent)" }} />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #F0B429, transparent)" }} />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #1A6659, transparent)" }} />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-gold/30"
          style={{
            top:       `${10 + i * 11}%`,
            left:      `${5 + i * 12}%`,
            animation: `float ${3 + i * 0.4}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-14px); } }
        @keyframes pop   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
      `}</style>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-md">
        {/* Top badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            LIVE QUIZ SESSION
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* ── Header gradient ── */}
          <div className="relative px-6 pt-8 pb-6"
            style={{ background: "linear-gradient(135deg, #1A6659 0%, #0E4A3D 100%)" }}
          >
            {/* Host */}
            <p className="text-xs text-white/60 font-medium uppercase tracking-widest mb-2">
              Hosted by {info?.collection.hostName ?? "—"}
            </p>
            <h1 className="text-2xl font-black text-white leading-tight mb-1">
              {info?.session.title ?? info?.collection.name ?? "Loading…"}
            </h1>
            {info?.collection.description && (
              <p className="text-sm text-white/60 mt-1 line-clamp-2">
                {info.collection.description}
              </p>
            )}

            {/* Status chip */}
            <div className="absolute top-6 right-6">
              {ended ? (
                <span className="px-3 py-1 bg-red-500/20 border border-red-400/40 rounded-full text-red-300 text-xs font-semibold">
                  Ended
                </span>
              ) : canPlay ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-400/40 rounded-full text-green-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full text-yellow-300 text-xs font-semibold">
                  Coming Soon
                </span>
              )}
            </div>
          </div>

          {/* ── Prize pool ── */}
          <div className="px-6 py-6 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest text-center mb-2">
              Live Prize Pool
            </p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-black text-gold">₦</span>
              <span className="text-5xl font-black text-gold tabular-nums leading-none">
                {info ? <PrizeCounter value={info.prizePool} /> : "—"}
              </span>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Grows with every player who joins
            </p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            {/* Players */}
            <div className="px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"
                  style={pulse ? { animation: "pop 0.6s ease" } : {}}
                />
                <span className="text-2xl font-black text-text-dark tabular-nums">
                  {info?.playerCount ?? 0}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Players Joined</p>
            </div>
            {/* Phases */}
            <div className="px-6 py-4 text-center">
              <span className="text-2xl font-black text-text-dark">5</span>
              <p className="text-xs text-gray-400 font-medium mt-1">Game Phases</p>
            </div>
          </div>

          {/* ── Countdown (if scheduled) ── */}
          {!canPlay && countdown !== null && countdown > 0 && (
            <div className="px-6 py-4 bg-gold/5 border-b border-gold/20 text-center">
              <p className="text-xs text-gold/70 font-medium uppercase tracking-wide mb-1">
                Starts in
              </p>
              <p className="text-3xl font-black text-gold tabular-nums">{fmt(countdown)}</p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* ── CTA ── */}
          <div className="px-6 py-6">
            {ended ? (
              <div className="py-4 text-center text-gray-500 text-sm">
                This session has ended. Check back for the next round!
              </div>
            ) : canPlay ? (
              <button
                onClick={handlePlay}
                disabled={joining}
                className="w-full py-4 rounded-2xl font-black text-lg text-text-dark transition-all active:scale-95 disabled:opacity-70 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #F0B429 0%, #d4981e 100%)" }}
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                    Joining…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Play Now
                  </span>
                )}
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-gray-100 text-center text-gray-400 text-sm font-semibold">
                {countdown === 0 ? "Starting soon…" : "Not available yet"}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-3">
              {info?.playerCount
                ? `Join ${info.playerCount} player${info.playerCount !== 1 ? "s" : ""} competing right now`
                : "Be the first to join!"}
            </p>
          </div>
        </div>

        {/* Phase preview strip */}
        <div className="mt-4 flex gap-2 justify-center">
          {["Flash", "Memory", "Sequence", "Fill-Gap", "True/False"].map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-white/80 text-xs font-bold">{i + 1}</span>
              </div>
              <span className="text-white/50 text-[9px] font-medium">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
