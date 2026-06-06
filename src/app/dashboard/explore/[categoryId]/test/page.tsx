"use client";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePaystackPayment } from "react-paystack";
import { useSession } from "next-auth/react";
import { LEARN_CATEGORIES } from "@/lib/learn-data";
import FeedbackModal from "@/components/FeedbackModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type SafeQuestion = {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
};

type TestConfig = {
  count: number;
  passPercent: number;
  timeLimitMin: number;
};

type BreakdownItem = {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  yourAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  topicIndex: number;
  topicTitle: string;
};

type TestResult = {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  breakdown: BreakdownItem[];
  passPercent: number;
  topicTitles: string[];
};

type Phase = "loading" | "error" | "pre" | "testing" | "submitting" | "results";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function downloadCertificate(categoryName: string, score: number) {
  const W = 900, H = 640;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Outer teal background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1A6659");
  grad.addColorStop(1, "#0E4A3D");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // White inner card
  const m = 44;
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, m, m, W - m * 2, H - m * 2, 18);
  ctx.fill();

  // Gold top accent bar
  ctx.fillStyle = "#F0B429";
  ctx.fillRect(m, m, W - m * 2, 10);

  // BAUIN title
  ctx.fillStyle = "#1A6659";
  ctx.font = "bold 54px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("BAUIN", W / 2, 148);

  ctx.fillStyle = "#999";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText("Billionaires AI Users Income Network", W / 2, 174);

  // "Certificate of Achievement"
  ctx.fillStyle = "#F0B429";
  ctx.font = "bold 24px Georgia, serif";
  ctx.fillText("CERTIFICATE  OF  ACHIEVEMENT", W / 2, 224);

  // Divider
  ctx.strokeStyle = "#E8E8E8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m + 100, 245);
  ctx.lineTo(W - m - 100, 245);
  ctx.stroke();

  // Body text
  ctx.fillStyle = "#777";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("This certifies that the holder has successfully completed", W / 2, 285);
  ctx.fillText("the", W / 2, 310);

  // Category name (larger, teal)
  ctx.fillStyle = "#1A6659";
  ctx.font = "bold 30px Georgia, serif";
  ctx.fillText(categoryName, W / 2, 365);

  ctx.fillStyle = "#777";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("Certification Programme", W / 2, 395);

  // Score + date
  ctx.fillStyle = "#1A1A2E";
  ctx.font = "bold 17px Arial, sans-serif";
  ctx.fillText(`Final Score: ${score}%`, W / 2, 440);

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.fillStyle = "#aaa";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(`Issued: ${date}`, W / 2, 463);

  // Lower divider
  ctx.strokeStyle = "#E8E8E8";
  ctx.beginPath();
  ctx.moveTo(m + 100, 485);
  ctx.lineTo(W - m - 100, 485);
  ctx.stroke();

  // Gold seal checkmarks
  ctx.fillStyle = "#F0B429";
  ctx.font = "bold 30px Arial";
  ctx.fillText("✓", W / 2 - 110, 534);
  ctx.fillText("✓", W / 2 + 110, 534);

  // Authority text
  ctx.fillStyle = "#1A6659";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("BAUIN Certification Authority", W / 2, 534);

  // Download
  const link = document.createElement("a");
  link.download = `BAUIN-${categoryName.replace(/\s+/g, "-")}-Certificate.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function fireGoldConfetti() {
  const colors = ["#F0B429", "#ffffff", "#2B8A72", "#f5c842"];
  const end = Date.now() + 3200;

  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ─── Pre-test modal ───────────────────────────────────────────────────────────

function PreModal({
  category,
  config,
  onStart,
}: {
  category: { name: string; icon: string } | undefined;
  config: TestConfig;
  onStart: () => void;
}) {
  const catId = LEARN_CATEGORIES.find((c) => c.name === category?.name)?.id ?? "";

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl">
            {category?.icon ?? "📝"}
          </div>
          <h2 className="text-xl font-bold text-text-dark">{category?.name ?? "Certification"} Test</h2>
          <p className="text-sm text-gray-500">Read each question carefully before selecting your answer.</p>
        </div>

        <div className="w-full grid grid-cols-3 gap-3">
          <div className="bg-bg-light rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-primary">{config.count}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-none">Questions</p>
          </div>
          <div className="bg-bg-light rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-primary">{config.passPercent}%</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-none">Pass Mark</p>
          </div>
          <div className="bg-bg-light rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-primary">{config.timeLimitMin}m</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-none">Time Limit</p>
          </div>
        </div>

        <ul className="w-full space-y-2 text-sm text-gray-600">
          {[
            "You cannot navigate back during the test.",
            "Browser navigation is disabled once started.",
            "Score must meet the pass mark to certify.",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
              {rule}
            </li>
          ))}
        </ul>

        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-dark transition-colors"
        >
          Start Test →
        </button>
        <Link href={`/dashboard/explore/${catId}`} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Topics
        </Link>
      </div>
    </div>
  );
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  letter,
  text,
  selected,
  onClick,
}: {
  letter: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 ${
        selected
          ? "bg-primary border-primary text-white"
          : "bg-white border-border text-text-dark hover:border-primary/50 hover:bg-primary/5"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
          selected ? "bg-white/20 text-white" : "bg-bg-light text-gray-500"
        }`}
      >
        {selected ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          letter
        )}
      </span>
      <span className="flex-1 text-sm font-medium leading-snug">{text}</span>
    </button>
  );
}

