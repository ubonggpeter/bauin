/**
 * Redis cache + pub/sub helpers for quiz sessions.
 * All functions degrade gracefully when REDIS_URL is unset.
 */
import { getRedis, cacheGet, cacheSet, cacheDel } from "@/lib/redis";

const SESSION_TTL     = 30;   // seconds — short; player count changes frequently
const LEADERBOARD_TTL = 15;

// ── Cached session shape ──────────────────────────────────────────
export type CachedSession = {
  sessionId:    string;
  collectionId: string;
  collectionUserId: string;
  publicLinkCode:   string;
  title:        string;
  status:       string;
  playerCount:  number;
  prizePool:    number;
  entryFee:     number;
  episodeId:    string | null;
  startedAt:    string | null;
  endedAt:      string | null;
  players: { id: string; userId: string; name: string }[];
};

export async function getCachedSession(code: string): Promise<CachedSession | null> {
  const raw = await cacheGet(`quiz:session:${code}`);
  return raw ? (JSON.parse(raw) as CachedSession) : null;
}

export async function setCachedSession(code: string, data: CachedSession): Promise<void> {
  await cacheSet(`quiz:session:${code}`, JSON.stringify(data), SESSION_TTL);
}

export async function invalidateCachedSession(code: string): Promise<void> {
  await cacheDel(`quiz:session:${code}`);
}

// ── Leaderboard ───────────────────────────────────────────────────
export type LeaderboardEntry = {
  entryId:     string;
  userId:      string;
  name:        string;
  totalScore:  number;
  rank:        number;
  completedAt: string | null;
};

export async function getCachedLeaderboard(sessionId: string): Promise<LeaderboardEntry[] | null> {
  const raw = await cacheGet(`quiz:leaderboard:${sessionId}`);
  return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : null;
}

export async function setCachedLeaderboard(sessionId: string, entries: LeaderboardEntry[]): Promise<void> {
  await cacheSet(`quiz:leaderboard:${sessionId}`, JSON.stringify(entries), LEADERBOARD_TTL);
}

export async function invalidateCachedLeaderboard(sessionId: string): Promise<void> {
  await cacheDel(`quiz:leaderboard:${sessionId}`);
}

// ── Pub/Sub broadcast (score updates → frontend polls or SSE reads) ──
export async function publishScoreUpdate(
  sessionId: string,
  payload: { entryId: string; userId: string; name: string; totalScore: number; rank: number }
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.publish(`quiz:scores:${sessionId}`, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch { /* non-fatal */ }
}

// ── Convenience: build + write session cache from raw DB objects ──
export type BuildArgs = {
  session:    { id: string; status: string; title: string | null; startedAt: Date | null; endedAt: Date | null; episodeId: string | null };
  collection: { id: string; userId: string; publicLinkCode: string; name: string };
  playerCount: number;
  prizePool:   number;
  entryFee:    number;
  players:     { id: string; userId: string; name: string }[];
};

export async function buildAndCacheSession(args: BuildArgs): Promise<CachedSession> {
  const data: CachedSession = {
    sessionId:       args.session.id,
    collectionId:    args.collection.id,
    collectionUserId:args.collection.userId,
    publicLinkCode:  args.collection.publicLinkCode,
    title:           args.session.title ?? args.collection.name,
    status:          args.session.status,
    playerCount:     args.playerCount,
    prizePool:       args.prizePool,
    entryFee:        args.entryFee,
    episodeId:       args.session.episodeId,
    startedAt:       args.session.startedAt?.toISOString() ?? null,
    endedAt:         args.session.endedAt?.toISOString()   ?? null,
    players:         args.players,
  };
  await setCachedSession(args.collection.publicLinkCode, data);
  return data;
}
