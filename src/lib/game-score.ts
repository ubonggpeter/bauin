// Pure scoring functions for memory-game phases — extracted from play/page.tsx so they can be unit-tested

/** Phase 1: flash-card slideshow — always full marks */
export function scorePhase1(): number {
  return 100;
}

/**
 * Phase 2: memory-match grid
 * Base score: 70% × (matched/total pairs)
 * Speed bonus: up to 30 pts  (1pt per second under 30 s remaining)
 */
export function scorePhase2(matchedPairs: number, totalPairs: number, elapsedMs: number): number {
  const bonus = Math.max(0, Math.round(30 - elapsedMs / 1000));
  return Math.min(100, Math.round((matchedPairs / totalPairs) * 70) + bonus);
}

/**
 * Phase 3: draggable sequence
 * Score: % of items placed in the correct ordinal position
 * @param order current ordering — each item carries its correct .order (1-indexed)
 */
export function scorePhase3(order: { order: number }[]): number {
  const correct = order.filter((item, idx) => item.order === idx + 1).length;
  return Math.round((correct / order.length) * 100);
}

/**
 * Phase 4: fill-the-gap MCQ (30-second timer per question)
 * Score: % of correct answers
 */
export function scorePhase4(correct: number, total: number): number {
  return Math.round((correct / total) * 100);
}

/**
 * Phase 5: true/false rapid-fire (5 seconds per question)
 * Score: % of correct answers
 */
export function scorePhase5(correct: number, total: number): number {
  return Math.round((correct / total) * 100);
}

/** Maximum possible total score across all five phases */
export const MAX_GAME_SCORE = 500;
