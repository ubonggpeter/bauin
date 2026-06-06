"use client";
import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

const SHAKE = {
  rotate: [0, -18, 16, -12, 10, -6, 4, 0],
  transition: { duration: 0.55, ease: "easeInOut" },
};

export default function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const [count, setCount]   = useState(0);
  const [seen, setSeen]     = useState(false);
  const controls            = useAnimation();

  useEffect(() => {
    fetch("/api/notifications/count")
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then(({ count: n }) => {
        setCount(n);
        if (n > 0) setTimeout(() => controls.start(SHAKE), 800);
      })
      .catch(() => {});
  }, [controls]);

  return (
    <button
      onClick={() => setSeen(true)}
      className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-primary-light hover:text-white hover:bg-white/10 transition-colors w-full ${
        collapsed ? "justify-center" : ""
      }`}
      aria-label="Notifications"
    >
      <motion.span animate={controls} className="flex-shrink-0 block">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && !seen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="absolute top-2 left-6 w-4 h-4 bg-gold text-text-dark text-[9px] font-black rounded-full flex items-center justify-center leading-none"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </motion.span>
      {!collapsed && <span className="text-sm font-medium">Notifications</span>}
    </button>
  );
}
