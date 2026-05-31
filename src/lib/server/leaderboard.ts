/**
 * Weekly leaderboard — scores = cumulative QuizEntry.totalScore this week.
 * Redis sorted-set key: leaderboard:weekly (score DESC = ZREVRANGE).
 * Meta (name, avatarUrl, rank) cached as leaderboard:weekly:meta JSON.
 */
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { creditWallet, makeRef } from "@/lib/server/wallet";

const LB_KEY      = "leaderboard:weekly";
const LB_META_KEY = "leaderboard:weekly:meta";
const LB_TTL      = 3600; // 1 hour

export type LbEntry = {
  rank:      number;
  userId:    string;
  name:      string;
  avatarUrl: string | null;
  userRank:  string;
  score:     number;
};

// Monday 00:00 UTC of the current week
function weekStart(): Date {
  const now  = new Date();
  const day  = now.getUTCDay(); // 0=Sun, 1=Mon…6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const mon  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return mon;
}

// Next Sunday 23:59:59 UTC
export function weekEnd(): Date {
  const start = weekStart();
  const end   = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// Seconds until Sunday midnight UTC
export function secondsUntilReset(): number {
  return Math.max(0, Math.floor((weekEnd().getTime() - Date.now()) / 1000));
}

// ── Refresh leaderboard from DB ───────────────────────────────────────────────

export async function refreshLeaderboard(): Promise<void> {
  const since = weekStart();

  // Aggregate total quiz score per user for sessions that ended this week
  const rows = await prisma.quizEntry.groupBy({
    by:        ["userId"],
    where: {
      quizSession: { status: "ENDED", endedAt: { gte: since } },
    },
    _sum:      { totalScore: true },
    orderBy:   { _sum: { totalScore: "desc" } },
    take:      100,
  });

  if (rows.length === 0) {
    // Cache empty so callers know refresh happened
    await cacheSet(LB_META_KEY, JSON.stringify([]), LB_TTL);
    return;
  }

  const userIds = rows.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true, rank: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const entries: LbEntry[] = rows.map((r, i) => {
    const u = userMap.get(r.userId);
    return {
      rank:      i + 1,
      userId:    r.userId,
      name:      u?.name ?? "Unknown",
      avatarUrl: u?.avatarUrl ?? null,
      userRank:  u?.rank ?? "MEMBER",
      score:     r._sum.totalScore ?? 0,
    };
  });

  await cacheSet(LB_META_KEY, JSON.stringify(entries), LB_TTL);
}

// ── Read leaderboard (cache-first) ────────────────────────────────────────────

export async function getLeaderboard(limit = 10): Promise<LbEntry[]> {
  const cached = await cacheGet(LB_META_KEY);
  if (cached) {
    const all: LbEntry[] = JSON.parse(cached);
    return all.slice(0, limit);
  }

  // Warm the cache on-demand
  await refreshLeaderboard();
  const fresh = await cacheGet(LB_META_KEY);
  if (fresh) return (JSON.parse(fresh) as LbEntry[]).slice(0, limit);
  return [];
}

export async function getUserLeaderboardRank(
  userId: string,
): Promise<{ rank: number; score: number } | null> {
  const cached = await cacheGet(LB_META_KEY);
  if (cached) {
    const all: LbEntry[] = JSON.parse(cached);
    const entry = all.find((e) => e.userId === userId);
    return entry ? { rank: entry.rank, score: entry.score } : null;
  }
  return null;
}

// ── Weekly close: pay top 3, reset ───────────────────────────────────────────

export async function closeWeeklyCompetition(): Promise<void> {
  const top3    = await getLeaderboard(3);
  const prizes  = [0.60, 0.25, 0.15];

  // Fetch prize pool from PlatformSettings (default ₦30,000)
  let prizePool = 30_000;
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: "WEEKLY_PRIZE_POOL" },
    });
    if (setting) prizePool = Number(setting.value);
  } catch { /* use default */ }

  const weekEnd_  = weekEnd();
  const weekStart_ = weekStart();

  const winnersJson = top3.map((entry, i) => ({
    userId: entry.userId,
    name:   entry.name,
    rank:   i + 1,
    score:  entry.score,
    prize:  Math.round(prizePool * prizes[i]),
  }));

  // Record competition in DB
  await prisma.weeklyCompetition.create({
    data: {
      weekStart: weekStart_,
      weekEnd:   weekEnd_,
      status:    "CLOSED",
      prizePool,
      winners:   winnersJson,
      closedAt:  new Date(),
    },
  });

  // Credit winners
  for (let i = 0; i < top3.length; i++) {
    const prize = Math.round(prizePool * prizes[i]);
    if (prize <= 0) continue;
    try {
      await creditWallet(
        top3[i].userId,
        prize,
        "LEADERBOARD_PRIZE",
        `Weekly leaderboard prize — Rank ${i + 1}`,
        makeRef("WKLB", top3[i].userId),
        { rank: i + 1, score: top3[i].score, weekStart: weekStart_.toISOString() },
      );
    } catch (err) {
      console.error(`[leaderboard] prize credit failed for rank ${i + 1}:`, err);
    }
  }

  // Clear Redis so next week starts fresh
  await cacheDel(LB_META_KEY);
  await cacheDel(LB_KEY);
}