// ─── Test screen ──────────────────────────────────────────────────────────────

function TestScreen({
  questions,
  categoryId,
  timeLimitSec,
  onFinish,
}: {
  questions: SafeQuestion[];
  categoryId: string;
  timeLimitSec: number;
  onFinish: (answers: Record<string, string>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = questions[index];
  const total = questions.length;
  const progress = ((index + 1) / total) * 100;
  const isLast = index === total - 1;
  const urgency = timeLeft <= 60;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          onFinish({ ...answers });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(letter: string) {
    setSelected(letter);
  }

  function next() {
    if (!selected) return;
    const updated = { ...answers, [current.id]: selected };
    setAnswers(updated);
    if (isLast) {
      clearInterval(timerRef.current!);
      onFinish(updated);
    } else {
      setIndex((i) => i + 1);
      setSelected(answers[questions[index + 1]?.id] ?? null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Question {index + 1} of {total}</span>
            <span className={`text-sm font-bold tabular-nums ${urgency ? "text-red-500" : "text-primary"}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>
          <div className="h-1.5 bg-bg-light rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-start pt-8">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-5">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Q{index + 1} of {total}</span>
            <p className="text-text-dark font-semibold text-base mt-3 leading-relaxed">{current.question}</p>
          </div>

          <div className="flex flex-col gap-3">
            {OPTION_KEYS.map((letter) => (
              <OptionButton
                key={letter}
                letter={letter}
                text={current.options[letter]}
                selected={selected === letter}
                onClick={() => choose(letter)}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={!selected}
            className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              selected
                ? "bg-primary text-white hover:bg-primary-dark shadow-sm"
                : "bg-bg-light text-gray-300 cursor-not-allowed"
            }`}
          >
            {isLast ? "Submit Test →" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Submitting screen ────────────────────────────────────────────────────────

function SubmittingScreen() {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-6 text-white">
      <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-xl font-bold">Grading your test…</p>
        <p className="text-primary-light text-sm mt-1">This will only take a moment.</p>
      </div>
    </div>
  );
}

// ─── Pass screen ──────────────────────────────────────────────────────────────

function PassScreen({
  result,
  category,
}: {
  result: TestResult;
  category: { name: string; icon: string } | undefined;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    fireGoldConfetti();
    if (!localStorage.getItem("fb:cert:shown")) {
      const t = setTimeout(() => setShowFeedback(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4 text-white">
      {/* White checkmark circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 shadow-xl"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#1A6659" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="text-primary-light text-sm font-medium mb-1"
      >{category?.name ?? "Certification"}</motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="text-3xl font-black text-gold mb-2"
      >Congratulations!</motion.h1>
      <p className="text-white/80 text-base mb-6">You passed the certification test.</p>

      {/* Score chip */}
      <div className="bg-white/15 rounded-2xl px-8 py-4 text-center mb-8">
        <p className="text-gold text-5xl font-black">{result.score}%</p>
        <p className="text-white/70 text-sm mt-1">{result.correct} / {result.total} correct</p>
      </div>

      {/* Download certificate */}
      <button
        onClick={() => downloadCertificate(category?.name ?? "AI Certification", result.score)}
        className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gold text-text-dark font-bold text-sm hover:bg-yellow-400 transition-colors shadow-lg mb-4"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Certificate
      </button>

      <Link href="/dashboard/explore" className="text-primary-light text-sm hover:text-white transition-colors">
        ← Back to Training
      </Link>

      {showFeedback && (
        <FeedbackModal
          feature="CERTIFICATION"
          delayMs={0}
          onClose={() => {
            localStorage.setItem("fb:cert:shown", "1");
            setShowFeedback(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Fail screen ──────────────────────────────────────────────────────────────

function FailScreen({
  result,
  category,
  categoryId,
  userEmail,
  freeRetryUsed,
  onFreeRetry,
  onPaidRetry,
}: {
  result: TestResult;
  category: { name: string; icon: string } | undefined;
  categoryId: string;
  userEmail: string;
  freeRetryUsed: boolean;
  onFreeRetry: () => void;
  onPaidRetry: () => void;
}) {
  const retryRef = useRef(`retry-${categoryId}-${Date.now()}`);

  const paystackConfig = {
    reference: retryRef.current,
    email: userEmail,
    amount: 150000, // ₦1,500 in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
    currency: "NGN",
    label: `${category?.name ?? "Test"} Retry`,
  };

  const initPayment = usePaystackPayment(paystackConfig);

  function handlePaidRetry() {
    initPayment({ onSuccess: () => onPaidRetry(), onClose: () => {} });
  }

  // Group breakdown by topic (5 topics × 2 questions)
  const topicGroups = result.topicTitles.map((title, i) => {
    const items = result.breakdown.filter((b) => b.topicIndex === i);
    const correct = items.filter((b) => b.isCorrect).length;
    return { title, correct, total: items.length };
  });

  const weakTopics = topicGroups.filter((t) => t.correct < t.total).map((t) => t.title);

  function buildFocusMessage() {
    if (weakTopics.length === 0) return null;
    if (weakTopics.length === 1) return weakTopics[0];
    const last = weakTopics[weakTopics.length - 1];
    const rest = weakTopics.slice(0, -1).join(", ");
    return `${rest} and ${last}`;
  }

  const focusMessage = buildFocusMessage();

  return (
    <div className="min-h-screen bg-bg-light p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Fail header */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-5 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>

          <p className="text-gray-500 text-sm mb-1">{category?.name ?? "Certification"} Test</p>
          <p className="text-4xl font-black text-text-dark mb-1">{result.score}%</p>
          <p className="text-gray-500 text-sm">{result.correct} of {result.total} correct — need {result.passPercent}% to pass</p>
        </div>

        {/* Focus info box */}
        {focusMessage && (
          <div className="bg-primary rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-white text-sm leading-relaxed">
              Focus on <span className="font-bold">{focusMessage}</span> and you will pass next time.
            </p>
          </div>
        )}

        {/* Topic breakdown table */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="font-semibold text-text-dark text-sm">Topic Breakdown</p>
          </div>
          <div className="divide-y divide-border">
            {topicGroups.map((group, i) => {
              const perfect = group.correct === group.total;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      perfect ? "bg-primary" : "bg-red-50"
                    }`}
                  >
                    {perfect ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <p className="flex-1 text-sm text-text-dark min-w-0 truncate">{group.title}</p>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      perfect ? "bg-primary/10 text-primary" : "bg-red-50 text-red-500"
                    }`}
                  >
                    {group.correct}/{group.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Retry buttons */}
        <div className="flex flex-col gap-3">
          {!freeRetryUsed && (
            <button
              onClick={onFreeRetry}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-dark transition-colors"
            >
              Retry for Free →
            </button>
          )}

          <button
            onClick={handlePaidRetry}
            className="w-full py-3.5 rounded-xl font-bold text-base text-text-dark transition-colors"
            style={{ background: "linear-gradient(135deg, #F0B429 0%, #f5c842 100%)" }}
          >
            {freeRetryUsed ? "Unlock Retry — ₦1,500 →" : "Skip Queue — Pay ₦1,500 →"}
          </button>

          <Link
            href="/dashboard/explore"
            className="w-full py-3 rounded-xl border-2 border-border text-text-dark font-semibold text-sm hover:border-primary hover:text-primary transition-colors text-center"
          >
            Back to Training
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage({ params }: { params: { categoryId: string } }) {
  const categoryId = params.categoryId;
  const category = LEARN_CATEGORIES.find((c) => c.id === categoryId);
  const { data: session } = useSession();
  const userEmail = (session?.user?.email as string | undefined) ?? "user@bauin.com";

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [freeRetryUsed, setFreeRetryUsed] = useState(false);

  // Fetch questions + restore retry state from localStorage
  useEffect(() => {
    const used = localStorage.getItem(`bauin-free-retry-${categoryId}`) === "true";
    setFreeRetryUsed(used);

    fetch(`/api/learn/test/${categoryId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setQuestions(data.questions);
        setConfig(data.config);
        setPhase("pre");
      })
      .catch((e) => {
        setErrorMsg(e.message ?? "Failed to load test.");
        setPhase("error");
      });
  }, [categoryId]);

  // Block back navigation during test
  useEffect(() => {
    if (phase !== "testing") return;
    window.history.pushState({ testActive: true }, "");

    function handlePop() { window.history.pushState({ testActive: true }, ""); }
    function handleBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = ""; }

    window.addEventListener("popstate", handlePop);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [phase]);

  const submitAnswers = useCallback(
    async (submittedAnswers: Record<string, string>) => {
      setPhase("submitting");
      const [res] = await Promise.all([
        fetch(`/api/learn/test/${categoryId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: submittedAnswers }),
        }).then((r) => r.json()),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      setResult(res);
      setPhase("results");
    },
    [categoryId]
  );

  function startTest() { setPhase("testing"); }

  function handleFreeRetry() {
    localStorage.setItem(`bauin-free-retry-${categoryId}`, "true");
    setFreeRetryUsed(true);
    setResult(null);
    setPhase("pre");
  }

  function handlePaidRetry() {
    setResult(null);
    setPhase("pre");
  }

  // ── Render ──
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading test…</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-dark font-semibold mb-2">Couldn't load the test</p>
          <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
          <Link href={`/dashboard/explore/${categoryId}`} className="text-primary text-sm hover:underline">← Back to Topics</Link>
        </div>
      </div>
    );
  }

  if (phase === "pre" && config) {
    return (
      <PreModal
        category={category ? { name: category.name, icon: category.icon } : undefined}
        config={config}
        onStart={startTest}
      />
    );
  }

  if (phase === "testing" && config) {
    return (
      <TestScreen
        questions={questions}
        categoryId={categoryId}
        timeLimitSec={config.timeLimitMin * 60}
        onFinish={submitAnswers}
      />
    );
  }

  if (phase === "submitting") return <SubmittingScreen />;

  if (phase === "results" && result) {
    const catInfo = category ? { name: category.name, icon: category.icon } : undefined;
    if (result.passed) {
      return <PassScreen result={result} category={catInfo} />;
    }
    return (
      <FailScreen
        result={result}
        category={catInfo}
        categoryId={categoryId}
        userEmail={userEmail}
        freeRetryUsed={freeRetryUsed}
        onFreeRetry={handleFreeRetry}
        onPaidRetry={handlePaidRetry}
      />
    );
  }

  return null;
}
