import {
  calcPrizeBreakdown,
  DISTRIBUTOR_PCT,
  PLATFORM_PCT,
  WINNER_PCT,
  VIEWER_REF_PCT,
  WINNER_SHARES,
} from "@/lib/server/quiz-prize";

const FIXED_SUM = DISTRIBUTOR_PCT + PLATFORM_PCT + WINNER_PCT + VIEWER_REF_PCT; // 90

describe("Prize-distribution constants", () => {
  it("fixed slices sum to 90% leaving 10% headroom for royalties", () => {
    expect(FIXED_SUM).toBe(90);
  });

  it("WINNER_SHARES sum to exactly 1.00", () => {
    const total = WINNER_SHARES.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

describe("calcPrizeBreakdown", () => {
  const PLAYERS = 10;
  const FEE     = 500;
  const ENTRY_POOL = PLAYERS * FEE; // 5000

  describe("standard scenario — royaltyPct = 10%", () => {
    const bd = calcPrizeBreakdown(PLAYERS, FEE, 10);

    it("calculates the correct entry pool", () => expect(bd.entryPool).toBe(ENTRY_POOL));
    it("gives distributor 50%", () => expect(bd.distributorCut).toBe(2500));
    it("gives platform 30%", () => expect(bd.platformCut).toBe(1500));
    it("gives winner pool 5%", () => expect(bd.winnerPool).toBe(250));
    it("gives royalty the requested 10% (within headroom)", () => {
      expect(bd.actualRoyaltyPct).toBe(10);
      expect(bd.royaltyCut).toBe(500);
    });
    it("viewerRefPool absorbs the remainder so all slices sum to entryPool", () => {
      const total = bd.distributorCut + bd.platformCut + bd.royaltyCut + bd.winnerPool + bd.viewerRefPool;
      expect(total).toBe(ENTRY_POOL);
    });
  });

  describe("royalty clamping — royaltyPct > headroom (10%)", () => {
    it("clamps royalty to 10% when input is 25%", () => {
      const bd = calcPrizeBreakdown(PLAYERS, FEE, 25);
      expect(bd.actualRoyaltyPct).toBe(10);
    });

    it("clamps royalty to 10% when input is 100%", () => {
      const bd = calcPrizeBreakdown(PLAYERS, FEE, 100);
      expect(bd.actualRoyaltyPct).toBe(10);
    });

    it("all slices still sum to entryPool after clamping", () => {
      const bd = calcPrizeBreakdown(PLAYERS, FEE, 50);
      const total = bd.distributorCut + bd.platformCut + bd.royaltyCut + bd.winnerPool + bd.viewerRefPool;
      expect(total).toBe(ENTRY_POOL);
    });
  });

  describe("zero royalty", () => {
    it("royaltyCut is 0", () => {
      const bd = calcPrizeBreakdown(PLAYERS, FEE, 0);
      expect(bd.royaltyCut).toBe(0);
    });

    it("viewerRefPool grows to absorb the freed royalty share", () => {
      const bd = calcPrizeBreakdown(PLAYERS, FEE, 0);
      const withRoyalty = calcPrizeBreakdown(PLAYERS, FEE, 10);
      expect(bd.viewerRefPool).toBeGreaterThan(withRoyalty.viewerRefPool);
    });
  });

  describe("single player edge case", () => {
    it("all slices sum to entryPool with 1 player", () => {
      const bd = calcPrizeBreakdown(1, 500, 10);
      const total = bd.distributorCut + bd.platformCut + bd.royaltyCut + bd.winnerPool + bd.viewerRefPool;
      expect(total).toBe(500);
    });
  });

  describe("winner share per-prize correctness", () => {
    it("individual winner prizes derived from WINNER_SHARES sum to winnerPool (±2 due to rounding)", () => {
      const bd = calcPrizeBreakdown(20, 500, 10);
      const prizes = WINNER_SHARES.map((s) => Math.round(bd.winnerPool * s));
      const sum = prizes.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - bd.winnerPool)).toBeLessThanOrEqual(2);
    });

    it("1st-place prize is largest", () => {
      const bd = calcPrizeBreakdown(10, 500, 10);
      const [p1, p2, p3] = WINNER_SHARES.map((s) => Math.round(bd.winnerPool * s));
      expect(p1).toBeGreaterThan(p2);
      expect(p2).toBeGreaterThan(p3);
    });
  });
});
