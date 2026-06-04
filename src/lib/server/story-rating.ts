import { prisma } from "@/lib/db";

// ── Constants ─────────────────────────────────────────────────────────────────

const WEIGHT_STARS      = 0.40;
const WEIGHT_PLAYERS    = 0.30;
const WEIGHT_SCORE      = 0.20;
const WEIGHT_COMPLETION = 0.10;

const FEATURED_MIN_RATING  = 4.0;
const FEATURED_MIN_REVIEWS = 3;
const HIDE_MAX_RATING      = 2.5;
const HIDE_MIN_REVIEWS     = 5;

// Normalisation caps
const PLAYERS_FOR_MAX = 100;  // 100 quiz players → full 5/5 player score
const SCORE_FOR_MAX   = 500;  // 500 total quiz score → full 5/5 score (5 phases × 100)

// ── Public ────────────────────────────────────────────────────────────────────

export async function recalculateStoryRating(storyId: string): Promise<void> {
  try {
    const story = await prisma.story.findUnique({
      where:  { id: storyId },
      select: {
        reviews: { select: { stars: true } },
        episodes: {
          select: {
            quizSessions: {
              where:  { status: "ENDED" },
              select: {
                entries: {
                  select: { totalScore: true, completedAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!story) return;

    // ── Component 1: buyer stars (40%) ──────────────────────────────────────
    const reviews    = story.reviews;
    const reviewCount = reviews.length;
    const avgStars    = reviewCount > 0
      ? reviews.reduce((s, r) => s + r.stars, 0) / reviewCount
      : 0;

    // ── Component 2-4: quiz data ─────────────────────────────────────────────
    const allEntries = story.episodes.flatMap((ep) =>
      ep.quizSessions.flatMap((qs) => qs.entries),
    );
    const playerCount    = allEntries.length;
    const avgTotalScore  = playerCount > 0
      ? allEntries.reduce((s, e) => s + e.totalScore, 0) / playerCount
      : 0;
    const completionRate = playerCount > 0
      ? allEntries.filter((e) => e.completedAt !== null).length / playerCount
      : 0;

    // ── Normalise all to 0-5 scale ───────────────────────────────────────────
    const starScore       = avgStars;                                          // already 0-5
    const playerScore     = Math.min(5, (playerCount / PLAYERS_FOR_MAX) * 5); // 100 players → 5
    const quizScore       = Math.min(5, (avgTotalScore / SCORE_FOR_MAX) * 5); // 500 pts → 5
    const completionScore = completionRate * 5;                                // 0–100% → 0-5

    // ── Weighted composite ───────────────────────────────────────────────────
    const raw = (
      WEIGHT_STARS      * starScore       +
      WEIGHT_PLAYERS    * playerScore     +
      WEIGHT_SCORE      * quizScore       +
      WEIGHT_COMPLETION * completionScore
    );
    const rating = Math.round(raw * 100) / 100;

    // ── Auto-rules ───────────────────────────────────────────────────────────
    const isFeatured      = rating >= FEATURED_MIN_RATING && reviewCount >= FEATURED_MIN_REVIEWS;
    const hiddenForReview = !isFeatured && rating < HIDE_MAX_RATING && reviewCount >= HIDE_MIN_REVIEWS;

    await prisma.story.update({
      where: { id: storyId },
      data: {
        rating,
        ratingCount:     reviewCount,
        avgStars:        Math.round(avgStars * 100) / 100,
        isFeatured,
        hiddenForReview,
      },
    });
  } catch (err) {
    console.error("[story-rating] recalculate error for", storyId, err);
  }
}
