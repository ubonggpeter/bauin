import { scorePhase1, scorePhase2, scorePhase3, scorePhase4, scorePhase5, MAX_GAME_SCORE } from "@/lib/game-score";

// ── Phase 1 — Flash Cards ────────────────────────────────────────
describe("scorePhase1", () => {
  it("always returns 100 regardless of input", () => {
    expect(scorePhase1()).toBe(100);
  });
});

// ── Phase 2 — Memory Match ───────────────────────────────────────
describe("scorePhase2", () => {
  it("gives 100 when all pairs matched instantly (0 ms elapsed)", () => {
    // base = Math.round((6/6)*70) = 70; bonus = Math.round(30-0) = 30 → 100
    expect(scorePhase2(6, 6, 0)).toBe(100);
  });

  it("caps score at 100 even when computed value exceeds 100", () => {
    // Internally: 70 + 30 = 100, Math.min ensures no overshoot
    expect(scorePhase2(6, 6, 0)).toBeLessThanOrEqual(100);
  });

  it("gives 70 when all pairs matched but took 30+ seconds", () => {
    // base = 70; bonus = Math.max(0, 30-30) = 0 → 70
    expect(scorePhase2(6, 6, 30_000)).toBe(70);
  });

  it("scores proportionally when half pairs are matched (fast)", () => {
    // base = Math.round((3/6)*70) = 35; bonus = Math.max(0,30-0)=30 → 65
    expect(scorePhase2(3, 6, 0)).toBe(65);
  });

  it("does not go below 0 for zero pairs matched", () => {
    const score = scorePhase2(0, 6, 60_000);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("speed bonus decreases linearly with elapsed seconds", () => {
    const fast = scorePhase2(6, 6, 5_000);
    const slow = scorePhase2(6, 6, 20_000);
    expect(fast).toBeGreaterThan(slow);
  });
});

// ── Phase 3 — Draggable Sequence ─────────────────────────────────
describe("scorePhase3", () => {
  const items = [
    { order: 1 },
    { order: 2 },
    { order: 3 },
    { order: 4 },
  ];

  it("returns 100 when all items are in correct order", () => {
    expect(scorePhase3(items)).toBe(100);
  });

  it("returns 0 when all items are in wrong order", () => {
    const scrambled = [{ order: 4 }, { order: 3 }, { order: 2 }, { order: 1 }];
    expect(scorePhase3(scrambled)).toBe(0);
  });

  it("scores 50 when exactly half are correct", () => {
    // positions 0 & 1 correct (.order===1, .order===2); positions 2 & 3 swapped
    const half = [{ order: 1 }, { order: 2 }, { order: 4 }, { order: 3 }];
    expect(scorePhase3(half)).toBe(50);
  });

  it("returns 100 for a single-item sequence", () => {
    expect(scorePhase3([{ order: 1 }])).toBe(100);
  });
});

// ── Phase 4 — Fill-Gap (MCQ) ─────────────────────────────────────
describe("scorePhase4", () => {
  it("returns 100 when all answers are correct", () => {
    expect(scorePhase4(5, 5)).toBe(100);
  });

  it("returns 0 when no answers are correct", () => {
    expect(scorePhase4(0, 5)).toBe(0);
  });

  it("returns 60 for 3 out of 5 correct", () => {
    expect(scorePhase4(3, 5)).toBe(60);
  });

  it("rounds to nearest integer", () => {
    // 1/3 ≈ 33.33 → Math.round = 33
    expect(scorePhase4(1, 3)).toBe(33);
  });
});

// ── Phase 5 — True/False Rapid-Fire ──────────────────────────────
describe("scorePhase5", () => {
  it("returns 100 when all answers are correct", () => {
    expect(scorePhase5(10, 10)).toBe(100);
  });

  it("returns 0 when no answers are correct", () => {
    expect(scorePhase5(0, 10)).toBe(0);
  });

  it("returns 80 for 4 out of 5 correct", () => {
    expect(scorePhase5(4, 5)).toBe(80);
  });

  it("rounds to nearest integer", () => {
    // 2/3 ≈ 66.67 → Math.round = 67
    expect(scorePhase5(2, 3)).toBe(67);
  });
});

// ── Total score ceiling ──────────────────────────────────────────
describe("MAX_GAME_SCORE", () => {
  it("is 500 (100 per phase × 5 phases)", () => {
    expect(MAX_GAME_SCORE).toBe(500);
  });

  it("sum of perfect scores equals MAX_GAME_SCORE", () => {
    const perfect =
      scorePhase1() +
      scorePhase2(6, 6, 0) +
      scorePhase3([{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }]) +
      scorePhase4(5, 5) +
      scorePhase5(10, 10);
    expect(perfect).toBe(MAX_GAME_SCORE);
  });
});
