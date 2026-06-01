"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Row = {
  rank:       number;
  userId:     string;
  name:       string;
  totalScore: number;
};

type StreamPayload = {
  leaderboard: Row[];
  status:      "UPCOMING" | "LIVE" | "ENDED";
  error?:      string;
};

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return (
    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
      {rank}
    </span>
  );
}

export default function LiveLeaderboardPage({ params }: { params: { id: string } }) {
  const [rows, setRows]     = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("LOADING");
  const [error, setError]   = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/tournaments/${params.id}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: StreamPayload = JSON.parse(e.data);
        if (data.error) { setError(data.error); return; }
        setRows(data.leaderboard);
        setStatus(data.status);
        setLastUpdate(new Date());
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setError("Connection lost. Retrying…");
    };

    return () => { es.close(); };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-bg-light pb-24">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/tournaments/${params.id}`} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h1 className="text-xl font-black">Live Leaderboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {status === "LIVE" ? (
              <>
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-white/80 text-xs">Updating every 5 seconds</span>
              </>
            ) : status === "ENDED" ? (
              <span className="text-white/80 text-xs">Tournament ended — final results</span>
            ) : (
              <span className="text-white/80 text-xs">Connecting…</span>
            )}
            {lastUpdate && (
              <span className="ml-auto text-white/50 text-xs">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {rows.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading leaderboard…</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            {rows.map((row, i) => (
              <div
                key={row.userId}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < rows.length - 1 ? "border-b border-border" : ""} ${row.rank <= 3 ? "bg-gold/5" : ""}`}
              >
                <div className="flex-shrink-0 w-8 flex items-center justify-center">
                  <Medal rank={row.rank} />
                </div>
                <p className="flex-1 text-sm font-semibold text-text-dark truncate">{row.name}</p>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-primary">{row.totalScore}</p>
                  <p className="text-[10px] text-gray-400">pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
