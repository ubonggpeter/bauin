"use client";

import { useEffect, useRef, useState } from "react";

type Milestone = {
  type:           string;
  label:          string;
  headline:       string;
  hitAt:          string;
  bannerExpiresAt:string;
};

type Particle = {
  id:       number;
  color:    string;
  left:     string;
  delay:    string;
  duration: string;
  size:     string;
  rotate:   string;
  isCircle: boolean;
};

const COLORS = ["#F0B429", "#1A6659", "#ffffff", "#F0B429", "#d4a017", "#2dd4bf"];

function buildParticles(): Particle[] {
  return Array.from({ length: 70 }, (_, i) => ({
    id:       i,
    color:    COLORS[i % COLORS.length],
    left:     `${(i * 1.43) % 100}%`,
    delay:    `${((i * 0.11) % 3).toFixed(2)}s`,
    duration: `${(3 + (i * 0.14) % 2.5).toFixed(2)}s`,
    size:     `${(7 + (i * 0.19) % 7).toFixed(0)}px`,
    rotate:   `${(i * 37) % 360}deg`,
    isCircle: i % 5 === 0,
  }));
}

const DISMISS_KEY = "bauin-dismissed-milestones";

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

export default function MilestoneBanner() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [current,   setCurrent]     = useState(0);
  const [particles, setParticles]   = useState<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate particles only on client to avoid hydration mismatch
  useEffect(() => { setParticles(buildParticles()); }, []);

  async function load() {
    try {
      const res  = await fetch("/api/system/milestones");
      const data = await res.json() as { milestones: Milestone[] };
      const dismissed = getDismissed();
      const visible = data.milestones.filter((m) => !dismissed.has(m.type));
      setMilestones(visible);
      setCurrent(0);
    } catch { /* silent — banner is non-critical */ }
  }

  useEffect(() => {
    void load();
    const poll = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  // Cycle through multiple active milestones every 8s
  useEffect(() => {
    if (milestones.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % milestones.length);
    }, 8_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [milestones.length]);

  function dismiss(type: string) {
    const set = getDismissed();
    set.add(type);
    saveDismissed(set);
    setMilestones((prev) => prev.filter((m) => m.type !== type));
    setCurrent(0);
  }

  if (milestones.length === 0 || particles.length === 0) return null;

  const m = milestones[current];

  return (
    <>
      {/* Confetti overlay — pointer-events: none so it never blocks clicks */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          zIndex: 9998, overflow: "hidden",
        }}
      >
        <style>{`
          @keyframes confettiFall {
            0%   { transform: translateY(-20px) rotate(var(--r)); opacity: 1; }
            80%  { opacity: 0.8; }
            100% { transform: translateY(100vh) rotate(calc(var(--r) + 720deg)); opacity: 0; }
          }
          @keyframes confettiFallRepeat {
            0%   { transform: translateY(-20px) rotate(var(--r)); opacity: 0; }
            5%   { opacity: 1; }
            90%  { opacity: 0.6; }
            100% { transform: translateY(100vh) rotate(calc(var(--r) + 900deg)); opacity: 0; }
          }
          .confetti-piece {
            position: absolute;
            top: 0;
            animation: confettiFallRepeat var(--dur) var(--delay) infinite linear;
            will-change: transform;
          }
        `}</style>
        {particles.map((p) => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left:            p.left,
              width:           p.size,
              height:          p.isCircle ? p.size : `calc(${p.size} * 1.6)`,
              borderRadius:    p.isCircle ? "50%" : "2px",
              background:      p.color,
              "--r":           p.rotate,
              "--dur":         p.duration,
              "--delay":       p.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Banner */}
      <div
        role="banner"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(135deg,#1A6659 0%,#0D3D32 60%,#0a2a22 100%)",
          borderBottom: "2px solid #F0B429",
          padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          {/* Pulsing dot */}
          <span style={{ position: "relative", flexShrink: 0 }}>
            <style>{`
              @keyframes pingM { 75%,100%{transform:scale(2);opacity:0} }
              .ms-ping { animation: pingM 1.2s cubic-bezier(0,0,.2,1) infinite; }
            `}</style>
            <span
              className="ms-ping"
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#F0B429", opacity: 0.75,
              }}
            />
            <span style={{
              position: "relative", display: "block", width: 10, height: 10,
              borderRadius: "50%", background: "#F0B429",
            }} />
          </span>

          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0, color: "#F0B429", fontWeight: 700, fontSize: 13,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Platform Milestone
            </p>
            <p style={{
              margin: 0, color: "#ffffff", fontWeight: 600, fontSize: 15,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {m.headline}
            </p>
            <p style={{ margin: 0, color: "#a3e6d8", fontSize: 12 }}>
              ₦500 bonus credited to all active members · Special badge awarded
            </p>
          </div>
        </div>

        {/* Dot indicators for multiple milestones */}
        {milestones.length > 1 && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {milestones.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: 6, height: 6, borderRadius: "50%", border: "none", cursor: "pointer",
                  background: i === current ? "#F0B429" : "rgba(255,255,255,0.3)",
                  padding: 0,
                }}
                aria-label={`Milestone ${i + 1}`}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => dismiss(m.type)}
          style={{
            flexShrink: 0, background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.7)", fontSize: 18, lineHeight: 1, padding: "4px 6px",
          }}
          aria-label="Dismiss milestone banner"
        >
          ×
        </button>
      </div>

      {/* Spacer so page content isn't hidden behind banner */}
      <div style={{ height: 68 }} aria-hidden="true" />
    </>
  );
}
