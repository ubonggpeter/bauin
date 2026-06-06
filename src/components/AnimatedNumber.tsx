"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export default function AnimatedNumber({ to, duration = 1000, prefix = "", suffix = "", decimals = 0 }: Props) {
  const [val, setVal]    = useState(0);
  const startRef         = useRef<number | null>(null);
  const rafRef           = useRef<number>();
  const prevTo           = useRef(0);

  useEffect(() => {
    const from = prevTo.current;
    prevTo.current = to;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current!);

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // cubic ease-out
      const current = from + (to - from) * ease;
      setVal(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [to, duration, decimals]);

  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}
