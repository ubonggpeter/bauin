"use client";

import { useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// ── Teal icon ─────────────────────────────────────────────────────
function OnlineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
      <path d="M5 12.55a11 11 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.56 9" />
      <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function NetworkStatusToast() {
  const online    = useOnlineStatus();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }

    if (online) {
      toast.custom(
        (t) => (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#1A6659", color: "white",
              padding: "10px 16px", borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,.2)",
              fontSize: 14, fontWeight: 600,
              opacity: t.visible ? 1 : 0,
              transition: "opacity .2s",
            }}
          >
            <OnlineIcon />
            Back online
          </div>
        ),
        { id: "network-status", duration: 3000 },
      );
    } else {
      toast.custom(
        (t) => (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#1A1A2E", color: "white",
              padding: "10px 16px", borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,.25)",
              fontSize: 14, fontWeight: 600,
              opacity: t.visible ? 1 : 0,
              transition: "opacity .2s",
            }}
          >
            <OfflineIcon />
            No connection — working offline
          </div>
        ),
        { id: "network-status", duration: Infinity },
      );
    }
  }, [online]);

  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#1A6659",
          color: "white",
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,.15)",
        },
        success: { iconTheme: { primary: "#F0B429", secondary: "#1A6659" } },
        error:   { style: { background: "#7f1d1d" } },
      }}
    />
  );
}
