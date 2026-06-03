"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Status = {
  maintenanceActive:  boolean;
  maintenanceUntil:   string | null;
  maintenanceMessage: string | null;
};

function useCountdown(until: string | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!until) { setSecs(null); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return secs;
}

function fmt(total: number) {
  const h  = Math.floor(total / 3600);
  const m  = Math.floor((total % 3600) / 60);
  const s  = total % 60;
  const pp = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pp(h)}:${pp(m)}:${pp(s)}`;
  return `${pp(m)}:${pp(s)}`;
}

export default function MaintenanceOverlay() {
  const pathname       = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  // Skip for admin routes and API
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  useEffect(() => {
    if (isAdmin) return;

    async function check() {
      try {
        const r = await fetch("/api/system/status");
        if (r.ok) setStatus(await r.json() as Status);
      } catch { /* ignore */ }
    }

    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => clearInterval(id);
  }, [isAdmin]);

  const countdown = useCountdown(status?.maintenanceUntil ?? null);

  if (isAdmin || !status?.maintenanceActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white"
      style={{ background: "linear-gradient(135deg,#1A6659 0%,#0D3D32 60%,#0a2a22 100%)" }}>

      {/* Background blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle,#F0B429,transparent)" }} />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle,#2D9B82,transparent)" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Logo */}
        <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center shadow-2xl mb-8">
          <span className="text-text-dark font-black text-2xl">B</span>
        </div>

        {/* Wrench icon */}
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-white/80">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black mb-3">We&apos;ll be right back</h1>

        <p className="text-white/70 text-base leading-relaxed mb-8">
          {status.maintenanceMessage?.trim()
            ? status.maintenanceMessage
            : "BAUIN is undergoing scheduled maintenance. We're making improvements to serve you better."}
        </p>

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="mb-8">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Estimated return</p>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-10 py-5">
              <span className="text-5xl sm:text-6xl font-black tabular-nums text-gold">
                {fmt(countdown)}
              </span>
            </div>
          </div>
        )}

        {countdown === 0 && (
          <div className="mb-8 px-6 py-4 bg-green-500/20 border border-green-400/30 rounded-2xl">
            <p className="text-green-300 font-semibold">Almost done — refresh the page shortly</p>
          </div>
        )}

        {/* Status dots */}
        <div className="flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/40"
              style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
        <p className="text-white/30 text-xs mt-4">BAUIN Platform · Nigeria</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
