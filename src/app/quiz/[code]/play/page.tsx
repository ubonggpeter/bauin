"use client";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────
type FlashCard  = { id: string; front: string; back: string };
type MemoryPair = { id: string; a: string; b: string };
type SeqItem    = { id: string; text: string; order: number };
type FillGapQ   = { id: string; sentence: string; options: string[]; answer: string };
type TrueFalseQ = { id: string; statement: string; answer: boolean };
type GameContent = {
  flashCards: FlashCard[]; memoryPairs: MemoryPair[]; sequence: SeqItem[];
  fillGap: FillGapQ[]; trueFalse: TrueFalseQ[];
};
type Phase = "loading" | "intro" | 1 | 2 | 3 | 4 | 5 | "done";

// ── Animated count-up ──────────────────────────────────────────────
function AnimatedCount({ to, duration = 1200, prefix = "", suffix = "" }: {
  to: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(Math.round(e * to));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

// ── Phase progress bar ─────────────────────────────────────────────
function PhaseBar({ phase }: { phase: Phase }) {
  const t = useTranslations("GamePlay");
  const idx = typeof phase === "number" ? phase : 0;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-text-dark/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
      <span className="text-white/60 text-xs font-medium w-14">{t("phaseOf", { n: idx })}</span>
      <div className="flex-1 flex gap-1.5">
        {[1,2,3,4,5].map((n) => (
          <div key={n} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
            n < idx ? "bg-green-400" : n === idx ? "bg-gold" : "bg-white/20"
          }`} />
        ))}
      </div>
      <span className="text-white/60 text-xs font-medium w-20 text-right">
        {idx > 0 ? t(`phaseNames.${idx}` as "phaseNames.1") : ""}
      </span>
    </div>
  );
}

// ── Phase result overlay ───────────────────────────────────────────
function PhaseResult({ phase, score, onNext }: { phase: number; score: number; onNext: () => void }) {
  const t = useTranslations("GamePlay");
  const pct = score;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background:"linear-gradient(135deg,#0E4A3D,#1A1A2E)" }}>
      <div className="text-center px-8">
        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: pct >= 60 ? "#1A6659" : "#7c3a3a" }}>
          {pct >= 60
            ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-10 h-10"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-10 h-10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
        </div>
        <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-2">{t("phaseComplete", { n: phase })}</p>
        <h2 className="text-white text-3xl font-black mb-1">{t(`phaseFullNames.${phase}` as "phaseFullNames.1")}</h2>
        <p className="text-white/50 text-sm mb-6">{t("youScored")}</p>
        <div className="text-7xl font-black text-gold mb-2">
          +<AnimatedCount to={score} duration={900} />
        </div>
        <div className="text-white/40 text-sm mb-10">{t("outOf100")}</div>
        <button onClick={onNext}
          className="px-10 py-4 rounded-2xl font-bold text-text-dark text-lg"
          style={{ background:"linear-gradient(135deg,#F0B429,#d4981e)" }}>
          {phase < 5 ? t("nextPhase", { n: phase + 1 }) : t("seeResults")}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHASE 1 — FLASH CARDS
// ══════════════════════════════════════════════════════════════════
function Phase1Flash({ cards, onDone }: { cards: FlashCard[]; onDone: (s: number) => void }) {
  const t = useTranslations("GamePlay.flash");
  const [idx,     setIdx]  = useState(0);
  const [flipped, setFlip] = useState(false);
  const [timeLeft, setTime] = useState(3);

  useEffect(() => {
    setFlip(false); setTime(3);
    const flipId = setTimeout(() => setFlip(true), 1500);
    const nextId = setTimeout(() => {
      if (idx < cards.length - 1) setIdx((i) => i + 1); else onDone(100);
    }, 3000);
    const tick = setInterval(() => setTime((t) => Math.max(0, t-1)), 1000);
    return () => { clearTimeout(flipId); clearTimeout(nextId); clearInterval(tick); };
  }, [idx, cards.length, onDone]);

  const card = cards[idx];
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-14"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-8">
        {t("cardOf", { n: idx + 1, total: cards.length })}
      </p>
      <div className="w-full max-w-sm h-56 relative">
        <div className={`absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-8 transition-all duration-700 shadow-2xl ${
          flipped ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`} style={{ background:"#1A6659" }}>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-4">{t("term")}</p>
          <p className="text-white text-2xl font-black text-center">{card.front}</p>
        </div>
        <div className={`absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-8 transition-all duration-700 shadow-2xl ${
          flipped ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`} style={{ background:"linear-gradient(135deg,#F0B429,#d4981e)" }}>
          <p className="text-text-dark/60 text-xs uppercase tracking-widest mb-4">{t("definition")}</p>
          <p className="text-text-dark text-lg font-bold text-center leading-snug">{card.back}</p>
        </div>
      </div>
      <div className="w-full max-w-sm mt-8">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full transition-all duration-1000 linear"
            style={{ width:`${(timeLeft/3)*100}%` }} />
        </div>
        <p className="text-center text-white/30 text-xs mt-2">{flipped ? t("memorize") : t("remember")}</p>
      </div>
      <div className="flex gap-2 mt-6">
        {cards.map((_,i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i===idx?"bg-gold":i<idx?"bg-green-400":"bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHASE 2 — MEMORY MATCH (4×4 teal grid)
// ══════════════════════════════════════════════════════════════════
type MemCard = { id: string; pairId: string; content: string; state: "hidden"|"revealed"|"matched" };

function Phase2Memory({ pairs, onDone }: { pairs: MemoryPair[]; onDone: (s: number) => void }) {
  const t = useTranslations("GamePlay.memory");
  // Landscape: 3 cols × 4 rows = 12 cards (6 pairs). Portrait: 4×4 = 16 cards (8 pairs).
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: landscape)");
    setIsLandscape(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const activePairs = isLandscape ? pairs.slice(0, 6) : pairs;

  const [cards, setCards] = useState<MemCard[]>(() => {
    const flat = pairs.flatMap((p) => [
      { id:`${p.id}-a`, pairId:p.id, content:p.a, state:"hidden" as const },
      { id:`${p.id}-b`, pairId:p.id, content:p.b, state:"hidden" as const },
    ]);
    for (let i = flat.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [flat[i],flat[j]] = [flat[j],flat[i]];
    }
    return flat;
  });
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched,  setMatched] = useState(0);
  const [locked,   setLocked]  = useState(false);
  const startRef   = useRef(Date.now());
  const pairsRef   = useRef(activePairs);

  // Recompute active cards when orientation changes (restart mini-game with new pair count)
  const [activeCards, setActiveCards] = useState<MemCard[]>([]);
  useEffect(() => {
    pairsRef.current = activePairs;
    const flat = activePairs.flatMap((p) => [
      { id:`${p.id}-a`, pairId:p.id, content:p.a, state:"hidden" as const },
      { id:`${p.id}-b`, pairId:p.id, content:p.b, state:"hidden" as const },
    ]);
    for (let i = flat.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [flat[i],flat[j]] = [flat[j],flat[i]];
    }
    setActiveCards(flat);
    setFlipped([]);
    setMatched(0);
    setLocked(false);
    startRef.current = Date.now();
  // activePairs changes only when isLandscape flips — acceptable restart
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLandscape]);

  // Initialise on first render (useEffect fires after mount)
  useEffect(() => {
    if (activeCards.length === 0) {
      const flat = activePairs.flatMap((p) => [
        { id:`${p.id}-a`, pairId:p.id, content:p.a, state:"hidden" as const },
        { id:`${p.id}-b`, pairId:p.id, content:p.b, state:"hidden" as const },
      ]);
      for (let i = flat.length-1; i > 0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [flat[i],flat[j]] = [flat[j],flat[i]];
      }
      setActiveCards(flat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void cards; // original cards state kept for compat; we use activeCards

  const flip = useCallback((id: string) => {
    if (locked) return;
    setActiveCards((cs) => {
      const c = cs.find((x) => x.id === id);
      if (!c || c.state !== "hidden") return cs;
      return cs.map((x) => x.id===id ? { ...x, state:"revealed" } : x);
    });
    setFlipped((prev) => prev.includes(id) || prev.length >= 2 ? prev : [...prev, id]);
  }, [locked]);

  useEffect(() => {
    if (flipped.length < 2) return;
    const [a,b] = flipped.map((id) => activeCards.find((c) => c.id===id)!);
    if (!a||!b) return;
    const totalPairs = pairsRef.current.length;
    if (a.pairId === b.pairId) {
      setActiveCards((cs) => cs.map((c) => c.id===a.id||c.id===b.id ? { ...c, state:"matched" } : c));
      setMatched((m) => {
        const next = m+1;
        if (next === totalPairs) {
          const bonus = Math.max(0, Math.round(30-(Date.now()-startRef.current)/1000));
          onDone(Math.min(100, Math.round((next/totalPairs)*70)+bonus));
        }
        return next;
      });
      setFlipped([]);
    } else {
      setLocked(true);
      setTimeout(() => {
        setActiveCards((cs) => cs.map((c) => flipped.includes(c.id)&&c.state==="revealed" ? { ...c, state:"hidden" } : c));
        setFlipped([]); setLocked(false);
      }, 900);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  const bg = (s: MemCard["state"]) => s==="matched"?"#16a34a":s==="revealed"?"#F0B429":"#1A6659";
  const gridCols = isLandscape ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="min-h-[100dvh] pt-14 px-3 pb-4 flex flex-col items-center justify-center"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-1">{t("title")}</p>
      <p className="text-white/50 text-xs mb-4">{t("pairsFound", { found: matched, total: activePairs.length })}</p>
      <div className={`grid ${gridCols} gap-2 w-full`} style={{ maxWidth: isLandscape ? "480px" : "360px" }}>
        {activeCards.map((c) => (
          <button key={c.id} onClick={() => flip(c.id)}
            disabled={c.state!=="hidden"||locked}
            className="aspect-square rounded-xl flex items-center justify-center text-center p-1 transition-all duration-300 active:scale-95 disabled:cursor-default"
            style={{
              background: bg(c.state),
              boxShadow: c.state!=="hidden"?"0 4px 12px rgba(0,0,0,0.3)":"none",
              minHeight: "48px",
              minWidth:  "48px",
            }}>
            {c.state==="hidden"
              ? <span className="text-white/30 text-xl font-black">?</span>
              : <span className={`text-[10px] font-bold leading-tight text-center px-0.5 ${c.state==="matched"?"text-white":"text-text-dark"}`}>{c.content}</span>
            }
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        {activePairs.map((_,i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${i<matched?"bg-green-400":"bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHASE 3 — DRAGGABLE SEQUENCE
// ══════════════════════════════════════════════════════════════════
function Phase3Sequence({ items, onDone }: { items: SeqItem[]; onDone: (s: number) => void }) {
  const t = useTranslations("GamePlay.sequence");
  const [order, setOrder] = useState<SeqItem[]>(() => {
    const s = [...items];
    for (let i=s.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [s[i],s[j]]=[s[j],s[i]]; }
    return s;
  });
  const [selected, setSelected] = useState<number|null>(null);
  const [dragging, setDragging] = useState<number|null>(null);
  const [submitted, setSubmitted] = useState(false);

  function tap(i: number) {
    if (selected===null) { setSelected(i); return; }
    if (selected===i)    { setSelected(null); return; }
    setOrder((prev) => { const n=[...prev]; [n[selected],n[i]]=[n[i],n[selected]]; return n; });
    setSelected(null);
  }

  function submit() {
    setSubmitted(true);
    const correct = order.filter((it,i) => it.order===i+1).length;
    setTimeout(() => onDone(Math.round((correct/items.length)*100)), 800);
  }

  return (
    <div className="min-h-[100dvh] pt-14 px-4 pb-6 flex flex-col items-center"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <div className="w-full max-w-md pt-8">
        <p className="text-gold text-sm font-semibold uppercase tracking-widest text-center mb-2">{t("title")}</p>
        <p className="text-white/50 text-xs text-center mb-6">{t("instruction")}</p>
        <div className="flex flex-col gap-2">
          {order.map((item,i) => (
            <div key={item.id} draggable
              onDragStart={() => setDragging(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragging!==null&&dragging!==i) { setOrder((prev) => { const n=[...prev]; [n[dragging],n[i]]=[n[i],n[dragging]]; return n; }); setDragging(null); } }}
              onClick={() => tap(i)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                selected===i?"ring-2 ring-gold scale-[1.02]":dragging===i?"opacity-50":"hover:scale-[1.01]"
              } ${submitted?"pointer-events-none":""}`}
              style={{ background: selected===i?"rgba(240,180,41,0.15)":"rgba(255,255,255,0.08)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background:selected===i?"#F0B429":"#1A6659", color:"white" }}>{i+1}</span>
              <span className="text-white text-sm font-medium flex-1">{item.text}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white/30 flex-shrink-0">
                <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
              </svg>
            </div>
          ))}
        </div>
        <button onClick={submit} disabled={submitted}
          className="w-full mt-6 py-4 rounded-2xl font-black text-text-dark disabled:opacity-60 transition-all active:scale-95"
          style={{ background:"linear-gradient(135deg,#F0B429,#d4981e)" }}>
          {submitted ? t("checking") : t("submit")}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHASE 4 — FILL-GAP (30-sec timer)
// ══════════════════════════════════════════════════════════════════
function Phase4FillGap({ questions, onDone }: { questions: FillGapQ[]; onDone: (s: number) => void }) {
  const t = useTranslations("GamePlay");
  const [qi, setQi]           = useState(0);
  const [selected, setSelected] = useState<string|null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [timeLeft, setTime]     = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const q = questions[qi];

  const advance = useCallback((wasCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (wasCorrect) setCorrect((c) => c+1);
    if (qi < questions.length-1) {
      setTimeout(() => { setQi((i)=>i+1); setSelected(null); setRevealed(false); setTime(30); }, 1000);
    } else {
      const final = wasCorrect ? correct+1 : correct;
      setTimeout(() => onDone(Math.round((final/questions.length)*100)), 1000);
    }
  }, [qi, correct, questions.length, onDone]);

  useEffect(() => {
    setTime(30);
    timerRef.current = setInterval(() => {
      setTime((t) => { if (t<=1) { advance(false); return 0; } return t-1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qi, advance]);

  function pick(opt: string) {
    if (revealed) return;
    setSelected(opt); setRevealed(true); advance(opt===q.answer);
  }

  const parts = q.sentence.split("___");
  return (
    <div className="min-h-[100dvh] pt-14 px-4 pb-6 flex flex-col items-center justify-center"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/50 text-xs">{qi+1} / {questions.length}</span>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-4 h-4 ${timeLeft<=10?"text-red-400":"text-gold"}`}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className={`text-sm font-black tabular-nums ${timeLeft<=10?"text-red-400":"text-gold"}`}>{timeLeft}s</span>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 linear"
            style={{ width:`${(timeLeft/30)*100}%`, background:timeLeft<=10?"#f87171":"#F0B429" }} />
        </div>
        <div className="rounded-3xl p-6 mb-6 text-center" style={{ background:"rgba(255,255,255,0.06)" }}>
          <p className="text-lg text-white font-bold leading-relaxed">
            {parts[0]}
            <span className="inline-block min-w-[80px] border-b-2 border-gold mx-1 text-gold">
              {revealed ? selected : "___"}
            </span>
            {parts[1]}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt) => {
            const isSelected = selected===opt;
            const isRight    = revealed&&opt===q.answer;
            const isWrong    = revealed&&isSelected&&opt!==q.answer;
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={revealed}
                className={`py-4 px-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                  isRight?"bg-green-500 text-white":isWrong?"bg-red-500 text-white":
                  isSelected?"bg-gold text-text-dark":"bg-white/10 text-white hover:bg-white/15"
                }`}>{opt}
              </button>
            );
          })}
        </div>
        <p className="text-center text-white/30 text-xs mt-5">{t("fillGap.correctSoFar", { n: correct })}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHASE 5 — TRUE / FALSE
// ══════════════════════════════════════════════════════════════════
function Phase5TrueFalse({ questions, onDone }: { questions: TrueFalseQ[]; onDone: (s: number) => void }) {
  const t = useTranslations("GamePlay");
  const [qi,       setQi]      = useState(0);
  const [answered, setAnswered] = useState<boolean|null>(null);
  const [correct,  setCorrect]  = useState(0);
  const [timeLeft, setTime]     = useState(5);
  const q = questions[qi];

  const advance = useCallback((ans: boolean|null) => {
    const wasCorrect = ans!==null && ans===q.answer;
    if (wasCorrect) setCorrect((c)=>c+1);
    if (qi < questions.length-1) {
      setTimeout(() => { setQi((i)=>i+1); setAnswered(null); setTime(5); }, 900);
    } else {
      const final = wasCorrect ? correct+1 : correct;
      setTimeout(() => onDone(Math.round((final/questions.length)*100)), 900);
    }
  }, [qi, q.answer, correct, questions.length, onDone]);

  useEffect(() => {
    setTime(5);
    const tick = setInterval(() => {
      setTime((t) => { if (t<=1) { clearInterval(tick); advance(null); return 0; } return t-1; });
    }, 1000);
    return () => clearInterval(tick);
  }, [qi, advance]);

  function pick(val: boolean) { if (answered!==null) return; setAnswered(val); advance(val); }

  const isCorrect = answered!==null && answered===q.answer;
  const isWrong   = answered!==null && answered!==q.answer;
  return (
    <div className="min-h-[100dvh] pt-14 px-4 pb-6 flex flex-col items-center justify-center"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-xs">{qi+1} / {questions.length}</span>
          <span className={`text-2xl font-black tabular-nums ${timeLeft<=2?"text-red-400":"text-gold"}`}>{timeLeft}</span>
        </div>
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 80 80" className="w-16 h-16 -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
            <circle cx="40" cy="40" r="36" fill="none"
              stroke={timeLeft<=2?"#f87171":"#F0B429"} strokeWidth="6"
              strokeDasharray={`${2*Math.PI*36}`}
              strokeDashoffset={`${2*Math.PI*36*(1-timeLeft/5)}`}
              className="transition-all duration-1000 linear" strokeLinecap="round"/>
          </svg>
        </div>
        <div className={`rounded-3xl p-6 mb-8 text-center transition-all duration-300 ${
          isCorrect?"bg-green-500/20 border border-green-500/40":
          isWrong?"bg-red-500/20 border border-red-500/40":"border border-white/10"
        }`} style={!(isCorrect||isWrong)?{background:"rgba(255,255,255,0.06)"}:{}}>
          <p className="text-xl text-white font-bold leading-snug">{q.statement}</p>
          {answered!==null && (
            <p className={`mt-3 text-sm font-semibold ${isCorrect?"text-green-400":"text-red-400"}`}>
              {isCorrect ? t("trueFalse.correct") : t("trueFalse.wrong", { answer: q.answer ? t("trueFalse.true") : t("trueFalse.false") })}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => pick(true)} disabled={answered!==null}
            className={`rounded-2xl font-black text-xl transition-all active:scale-95 ${
              answered!==null&&q.answer===true?"bg-green-500 text-white":
              answered!==null&&answered===true?"bg-red-500 text-white":"bg-green-600/80 text-white hover:bg-green-600"
            }`}
            style={{ minHeight: "56px" }}>{t("trueFalse.true")}</button>
          <button onClick={() => pick(false)} disabled={answered!==null}
            className={`rounded-2xl font-black text-xl transition-all active:scale-95 ${
              answered!==null&&q.answer===false?"bg-green-500 text-white":
              answered!==null&&answered===false?"bg-red-500 text-white":"bg-red-600/80 text-white hover:bg-red-600"
            }`}
            style={{ minHeight: "56px" }}>{t("trueFalse.false")}</button>
        </div>
        <p className="text-center text-white/30 text-xs mt-5">{t("results.correctSoFar", { n: correct })}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// WINNER SCREEN (rank === 1)
// ══════════════════════════════════════════════════════════════════
function WinnerScreen({ total, onContinue }: { total: number; onContinue: () => void }) {
  const t = useTranslations("GamePlay.winner");
  useEffect(() => {
    const burst = () => confetti({
      particleCount: 120, spread: 80, origin: { y: 0.55 },
      colors: ["#F0B429","#1A6659","#ffffff","#d4981e","#34d399"],
    });
    burst();
    const id1 = setTimeout(() => burst(), 600);
    const id2 = setTimeout(() => confetti({
      particleCount: 80, spread: 120, origin: { y: 0.4 },
      colors: ["#F0B429","#ffffff","#fbbf24"],
    }), 1200);
    return () => { clearTimeout(id1); clearTimeout(id2); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "linear-gradient(135deg,#0E4A3D,#1A1A2E)" }}>
      {/* "■X Won" teal banner */}
      <div className="flex items-center gap-3 px-6 py-3 rounded-2xl mb-8"
        style={{ background: "#1A6659", boxShadow: "0 0 40px rgba(26,102,89,0.6)" }}>
        <span className="text-gold text-2xl">■</span>
        <span className="text-white font-black text-2xl tracking-wide">{t("youWon")}</span>
        <span className="text-gold text-2xl">■</span>
      </div>

      {/* Trophy */}
      <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg,#F0B429,#d4981e)", boxShadow: "0 0 60px rgba(240,180,41,0.4)" }}>
        <svg viewBox="0 0 24 24" fill="white" className="w-14 h-14">
          <path d="M8 21h8M12 17v4M7 4H4a1 1 0 00-1 1v3c0 2.76 1.79 5.1 4.35 5.76C8.12 15.47 9.97 17 12 17s3.88-1.53 4.65-3.24C19.21 13.1 21 10.76 21 8V5a1 1 0 00-1-1h-3"/>
          <path d="M7 4h10v5a5 5 0 01-10 0V4z"/>
        </svg>
      </div>

      <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-2">{t("firstPlace")}</p>
      <p className="text-white/60 text-sm mb-4">{t("finished1st")}</p>
      <div className="text-7xl font-black text-white mb-1">
        <AnimatedCount to={total} duration={1500} />
      </div>
      <p className="text-white/40 text-sm mb-10">{t("pointsMax")}</p>

      <button onClick={onContinue}
        className="px-10 py-4 rounded-2xl font-black text-text-dark text-lg"
        style={{ background: "linear-gradient(135deg,#F0B429,#d4981e)" }}>
        {t("viewResults")}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SAVE WINNINGS PROMPT  (shown to unauthenticated users after game)
// ══════════════════════════════════════════════════════════════════
function SaveWinningsPrompt({ total }: { total: number }) {
  const t = useTranslations("GamePlay.savePrompt");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-slide-up">
      <div className="max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg,#F0B429,#d4981e)" }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-black text-text-dark text-lg leading-tight">
                {t("title")}
              </p>
              <p className="text-text-dark/70 text-sm mt-0.5">
                {t("desc", { total })}
              </p>
            </div>
            <button onClick={() => setDismissed(true)}
              className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <a href={`/auth/register/viewer?score=${total}`}
            className="block w-full py-3 rounded-xl bg-text-dark text-white font-black text-sm text-center hover:bg-gray-900 transition-colors">
            {t("cta")}
          </a>
          <p className="text-center text-text-dark/50 text-xs mt-2">{t("note")}</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ══════════════════════════════════════════════════════════════════
function ResultsScreen({ scores, rank, totalPlayers, onShare, showSavePrompt }: {
  scores: number[]; rank: number | null; totalPlayers: number; onShare: () => void;
  showSavePrompt?: boolean;
}) {
  const t = useTranslations("GamePlay");
  const total = scores.reduce((a,b) => a+b, 0);
  const max   = 500;
  const pct   = Math.round((total/max)*100);
  const phaseFullNames = [1,2,3,4,5].map((n) => t(`phaseFullNames.${n}` as "phaseFullNames.1"));

  const rankLabel =
    rank === 1 ? "🥇" :
    rank === 2 ? "🥈" :
    rank === 3 ? "🥉" : `#${rank}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <div className="w-full max-w-sm">
        {/* Trophy */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background:"linear-gradient(135deg,#F0B429,#d4981e)" }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12">
              <path d="M8 21h8M12 17v4M7 4H4a1 1 0 00-1 1v3c0 2.76 1.79 5.1 4.35 5.76C8.12 15.47 9.97 17 12 17s3.88-1.53 4.65-3.24C19.21 13.1 21 10.76 21 8V5a1 1 0 00-1-1h-3"/>
              <path d="M7 4h10v5a5 5 0 01-10 0V4z"/>
            </svg>
          </div>
        </div>

        <p className="text-gold text-sm font-semibold uppercase tracking-widest text-center mb-1">{t("results.gameComplete")}</p>

        {/* Rank */}
        {rank && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">{rankLabel}</span>
            <span className="text-white/70 text-sm font-medium">
              {t("results.rankOf", { rank, total: totalPlayers })}
            </span>
          </div>
        )}

        {/* Score */}
        <div className="text-center mb-6">
          <span className="text-7xl font-black text-white">
            <AnimatedCount to={total} duration={1400} />
          </span>
          <span className="text-2xl font-bold text-white/40">/{max}</span>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: pct>=80?"#16a34a":pct>=60?"#F0B429":"#dc2626",
                       color: pct>=60&&pct<80?"#1A1A2E":"white" }}>
              {pct}% — {pct>=80 ? t("results.excellent") : pct>=60 ? t("results.goodJob") : t("results.keepPractising")}
            </span>
          </div>
        </div>

        {/* Phase breakdown */}
        <div className="rounded-3xl overflow-hidden mb-6" style={{ background:"rgba(255,255,255,0.06)" }}>
          {phaseFullNames.map((name,i) => (
            <div key={i} className={`flex items-center px-5 py-3.5 ${i<phaseFullNames.length-1?"border-b border-white/5":""}`}>
              <span className="text-white/60 text-sm w-28">{name}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full mx-3 overflow-hidden">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width:`${scores[i]||0}%` }} />
              </div>
              <span className="text-white font-bold text-sm tabular-nums w-10 text-right">{scores[i]||0}</span>
            </div>
          ))}
        </div>

        <button onClick={onShare}
          className="w-full py-4 rounded-2xl font-black text-text-dark text-lg active:scale-95"
          style={{ background:"linear-gradient(135deg,#F0B429,#d4981e)" }}>
          {t("results.shareResult")}
        </button>
        <button onClick={() => window.history.back()}
          className="w-full mt-3 py-3 rounded-2xl text-white/60 text-sm font-medium hover:text-white transition-colors">
          {t("results.backToLobby")}
        </button>
      </div>
      {showSavePrompt && <SaveWinningsPrompt total={total} />}
    </div>
  );
}

// ── Intro countdown ────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  const t = useTranslations("GamePlay");
  const [count, setCount] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => { if (c<=1) { clearInterval(id); onStart(); return 0; } return c-1; }), 1000);
    return () => clearInterval(id);
  }, [onStart]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
      <p className="text-gold text-sm font-semibold uppercase tracking-widest">{t("getReady")}</p>
      <div className="text-9xl font-black text-white" style={{ lineHeight:1, animation:"pop 1s ease infinite" }}>
        {count || t("go")}
      </div>
      <p className="text-white/40 text-sm">{t("phases500")}</p>
      <style>{`@keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function QuizPlayPage() {
  const t = useTranslations("GamePlay");
  const { code }           = useParams<{ code: string }>();
  const router             = useRouter();
  const { status: authStatus } = useSession();

  const [phase,       setPhase]       = useState<Phase>("loading");
  const [showResult,  setShowResult]  = useState(false);
  const [showWinner,  setShowWinner]  = useState(false);
  const [content,     setContent]     = useState<GameContent|null>(null);
  const [entryId,     setEntryId]     = useState<string|null>(null);
  const [scores,      setScores]      = useState<number[]>([]);
  const [rank,        setRank]        = useState<number|null>(null);
  const [totalPlayers,setTotalPlayers]= useState(0);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const infoRes = await fetch(`/api/quiz/${code}`);
        if (!infoRes.ok) { router.replace(`/quiz/${code}`); return; }
        const info = await infoRes.json();
        if (!mounted) return;
        setContent(info.gameContent);
        const joinRes = await fetch(`/api/quiz/${code}/join`, { method:"POST" });
        if (joinRes.ok) { const j = await joinRes.json(); if (mounted) setEntryId(j.entryId); }
        if (mounted) setPhase("intro");
      } catch { if (mounted) router.replace(`/quiz/${code}`); }
    })();
    return () => { mounted = false; };
  }, [code, router]);

  function recordScore(phaseNum: number, score: number) {
    setScores((prev) => { const n=[...prev]; n[phaseNum-1]=score; return n; });
    setShowResult(true);
  }

  async function advanceFromResult() {
    setShowResult(false);
    const cur = typeof phase === "number" ? phase : 0;
    if (cur < 5) {
      setPhase((cur+1) as Phase);
    } else {
      if (entryId) {
        setSubmitting(true);
        try {
          const finalScores = scores; // captured in closure
          const res = await fetch(`/api/quiz/${code}/score`, {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({
              entryId,
              phase1Score: finalScores[0]??0,
              phase2Score: finalScores[1]??0,
              phase3Score: finalScores[2]??0,
              phase4Score: finalScores[3]??0,
              phase5Score: finalScores[4]??0,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setRank(data.rank);
            setTotalPlayers(data.totalPlayers ?? 1);
            if (data.rank === 1) { setShowWinner(true); }
          }
        } finally { setSubmitting(false); }
      }
      setPhase("done");
    }
  }

  function handleShare() {
    const total = scores.reduce((a,b)=>a+b,0);
    const text  = `I scored ${total}/500 on the BAUIN Quiz! 🏆 Try to beat me: ${window.location.origin}/quiz/${code}`;
    if (navigator.share) navigator.share({ text, url:`${window.location.origin}/quiz/${code}` });
    else navigator.clipboard.writeText(text);
  }

  // Winner overlay
  if (showWinner) {
    return <WinnerScreen total={scores.reduce((a,b)=>a+b,0)} onContinue={() => setShowWinner(false)} />;
  }

  // Phase result overlay
  if (showResult && typeof phase === "number") {
    return <PhaseResult phase={phase} score={scores[phase-1]??0} onNext={advanceFromResult} />;
  }

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background:"linear-gradient(160deg,#0E4A3D,#1A1A2E)" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">{t("loadingGame")}</p>
        </div>
      </div>
    );
  }

  // Intro
  if (phase === "intro") return <IntroScreen onStart={() => setPhase(1)} />;

  // Done
  if (phase === "done") {
    return (
      <div>
        {submitting && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/60 text-xs flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t("saving")}
          </div>
        )}
        <ResultsScreen scores={scores} rank={rank} totalPlayers={totalPlayers} onShare={handleShare}
          showSavePrompt={authStatus === "unauthenticated"} />
      </div>
    );
  }

  if (!content) return null;

  return (
    <div>
      <PhaseBar phase={phase} />
      {phase===1 && <Phase1Flash   cards={content.flashCards}     onDone={(s)=>recordScore(1,s)} />}
      {phase===2 && <Phase2Memory  pairs={content.memoryPairs}    onDone={(s)=>recordScore(2,s)} />}
      {phase===3 && <Phase3Sequence items={content.sequence}      onDone={(s)=>recordScore(3,s)} />}
      {phase===4 && <Phase4FillGap  questions={content.fillGap}   onDone={(s)=>recordScore(4,s)} />}
      {phase===5 && <Phase5TrueFalse questions={content.trueFalse} onDone={(s)=>recordScore(5,s)} />}
    </div>
  );
}
