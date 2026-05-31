/**
 * Pure prize-distribution math extracted from api/quiz/close route.
 * All constants and formulas live here so they can be unit-tested.
 */

export const DISTRIBUTOR_PCT  = 50;
export const PLATFORM_PCT     = 30;
export const WINNER_PCT       = 5;
export const VIEWER_REF_PCT   = 5;
/** Top-3 winner share of the winner pool */
export const WINNER_SHARES    = [0.60, 0.25, 0.15] as const;

export type PrizeBreakdown = {
  entryPool:       number;
  distributorCut:  number;
  platformCut:     number;
  royaltyCut:      number;
  winnerPool:      number;
  viewerRefPool:   number;
  actualRoyaltyPct: number;
};

/**
 * Compute how the entry pool is divided.
 *
 * The royalty percentage is clamped so the five slices never exceed 100%.
 * Fixed slices: distributor=50%, platform=30%, winner=5%, viewer-ref=5% → 90% total.
 * Remaining headroom for royalty: 10%.
 *
 * viewerRefPool is calculated as the remainder after all other cuts so rounding
 * errors stay contained there (never negative for realistic inputs).
 */
export function calcPrizeBreakdown(
  playerCount:  number,
  entryFee:     number,
  royaltyPctIn: number,
): PrizeBreakdown {
  const entryPool = playerCount * entryFee;

  const maxRoyalty = 100 - DISTRIBUTOR_PCT - PLATFORM_PCT - WINNER_PCT - VIEWER_REF_PCT;
  const actualRoyaltyPct = Math.min(royaltyPctIn, maxRoyalty);

  const distributorCut = Math.round(entryPool * DISTRIBUTOR_PCT     / 100);
  const platformCut    = Math.round(entryPool * PLATFORM_PCT        / 100);
  const royaltyCut     = Math.round(entryPool * actualRoyaltyPct    / 100);
  const winnerPool     = Math.round(entryPool * WINNER_PCT          / 100);
  const viewerRefPool  = entryPool - distributorCut - platformCut - royaltyCut - winnerPool;

  return { entryPool, distributorCut, platformCut, royaltyCut, winnerPool, viewerRefPool, actualRoyaltyPct };
}
