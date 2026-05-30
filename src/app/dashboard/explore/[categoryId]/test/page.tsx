"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LEARN_CATEGORIES } from "@/lib/learn-data";

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
};

type TestResult = {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  breakdown: BreakdownItem[];
  passPercent: number;
};

type Phase = "loading" | "error" | "pre" | "testing" | "submitting" | "results";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl">
            {category?.icon ?? "📝"}
          </div>
          <h2 className="text-xl font-bold text-text-dark">{category?.name ?? "Certification"} Test</h2>
          <p className="text-sm text-gray-500">Read each question carefully before selecting your answer.</p>
        </div>

        {/* Info boxes */}
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

        {/* Rules */}
        <ul className="w-full space-y-2 text-sm text-gray-600">
          {[
            "You cannot navigate back during the test.",
            "Browser navigation is disabled once started.",
            "Score must meet the pass mark to certify.",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                ✓
              </span>
              {rule}
            </li>
          ))}
        </ul>

        {/* Buttons */}
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-dark transition-colors"
        >
          Start Test →
        </button>
        <Link
          href={`/dashboard/explore/${category ? (LEARN_CATEGORIES.find(c => c.name === category.name)?.id ?? "") : ""}`}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
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
      {/* Letter badge */}
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

  // Timer
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
      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">
              Question {index + 1} of {total}
            </span>
            <span className={`text-sm font-bold tabular-nums ${urgency ? "text-red-500" : "text-primary"}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>
          <div className="h-1.5 bg-bg-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-start pt-8">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-5">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Q{index + 1} of {total}
            </span>
            <p className="text-text-dark font-semibold text-base mt-3 leading-relaxed">
              {current.question}
            </p>
          </div>

          {/* Options */}
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

          {/* Next button */}
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

// ─── Loading / submitting screen ──────────────────────────────────────────────

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

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  result,
  category,
  categoryId,
  onRetake,
}: {
  result: TestResult;
  category: { name: string; icon: string } | undefined;
  categoryId: string;
  onRetake: () => void;
}) {
  const { correct, total, score, passed, breakdown, passPercent } = result;

  return (
    <div className="min-h-screen bg-bg-light p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Score card */}
        <div
          className={`rounded-2xl p-6 mb-6 text-white text-center ${
            passed ? "bg-primary" : "bg-gray-700"
          }`}
        >
          <div className="text-5xl mb-3">{passed ? "🏆" : "📚"}</div>
          <p className="text-primary-light text-sm font-medium mb-1">
            {category?.name ?? "Certification"} Test
          </p>
          <p className="text-5xl font-black text-gold mb-2">{score}%</p>
          <p className="text-white/80 text-sm">
            {correct} correct out of {total} questions
          </p>

          <div
            className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full font-bold text-sm ${
              passed ? "bg-gold text-text-dark" : "bg-white/20 text-white"
            }`}
          >
            {passed ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Passed — Certified!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Failed — Pass mark is {passPercent}%
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {!passed && (
            <button
              onClick={onRetake}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors"
            >
              Retake Test
            </button>
          )}
          <Link
            href="/dashboard/explore"
            className="flex-1 py-3 rounded-xl border-2 border-border text-text-dark font-bold text-sm hover:border-primary hover:text-primary transition-colors text-center"
          >
            Back to Training
          </Link>
        </div>

        {/* Breakdown */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-semibold text-text-dark text-sm">Answer Breakdown</p>
          </div>
          <div className="divide-y divide-border">
            {breakdown.map((item, idx) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.isCorrect ? "bg-primary" : "bg-red-100"
                    }`}
                  >
                    {item.isCorrect ? (
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-dark leading-snug">
                      {idx + 1}. {item.question}
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      <p className={`text-xs ${item.isCorrect ? "text-primary font-semibold" : "text-red-500"}`}>
                        Your answer: {item.yourAnswer ? `${item.yourAnswer} — ${item.options[item.yourAnswer as keyof typeof item.options]}` : "Not answered"}
                      </p>
                      {!item.isCorrect && (
                        <p className="text-xs text-primary font-semibold">
                          Correct: {item.correctAnswer} — {item.options[item.correctAnswer as keyof typeof item.options]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage({ params }: { params: { categoryId: string } }) {
  const categoryId = params.categoryId;
  const category = LEARN_CATEGORIES.find((c) => c.id === categoryId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch questions on mount
  useEffect(() => {
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

  // Prevent browser back during test
  useEffect(() => {
    if (phase !== "testing") return;

    window.history.pushState({ testActive: true }, "");

    function handlePop() {
      window.history.pushState({ testActive: true }, "");
    }
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("popstate", handlePop);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [phase]);

  const submitAnswers = useCallback(
    async (submittedAnswers: Record<string, string>) => {
      setAnswers(submittedAnswers);
      setPhase("submitting");

      // Show loading screen for at least 2 seconds
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

  function startTest() {
    setPhase("testing");
  }

  function retake() {
    setAnswers({});
    setResult(null);
    setPhase("pre");
  }

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
          <Link href={`/dashboard/explore/${categoryId}`} className="text-primary text-sm hover:underline">
            ← Back to Topics
          </Link>
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

  if (phase === "submitting") {
    return <SubmittingScreen />;
  }

  if (phase === "results" && result) {
    return (
      <ResultsScreen
        result={result}
        category={category ? { name: category.name, icon: category.icon } : undefined}
        categoryId={categoryId}
        onRetake={retake}
      />
    );
  }

  return null;
}
